const express = require('express');
const DialogueController = require('../controllers/dialogueController');
const MessageRouter = require('../messageRouter');
const CustomerStore = require('../customerStore');

// Load process.env
require('dotenv').config();

// Load and instantiate the Dialogflow client library
const { SessionsClient } = require('dialogflow');
const dialogflowClient = new SessionsClient({
  keyFilename: process.env.DF_SERVICE_ACCOUNT_PATH
})

const store = new CustomerStore();
const messageRouter = new MessageRouter({
    customerStore: store,
    dialogflowClient: dialogflowClient,
    projectId: process.env.DF_PROJECT_ID
  });
const controller = new DialogueController({
    customerStore: store,
    messageRouter: messageRouter
});

const router = express.Router();

router.route('/').get();

router.route('/new').get(controller.createDialogue);

router.route('/:id').patch(controller.getResponse);

router.route('/location/:id').post(controller.saveLocation);

module.exports = router;