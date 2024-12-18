const express = require('express');

const binanceController = require('../controllers/binance.controller');
const { userValidate } = require('../middlewares/jwt_service');
const router = express.Router();

// // Endpoint for getting all the records
// router.get('/', userValidate, binanceController.fetchBalance);

// Endpoint for getting all the records
router.get('/balance', userValidate, binanceController.fetchBalance);

// Endpoint for updating a record
router.put('/', userValidate, binanceController.updateCreds);

// Endpoint for getting bin credentials
router.get('/', userValidate, binanceController.getCreds);

// Endpoint for making a order
router.post('/order', userValidate, binanceController.buyOrders);

// Endpoint for getting period wise funding history
router.post('/fundingFee', userValidate, binanceController.fetchFundingFeeByPeriod);

// Endpoint for getting period wise Transaction history
router.post('/transaction', userValidate, binanceController.fetchTransactionByPeriod);

module.exports = router;
