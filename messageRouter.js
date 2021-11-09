const AppConstants = require('./appConstants.js');
const CustomerStore = require('./customerStore.js');
const CustomerConnectionHandler = require('./customerConnectionHandler.js');
const OperatorConnectionHandler = require('./operatorConnectionHandler.js');

// Routes messages between connected customers, operators and Dialogflow agent
class MessageRouter {
  constructor ({ customerStore, dialogflowClient, projectId, customerRoom, operatorRoom }) {
    // Dialogflow client instance
    this.client = dialogflowClient;
    // Dialogflow project id
    this.projectId = projectId;
    // An object that handles customer data persistence
    this.customerStore = customerStore;
    // Socket.io rooms for customers and operators
    this.customerRoom = customerRoom;
    this.operatorRoom = operatorRoom;
    // All active connections to customers or operators
    this.customerConnections = {};
    this.operatorConnections = {};
  }

  // Attach event handlers and begin handling connections
  handleConnections () {
    this.customerRoom.on('connection', this._handleCustomerConnection.bind(this));
    this.operatorRoom.on('connection', this._handleOperatorConnection.bind(this));
  }

  // Creates an object that stores a customer connection and has
  // the ability to delete itself when the customer disconnects
  _handleCustomerConnection (socket) {
    const onDisconnect = () => {
      delete this.customerConnections[socket.id];
    };
    this.customerConnections[socket.id] = new CustomerConnectionHandler(socket, this, onDisconnect);
  }

  // Same as above, but for operator connections
  _handleOperatorConnection (socket) {
    const onDisconnect = () => {
      delete this.customerConnections[socket.id];
    };
    this.operatorConnections[socket.id] = new OperatorConnectionHandler(socket, this, onDisconnect);
  }

  // Notifies all operators of a customer's connection changing
  _sendConnectionStatusToOperator (customerId, disconnected) {
    console.log('Sending customer id to any operators');
    const status = disconnected
      ? AppConstants.EVENT_CUSTOMER_DISCONNECTED
      : AppConstants.EVENT_CUSTOMER_CONNECTED;
    this.operatorRoom.emit(status, customerId);
    // We're using Socket.io for our chat, which provides a synchronous API. However, in case
    // you want to swich it out for an async call, this method returns a promise.
    return Promise.resolve();
  }

  // Given details of a customer and their text, decide what to do.
  _routeCustomer (text, customer, customerId) {
    // If this is the first time we've seen this customer,
    // we should trigger the default welcome intent.
    if (customer.isNew) {
      return this._sendEventToAgent(customer, text, 'WELCOME');
    }

    return this._sendTextToOperator(text, customer)
      .then(()=>{
        if(customer.story===CustomerStore.BEFORE_STORY){
          console.log('BEFORE_STORY');
          return this._sendTextToAgent(customer, text);
        }
        else if(customer.story===CustomerStore.DURING_STORY){
          console.log('DURING_STORY');
          return this._sendEventToAgent(customer, text, customer.events[0]);
          //return this._sendTextToAgent(customer, text);
        }
        else{
          console.log('DONE');
          return this._sendTextToAgent(customer, 'Done');
        }
      })
      .then(responses => {
        // get response from Dialogflow
        const response = responses[0];
        const reply = response.queryResult.fulfillmentText;
        const detectedIntent = response.queryResult.intent.displayName;
        if(detectedIntent==='Start Story'){
          customer.story = CustomerStore.DURING_STORY;
          this.customerStore.setCustomer(customerId, customer);
        }
        else if(detectedIntent==='Done'){
          customer.story = CustomerStore.AFTER_STORY;
          this.customerStore.setCustomer(customerId, customer);
        }
        this._sendTextToOperator(reply, customer, true);
        const speech = response.queryResult.fulfillmentText;
        return speech;
      })

    // Since all customer messages should show up in the operator chat,
    // we now send this text to all operators
    return this._sendTextToOperator(text, customer)
      .then(() => {
        // So all of our logs end up in Dialogflow (for use in training and history),
        // we'll always send the text to the agent - even if the customer is in operator mode.
        return this._sendTextToAgent(customer, text);
      })
      .then(responses => {
        // get response from Dialogflow
        const response = responses[0];
        // If the customer is in agent mode, we'll forward the agent's response to the customer.
        // If not, just discard the agent's response.
        if (customer.mode === CustomerStore.MODE_AGENT) {
          // If the agent indicated that the customer should be switched to operator
          // mode, do so
          if (this._checkOperatorMode(response)) {
            return this._switchToOperator(customerId, customer, response);
          }
          // If not in operator mode, just grab the agent's response
          const speech = response.queryResult.fulfillmentText;
          // Send the agent's response to the operator so they see both sides
          // of the conversation.
          this._sendTextToOperator(speech, customer, true);
          // Return the agent's response so it can be sent to the customer down the chain
          return speech;
        }
      });
  }

