// Load and instantiate the Dialogflow client library
const { SessionsClient } = require('dialogflow');
const keyPath = process.env.DF_SERVICE_ACCOUNT_PATH;
const projectId = process.env.DF_PROJECT_ID;

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