const AppConstants = require('./appConstants.js');
const ChatConnectionHandler = require('./chatConnectionHandler.js');
const { v4: uuidv4 } = require('uuid');

// Handles the connection to an individual customer
class CustomerConnectionHandler extends ChatConnectionHandler {
  constructor (socket, messageRouter, onDisconnect) {
    super(socket, messageRouter, onDisconnect);
    // In this sample, we use a uuid as a customer id.
    const customerId = uuidv4();
    this.init(customerId);
    this.attachHandlers(customerId);
  }

  init (customerId) {
    console.log('A customer joined: ', customerId);
    this.router.customerStore.getOrCreateCustomer(customerId)
      .then(customer => {
        console.log('A customer connected: ', customer);
        // If new, begin the Dialogflow conversation
        if (customer.isNew) {
          customer.isNew = false;
          return this.router._sendEventToAgent(customer, null,'WELCOME')
            .then(responses => {
              const response = responses[0];
              console.log('===Response Received===');
              console.log(response);
              this._respondToCustomer(response.queryResult.fulfillmentText, this.socket);
            });
        }
        // If known, do nothing - they just reconnected after a network interruption
      })
      .catch(error => {
        // Log this unspecified error to the console and
        // inform the customer there has been a problem
        console.log('Error after customer connection: ', error);
        this._sendErrorToCustomer(error);
      });
  }

  attachHandlers (id) {
    this.socket.on(AppConstants.EVENT_CUSTOMER_MESSAGE, (message) => {
      console.log('Received customer message: ', message);
      this._gotCustomerInput(message,id);
    });
    this.socket.on(AppConstants.EVENT_DISCONNECT, () => {
      console.log(`Customer ${id} disconnected`);
      this.onDisconnect();
    });
  }

  // Called on receipt of input from the customer
  _gotCustomerInput (text,id) {
    // Look up this customer
    this.router.customerStore
      .getOrCreateCustomer(id)
      .then(customer => {
        // Tell the router to perform any next steps
        return this.router._routeCustomer(text, customer, customer.id);
      })
      .then(response => {
        // Send any response back to the customer
        if (response) {
          return this._respondToCustomer(response, this.socket);
        }
      })
      .catch(error => {
        // Log this unspecified error to the console and
        // inform the customer there has been a problem
        console.log('Error after customer input: ', error);
        this._sendErrorToCustomer(error);
      });
  }

  // Send a message or an array of messages to the customer
  _respondToCustomer (response) {
    console.log('Sending response to customer:', response);
    if (Array.isArray(response)) {
      response.forEach(message => {
        this.socket.emit(AppConstants.EVENT_CUSTOMER_MESSAGE, message);
      });
      return;
    }
    this.socket.emit(AppConstants.EVENT_CUSTOMER_MESSAGE, response);
    // We're using Socket.io for our chat, which provides a synchronous API. However, in case
    // you want to swich it out for an async call, this method returns a promise.
    return Promise.resolve();
  }

  _sendErrorToCustomer () {
    // Immediately notifies customer of error
    console.log('Sending error to customer');
    this.socket.emit(AppConstants.EVENT_SYSTEM_ERROR, {
      type: 'Error',
      message: 'There was a problem.'
    });
  }
}

module.exports = CustomerConnectionHandler;
