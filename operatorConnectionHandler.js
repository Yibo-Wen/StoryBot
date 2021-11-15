const AppConstants = require('./appConstants.js');
const CustomerStore = require('./customerStore.js');
const ChatConnectionHandler = require('./chatConnectionHandler.js');

// Custom error type for a problem relating to the customer's mode
class CustomerModeError extends Error {
  constructor (message) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Handles the connection to an individual operator
class OperatorConnectionHandler extends ChatConnectionHandler {
  constructor (socket, messageRouter, onDisconnect) {
    super(socket, messageRouter, onDisconnect);
    this.init(socket.id);
    this.attachHandlers();
  }

  init (operatorId) {
    console.log('An operator joined: ', this.socket.id);
  }

  attachHandlers () {
    this.socket.on(AppConstants.EVENT_OPERATOR_MESSAGE, (message) => {
      console.log('Received operator message:', message);
      this._gotOperatorInput(message);
    });
    this.socket.on(AppConstants.EVENT_DISCONNECT, () => {
      console.log('operator disconnected');
      this.onDisconnect();
    });
  }

  // Called on receipt of input from the operator
  _gotOperatorInput (message) {
    // Operator messages take the form of an object with customerId and text properties
    const { customerId, text } = message;
    console.log('Got operator input: ', message);
    // Look up the customer referenced in the operator's message
    this.router.customerStore
      .getOrCreateCustomer(customerId)
      .then(customer => {
        // Check if we're in agent or human mode
        // If in agent mode, ignore the input
        console.log('Got customer: ', JSON.stringify(customer));
        if (customer.mode === CustomerStore.MODE_AGENT) {
          return Promise.reject(
            new CustomerModeError('Cannot respond to customer until they have been escalated.')
          );
        }
        // Otherwise, relay it to all operators
        return this.router._relayOperatorMessage(message)
          // And send it to the appropriate customer
          .then(() => {
            const customerConnection = this.router.customerConnections[customerId];
            return customerConnection._respondToCustomer(text);
          });
      })
      .catch(error => {
        console.log('Error handling operator input: ', error);
        return this._sendErrorToOperator(error);
      });
  }

  _sendErrorToOperator (error) {
    console.log('Sending error to operator');
    this.socket.emit(AppConstants.EVENT_SYSTEM_ERROR, {
      type: error.name,
      message: error.message
    });
  }
}

module.exports = OperatorConnectionHandler;
