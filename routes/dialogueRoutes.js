const express = require('express');
const dialogueController = require('../controllers/dialogueController');

const router = express.Router();

router.route('/').get();

router.route('/new').get(dialogueController.createDialogue);

router.route('/:id').patch(dialogueController.getResponse);

router.route('/location/:id').post(dialogueController.saveLocation);

module.exports = router;