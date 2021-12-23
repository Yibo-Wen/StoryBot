// Load and instantiate the Dialogflow client library
const { SessionsClient } = require('dialogflow');
const db = require('../firebaseConfig');
const firestore = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');

class DialogueController {
  constructor ({customerStore,messageRouter}) {
    this.store = customerStore;
    this.router = messageRouter;
  }
  saveLocation = async (req,res,next)=>{
    try{
      if(!req.body.latitude || !req.body.longitude || !req.body.activity){
        throw new Error("Invalid Request Body Params");
      }
      const activity = req.body.activity;
      const loc = new firestore.GeoPoint(req.body.latitude,req.body.longitude);
      const docRef = db.collection('users').doc(req.params.id);

      const doc = await docRef.get();
      if (!doc.exists) {
        console.log('No such document!');
        //creating a document with the given user
        const result = await docRef.set({
          [activity] : loc
        })
        console.log('Adding new user with location to firestore...');
      } else {
        console.log('Found document');
        // updating the document
        const result = await docRef.update({
          [activity] : loc
      });
      }
      res.status(200).json({
        status:"success"
      })
    } catch(err) {
      next(err);
    }
  }
  
  createDialogue = async (req,res,next)=>{
    const customerId = uuidv4();
    console.log('New Customer: ', customerId);
    const responses = await this.store.getOrCreateCustomer(customerId)
      .then(customer => {
        // If new, begin the Dialogflow conversation
        if (customer.isNew) {
          console.log('Chang isNew to false');
          customer.isNew = false;
          return this.router._sendEventToAgent(customer, null,'WELCOME')
            .catch(err => next(err));
        }
      })
      .catch(err => next(err));
    
      res.status(200).json({
        status: 'success',
        data: {
            id: customerId,
            response: responses[0].queryResult.fulfillmentText,
        },
      });
      
  }

  getResponse = async (req,res,next)=>{

    if(!req.body.text){
        console.error('Empty text to agent');
    }
    console.log('Continue Customer: ', req.params.id);

    const response = await this.store.getOrCreateCustomer(customerId)
      .then(customer => {
        // If new, throw error
        if (customer.isNew) {
          console.error('Invalid Customer');
          throw new Error('New Customer, please start conversation first');
        }
        return this.router._routeCustomer(req.body.text,customer,req.params.id);
      })
      .catch(err => next(err));
    
      res.status(200).json({
        status: 'success',
        data: {
            response: response,
        },
      });

  }
}

module.exports = DialogueController;