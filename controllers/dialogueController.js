// Load and instantiate the Dialogflow client library
const { SessionsClient } = require('dialogflow');
const keyPath = process.env.DF_SERVICE_ACCOUNT_PATH;
const projectId = process.env.DF_PROJECT_ID;
const db = require('../firebaseConfig');
const firestore = require('firebase-admin/firestore');

const { v4: uuidv4 } = require('uuid');

exports.saveLocation = async (req,res,next)=>{
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

exports.createDialogue = (req,res,next)=>{
    const costumerId = uuidv4();
    res.status(200).json({
        status: 'success',
        data: {
            costumerId,
        },
    });
}

exports.getResponse = async (req,res,next)=>{
    if(!req.body.text){
        console.error('Empty text to agent');
    }

    const dialogflowClient = new SessionsClient({
        keyFilename: process.env.DF_SERVICE_ACCOUNT_PATH
      })
    
    const response =  await dialogflowClient.detectIntent({
      // Use the customer ID as Dialogflow's session ID
      session: dialogflowClient.sessionPath(process.env.DF_PROJECT_ID, req.params.id),
      queryInput: {
        text: {
          text: req.body.text,
          languageCode: 'en'
        }
      }
    });
    const result = response[0].queryResult.fulfillmentText;

    res.status(200).json({
        status: 'success',
        data: {
            result,
        },
    });
}