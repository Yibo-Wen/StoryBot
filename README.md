# StoryBot Backend
Conversational agent built with Dialogflow, Node.js and Firebase to explore narrative forms for describing changes to urban environments. Provid backend APIs for users to engage with a Dialogflow chatbot to to imagine a day living in the future urban area, and collect useful location data.

##  Table of Contents
- [StoryBot Backend](#storybot-backend)
	- [Table of Contents](#table-of-contents)
	- [Basics](#basics)
	- [Configuration](#configuration)
	- [Endpoints](#endpoints)
		- [Start Dialogue](#start-dialogue)
		- [Get Response](#get-response)
		- [Save Location](#save-location)
	- [Local Hosting:](#local-hosting)
	- [Deployment:](#deployment)
	- [References:](#references)

## Basics
The backend is written using the Node.js [Express](https://expressjs.com/) framework. It utilizes the Firebase database [Firestore](https://firebase.google.com/docs/firestore) for storage of data. The chatbot is developed using [Dialogflow](https://cloud.google.com/dialogflow). 

## Configuration
To configure the server, there are several environment variables that the application looks for on startup inside `.env` file.

`PORT` - The port for the server to listen on.   
`DF_SERVICE_ACCOUNT_PATH` - The path of Dialogflow service account key, usually put under the resource folder with the name `serviceAccountKey.json`. Please download the file from Dialogflow console.   
`DF_PROJECT_ID` - The project id of Dialogflow. (Please refer to the Dialogflow console of the project)

## Endpoints

### Start Dialogue

**GET `/api/dialogue/new`**

Request to start a new dialogue session, no user input required

Example response body:
```json
{
    "status": "success",
    "data": {
        "id": "bc12634e-f0ba-42fd-b1e3-fc982f4f79cf",
        "response": "Hi! I'm a StoryBot designed for telling stories about urban planning. Can you tell me your name?"
    }
}
```

### Get Response
**PATCH `/api/dialogue/:id`**

Request to get response from a continuing dialogue session

Example request body:
```json
{
	"text": "My name is Yibo."
}
```

Example response body:
```json
{
	"status": "success",
	"data": {
		"response": "Great, Yibo. Please imagine a perfect day living in a future urban area. Why not start with a recreational activity that you want to do the most?",
		"param": [
			{
				"key": "person",
				"value": "Yibo"
			}
		]
	}
}
```

Example request body:
```json
{
	"text": "I love cooking."
}
```

Example response body:
```json
{
	"status": "success",
	"data": {
		"response": "Great! Let's go on to food! Which restaurant would you go?",
		"param": [
			{
				"key": "indoor_activity",
				"value": [
					"bake"
				]
			},
			{
				"key": "outdoor_activity",
				"value": [
					"tennis"
				]
			}
		]
	}
}
```

### Save Location
**POST `/api/dialogue/location/:id`**

Request to save a location pointed by user

Example request body:
```json
{
	"latitude": 34.0689,
	"longitude": -118.4452,
	"activity": "burning Bruins"
}
```

Example response body:
```json
{
	"status": "success"
}
```

## Local Hosting:
1. Run `npm install` in terminal
2. Configure `.env` file and download `serviceAccountKey.json` file from Dialogflow Console
3. Run `node app.js` in terminal

## Deployment:
Hosting on Heroku

## References:
https://github.com/dialogflow/agent-human-handoff-nodejs
