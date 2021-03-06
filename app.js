// Load third party dependencies
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Load our custom classes
const CustomerStore = require('./customerStore.js');
const MessageRouter = require('./messageRouter.js');

// Load custom routers
const dialogueRouter = require('./routes/dialogueRoutes');

// Load process.env
require('dotenv').config();

// Grab the service account credentials path from an environment variable
const keyPath = process.env.DF_SERVICE_ACCOUNT_PATH;
if(!keyPath) {
  console.log('Specify a path to a service account keypair in environment variable DF_SERVICE_ACCOUNT_PATH.');
  process.exit(1);
}

// Load and instantiate the Dialogflow client library
const { SessionsClient } = require('dialogflow');
const dialogflowClient = new SessionsClient({
  keyFilename: keyPath
})

// Grab the Dialogflow project ID from an environment variable
const projectId = process.env.DF_PROJECT_ID;
if(!projectId) {
  console.log('Specify a project ID in the environment variable DF_PROJECT_ID.');
  process.exit(1);
}

// Instantiate our app
const customerStore = new CustomerStore();
const messageRouter = new MessageRouter({
  customerStore: customerStore,
  dialogflowClient: dialogflowClient,
  projectId: projectId,
  customerRoom: io.of('/customer')
});

// Serve static html files for the customer clients
app.get('/customer', (req, res) => {
  res.sendFile(`${__dirname}/static/customer.html`);
});

// Backend API for testing and direct accessing
app.use(express.json());
app.use('/api/dialogue', dialogueRouter);
app.use((err, req, res, next) => {
  res.status(500).send({ error: err.message });
});

// Begin responding to websocket and http requests
messageRouter.handleConnections();
http.listen(process.env.PORT, () => {
  console.log(`Listening on *:${process.env.PORT}`);
});