  // Uses the Dialogflow client to send a event to the agent
  _sendEventToAgent (customer, input, eventName) {
    console.log(`Sending ${eventName} event to agent`);
    return this.client.detectIntent({
      // Use the customer ID as Dialogflow's session ID
      session: this.client.sessionPath(this.projectId, customer.id),
      queryInput: {
        text:{
          text: input,
          languageCode: 'en'
        },
        event: {
          name: eventName,
          languageCode: 'en'
        }
      }
    });
  }

  // Sends text to Dialogflow and returns a promise with API response.
  _sendTextToAgent (customer, text) {
    console.log('Sending text to agent');
    return this.client.detectIntent({
      // Use the customer ID as Dialogflow's session ID
      session: this.client.sessionPath(this.projectId, customer.id),
      queryInput: {
        text: {
          text: text,
          languageCode: 'en'
        }
      }
    });
  }

  // Send an text, or an array of texts, to the operator channel so that
  // every operator receives it.
  _sendTextToOperator (text, customer, isAgentResponse) {
    console.log('Sending text to any operators');
    if (Array.isArray(text)) {
      text.forEach(message => {
        this.operatorRoom.emit(AppConstants.EVENT_CUSTOMER_MESSAGE,
          this._operatorMessageObject(customer.id, message, isAgentResponse));
      });
    } else {
      this.operatorRoom.emit(AppConstants.EVENT_CUSTOMER_MESSAGE,
        this._operatorMessageObject(customer.id, text, isAgentResponse));
    }
    // We're using Socket.io for our chat, which provides a synchronous API. However, in case
    // you want to swich it out for an async call, this method returns a promise.
    return Promise.resolve();
  }

  // If one operator sends a message to a customer, share it with all connected operators
  _relayOperatorMessage (message) {
    this.operatorRoom.emit(AppConstants.EVENT_OPERATOR_MESSAGE, message);
    // We're using Socket.io for our chat, which provides a synchronous API. However, in case
    // you want to swich it out for an async call, this method returns a promise.
    return Promise.resolve();
  }

  // Factory method to create message objects in the format expected by the operator client
  _operatorMessageObject (customerId, text, isAgentResponse) {
    return {
      customerId: customerId,
      text: text,
      isAgentResponse: isAgentResponse || false
    };
  }

  // Check if event is completed
  _isEventCompleted (customer) {
    if(customer.events.length == 0){
      console.log('All events completed');
      return true;
    }
    else return false;
  }

  // Continue to the next event and return the Response from Dialogflow
  _getNextEvent (customerId, customer){
    console.log('Call the next event');
    const event = customer.events[0];
    if (customer.events.length==0) {
      console.log("All events have finished");
      return Promise.reject(new Error('All events have finished'));
    }
    console.log(`Starting event ${event}`);

    // Remove event from current customer
    customer.events.shift();
    return this.customerStore
      .setCustomer(customerId, customer)
      .then(() => {
        return this._sendEventToAgent(customer,event);
      });
  }

  // Examines the context from the Dialogflow response and returns a boolean
  // indicating whether the agent placed the customer in operator mode
  _checkOperatorMode (apiResponse) {
    let contexts = apiResponse.queryResult.outputContexts;
    let operatorMode = false;
    for (const context of contexts) {
      // The context name is returned as a long string, including the project ID, separated
      // by / characters. To get the context name defined in Dialogflow, we should take the
      // final portion.
      const parts = context.name.split('/');
      const name = parts[parts.length - 1];
      if (name === AppConstants.CONTEXT_OPERATOR_REQUEST) {
        operatorMode = true;
        break;
      }
    }
    return operatorMode;
  }

  // Place the customer in operator mode by updating the stored customer data,
  // and generate an introductory "human" response to send to the user.
  _switchToOperator (customerId, customer, response) {
    console.log('Switching customer to operator mode');
    customer.mode = CustomerStore.MODE_OPERATOR;
    return this.customerStore
      .setCustomer(customerId, customer)
      .then(this._notifyOperatorOfSwitch(customerId, customer))
      .then(() => {
        // We return an array of two responses: the last text from the Dialogflow agent,
        // and a mock "human" response introducing the operator.
        const output = [ response.queryResult.fulfillmentText, AppConstants.OPERATOR_GREETING ];
        // Also send everything to the operator so they can see how the agent responded
        this._sendtextToOperator(output, customer, true);
        return output;
      });
  }

  // Inform the operator channel that a customer has been switched to operator mode
  _notifyOperatorOfSwitch (customerId) {
    this.operatorRoom.emit(AppConstants.EVENT_OPERATOR_REQUESTED, customerId);
    // We're using Socket.io for our chat, which provides a synchronous API. However, in case
    // you want to swich it out for an async call, this method returns a promise.
    return Promise.resolve();
  }
}

module.exports = MessageRouter;
