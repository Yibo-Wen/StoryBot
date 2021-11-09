const express = require('express');
const dialogueController = require('../controllers/dialogueController');

const router = express.Router();

router.route('/').get();

router.route('/new').post();

router.route('/:id').patch(dialogueController.getResponse);

module.exports = router;