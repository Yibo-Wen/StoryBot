const AppConstants = require('./appConstants.js');
const CustomerStore = require('./customerStore.js');
const CustomerConnectionHandler = require('./customerConnectionHandler.js');

// Routes messages between connected customers and Dialogflow agent
class MessageRouter {
  constructor ({ customerStore, dialogflowClient, projectId }) {
    // Dialogflow client instance
    this.client = dialogflowClient;
    // Dialogflow project id
    this.projectId = projectId;
    // An object that handles customer data persistence
    this.customerStore = customerStore;
    // All active connections to customers
    this.customerConnections = {};
  }

  // Attach event handlers and begin handling connections
  handleConnections () {
    //this.customerRoom.on('connection', this._handleCustomerConnection.bind(this));
  }

  // Creates an object that stores a customer connection and has
  // the ability to delete itself when the customer disconnects
  _handleCustomerConnection (socket) {
    const onDisconnect = () => {
      delete this.customerConnections[socket.id];
    };
    this.customerConnections[socket.id] = new CustomerConnectionHandler(socket, this, onDisconnect);
  }

  // Given details of a customer and their text, decide what to do.
  _routeCustomer (text, customer, customerId) {
    // If this is the first time we've seen this customer,
    // we should trigger the default welcome intent.
    if (customer.isNew) {
      return this._sendEventToAgent(customer, text, 'WELCOME');
    }

    let output = {};

    return this._decideCustomerAction(text, customer)
      .then(responses => {
        // get response from Dialogflow
        const response = responses[0];
        console.log(response);
        const reply = response.queryResult.fulfillmentText;
        const detectedIntent = response.queryResult.intent.displayName;
        const param = this._parseParameters(response.queryResult.parameters.fields);
        output = {reply,param};

        if(detectedIntent === 'Default Fallback Intent'){
          console.log('Could not understand, try again');
        }
        else if(detectedIntent==='Default Welcome Intent' || detectedIntent==='Start Story'){
          customer.story = CustomerStore.NEXT_STORY;
          //this.customerStore.setCustomer(customerId, customer);
        }
        else if(detectedIntent==='Done'){
          customer.story = CustomerStore.AFTER_STORY;
          //this.customerStore.setCustomer(customerId, customer);
        }
        // All required parameters are present, move on to the next event
        else if (response.queryResult.allRequiredParamsPresent){
          console.log('Go to next story');
          customer.story = CustomerStore.NEXT_STORY;
          this._toNextEvent (customerId, customer)
            .catch(err => {
              console.log('conversation completed, wrapping up');
              customer.story = CustomerStore.AFTER_STORY;
              //this.customerStore.setCustomer(customerId, customer);
            });
        }
        else {
          console.log('Continue story');
          customer.story = CustomerStore.CONTINUE_STORY;
        }
        return this.customerStore.setCustomer(customerId, customer).then(()=> {return output;});
      })
      .catch(err => {
        throw new Error(err);
      })
  }

  // Decide customer action and returns agent response
  _decideCustomerAction (text, customer) {
    if(customer.story===CustomerStore.BEFORE_STORY){
      console.log('BEFORE_STORY');
      return this._sendTextToAgent(customer, text);
    }
    else if(customer.story===CustomerStore.NEXT_STORY){
      console.log('NEXT_STORY: sending event',customer.events[0]);
      this._sendEventToAgent(customer, customer.events[0]);
      return this._sendTextToAgent(customer, text);
    }
    else if(customer.story===CustomerStore.CONTINUE_STORY){
      console.log('CONTINUE_STORY');
      return this._sendTextToAgent(customer, text);
    }
    else{
      console.log('DONE');
      return this._sendTextToAgent(customer, 'Done');
    }
  }

  // Uses the Dialogflow client to send a event to the agent
  _sendEventToAgent (customer, eventName) {
    console.log(`Sending ${eventName} event to agent`);
    return this.client.detectIntent({
      // Use the customer ID as Dialogflow's session ID
      session: this.client.sessionPath(this.projectId, customer.id),
      queryInput: {
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

  // Check if event is completed
  _isEventCompleted (customer) {
    if(customer.events.length == 0){
      console.log('All events completed');
      return true;
    }
    else return false;
  }

  // Continue to the next event and return the Response from Dialogflow
  _toNextEvent (customerId, customer){
    console.log('Call the next event');
    const event = customer.events[0];
    if (customer.events.length==0) {
      console.log("All events have finished");
      return Promise.reject(new Error('All events have finished'));
    }
    console.log(`Starting event ${event}`);

    // Remove event from current customer
    customer.events.shift();
    return this.customerStore.setCustomer(customerId, customer);
  }

  // Parse parameters from agent
  _parseParameters (p) {
    let result = [];
    console.log(p);
    Object.keys(p).forEach(key => {
      if(p[key]['kind'] === 'listValue'){
        console.log(key + " -> " + p[key]['listValue']['values']);
        let lst = [];
        p[key]['listValue']['values'].forEach(a => {
          lst.push(Object.values(a)[0]);
        })
        if (p[key]['listValue']['values'].length) result.push({'key': key, 'value': lst});
      } else if (p[key]['kind'] === 'stringValue') {
        console.log(key + " -> " + p[key]['stringValue']);
        if (p[key]['stringValue']) result.push({'key': key, 'value': p[key]['stringValue']});
      } else {
        console.log(key + " -> " + p[key]['structValue']);
        if (p[key]['structValue']['fields']['name']) result.push({'key': key, 'value': p[key]['structValue']['fields']['name']['stringValue']});
      }
    })
    return result;
  }

}

module.exports = MessageRouter;
