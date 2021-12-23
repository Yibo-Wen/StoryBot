const express = require('express');
const dialogueController = require('../controllers/dialogueController');
const messageRouter = require('../messageRouter');
const customerStore = require('../customerStore');

// Load process.env
require('dotenv').config();

// Load and instantiate the Dialogflow client library
const { SessionsClient } = require('dialogflow');
const dialogflowClient = new SessionsClient({
  keyFilename: process.env.DF_SERVICE_ACCOUNT_PATH
})

const store = new customerStore();
const router = new messageRouter({
    customerStore: customerStore,
    dialogflowClient: dialogflowClient,
    projectId: process.env.DF_PROJECT_ID
  });
const controller = new dialogueController(store,router);

const router = express.Router();

router.route('/').get();

router.route('/new').get(controller.createDialogue);

router.route('/:id').patch(controller.getResponse);

router.route('/location/:id').post(controller.saveLocation);

module.exports = router;