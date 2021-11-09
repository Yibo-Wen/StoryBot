const express = require('express');
// const userController = require('../controllers/userController');

const router = express.Router();

router.route('/').get();

router.route('/new').post();

router.route('/:id').patch();