const express = require('express');

const apiController = require('../controllers/auth.controller');
const { userValidate } = require('../middlewares/jwt_service');

const router = express.Router();

// Endpoint for getting all the records
router.get('/', apiController.getUsers);

// Endpoint for creating a new record
router.post('/register', apiController.register);
router.post('/login', apiController.login);
router.get('/access-token', userValidate, apiController.verifyToken);
router.post('/verify-otp', apiController.verifyOTP);
router.post('/request-otp', apiController.requestOTP);

module.exports = router;
