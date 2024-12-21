const User = require('../models/user.model');
const config = require('config');
const axios = require('axios');
const crypto = require('crypto');
const BinanceSetting = require('../models/binance_setting');
const BinanceApi = require('../controllers/binance/binance.api');

const API_KEY = '6ba1083bc2d015d0480b9f64f327394911b0dac2260db0e028d9d543d5d7f308';
const API_SECRET = 'd1d82dc7ba5cf74100837441bca388c392bbb416e00c6721a94229080cc4d2db';

function createSignature(queryString, secretKey) {
    return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
}

// const getApiKey = async (userId) => {
//     return await BinanceSetting.
// };

const fetchFundingFeeByPeriod = async (req, res) => {
    try {
        //get Users Api Keys
        const binKeys = await BinanceSetting.findApiKeyByUserId(req.userId);
        //get Server Time

        const startTime = req.body.startTime;
        const endTime = req.body.endTime;

        if (startTime == undefined || startTime == null || endTime == null || endTime == undefined) {
            return res.status(400).send({
                statusCode: 400,
                statusMessage: 'Internal Server Error while fetching Funding Fee',
                message: err.message,
                data: null,
            });
        }
        console.log('about to make req');

        //fetchFunding Fee By Period
        const fundingFee = await BinanceApi.fetchFundingFeeByPeriod(
            binKeys.api_key,
            binKeys.secret_key,
            startTime,
            endTime
        );

        res.send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully retrieved the Funding Fee',
            data: {
                fundingFee,
            },
        });
    } catch (err) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error while fetching Funding Fee',
            message: err.message,
            data: null,
        });
    }
};

const fetchTransactionByPeriod = async (req, res) => {
    try {
        //get Users Api Keys
        const binKeys = await BinanceSetting.findApiKeyByUserId(req.userId);
        //get Server Time

        const startTime = req.body.startTime;
        const endTime = req.body.endTime;

        if (startTime == undefined || startTime == null || endTime == null || endTime == undefined) {
            return res.status(400).send({
                statusCode: 400,
                statusMessage: 'Internal Server Error while fetching Transaction History',
                message: err.message,
                data: null,
            });
        }

        //fetch Transaction History By Period
        const transactionHistory = await BinanceApi.fetchTransactionByPeriod(
            binKeys.api_key,
            binKeys.secret_key,
            startTime,
            endTime
        );

        res.send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully retrieved the Transaction History',
            data: {
                transactionHistory,
            },
        });
    } catch (err) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error while fetching Transaction History',
            message: err.message,
            data: null,
        });
    }
};

const fetchBalance = async (req, res) => {
    try {
        //get Users Api Keys
        const binKeys = await BinanceSetting.findApiKeyByUserId(req.userId);
        //get Server Time
        // const timestamp = await BinanceApi.getBinanceServerTime();

        //fetchBalance
        const balance = await BinanceApi.fetchAccountBalance(binKeys.api_key, binKeys.secret_key);
           
            
        //fetchIncome
        const income = await BinanceApi.fetchIncome(binKeys.api_key, binKeys.secret_key);

        //fetchIncomeByRange
        const incomeByRange = await BinanceApi.fetchIncomeByRange(binKeys.api_key, binKeys.secret_key);

        //fetchPositionRisk
        const position = await BinanceApi.fetchPositionRisk(binKeys.api_key, binKeys.secret_key);

        //fetchOpenOrders
        const openOrders = await BinanceApi.fetchOpenOrders(binKeys.api_key, binKeys.secret_key);

        //fetchOrders
        const allOrders = await BinanceApi.fetchOrders(binKeys.api_key, binKeys.secret_key);

        //fetchFundingFee
        const fundingFee = await BinanceApi.fetchFundingFee(binKeys.api_key, binKeys.secret_key);

        //fetchTradeHistory
        const tradeHistory = await BinanceApi.fetchTradeHistory(binKeys.api_key, binKeys.secret_key);

        //fetchTransactionHistory
        const transactionHistory = await BinanceApi.fetchTransactionHistory(
            binKeys.api_key,
            binKeys.secret_key,
        );

        res.send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully retrieved the binance account balance.',
            data: {
                balance,
                income,
                incomeByRange,
                position,
                openOrders,
                allOrders,
                transactionHistory,
                fundingFee,
                tradeHistory,
            },
        });
    } catch (err) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error while fetching balance',
            message: err.message,
            data: null,
        });
    }
};

const buyOrders = async (req, res) => {
    const buyingData = req.body.data;
    try {
        const binKeys = await BinanceSetting.findApiKeyByUserId(req.userId);

        const response = await BinanceApi.buyOrders(
            binKeys.api_key,
            binKeys.secret_key,
            buyingData.coinName,
            buyingData.pairCurrency,
            buyingData.orderAmount,
            buyingData.leverage,
            buyingData.side,
            buyingData.takeProfitPercent
        );
        
        return res.send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully placed the order.',
            data: {
                response,
            },
        });
    } catch (error) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Serverd Error while buying orders',
            message: err.message,
            data: null,
        });
    }
};

const updateCreds = async (req, res) => {
    const userId = req.userId;
    const newApiKey = req.body.api_key;
    const newSecretKey = req.body.secret_key;
    const newIpAddArr = req.body.ip_addresses;

    try {
        const BinanceInstance = await BinanceSetting.findByUserId(userId);
        if (!BinanceInstance) {
            return res.status(404).send({ statusCode: 404, statusMessage: 'Not Found', data: null });
        }

        BinanceInstance.apiKey = newApiKey;
        BinanceInstance.secretKey = newSecretKey;
        BinanceInstance.ipAddresses = newIpAddArr;
        BinanceInstance.updatedAt = new Date();

        const updatedCred = await BinanceInstance.update();

        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully updated the binance account credentials.',
            data: {
                api_key: updatedCred?.api_key || null,
                secret_key: updatedCred?.secret_key || null,
                ip_addresses: updatedCred?.ip_addresses || [],
            },
        });
    } catch (error) {
        console.error('Error updating credentials:', error.message);
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Update was cancelled',
            message: error.message,
        });
    }
};

const getCreds = async (req, res) => {
    try {
        const BinanceInstance = await BinanceSetting.findByUserId(req.userId);

        if (!BinanceInstance) {
            return res.status(404).send({ statusCode: 404, statusMessage: 'Not Found', data: null });
        }

        const decrypted = await BinanceInstance.getByUserId(req.userId);

        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully fetched the binance account credentials.',
            data: {
                api_key: decrypted?.api_key || null,
                secret_key: decrypted?.secret_key || null,
                ip_addresses: decrypted?.ip_addresses || [],
            },
        });
    } catch (error) {
        console.error('Error getting credentials:', error.message);
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Getting credentials was denied',
            message: error.message,
        });
    }
};

module.exports = {
    fetchBalance,
    updateCreds,
    getCreds,
    buyOrders,
    fetchFundingFeeByPeriod,
    fetchTransactionByPeriod,
};
