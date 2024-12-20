const axios = require('axios');
const crypto = require('crypto');

const binEndpoints = require('./binance.endpoints');

function createSignature(queryString, secretKey) {
    return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
}

// For live:
// const binanceFuturesAPI = 'https://fapi.binance.com';
// For Test:
const binanceFuturesAPI = 'https://testnet.binancefuture.com';

// Get Binance server time
const getBinanceServerTime = async () => {
    const response = await axios.get('https://api.binance.com/api/v3/time');
    return response.data.serverTime; // Binance server time in milliseconds
};

//Balance
const fetchAccountBalance = async (apiKey, secretKey, timestamp) => {
    
    try {
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);
        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchAccount}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                timestamp,
                signature,
            },
        });
        
        const accountInfo = response.data;
        // Filter the USDT balance, unrealized PNL, and margin balance
        const usdtAsset = accountInfo.assets.find((asset) => asset.asset === 'USDT');

        let data = null;
        if (usdtAsset) {
            const walletBalance = usdtAsset.walletBalance;
            const unrealizedPNL = usdtAsset.unrealizedProfit;
            const marginBalance = usdtAsset.marginBalance;
            data = {
                walletBalance,
                unrealizedPNL,
                marginBalance,
            };
        } else {
            console.log('USDT asset not found in account info.');
            data = null;
        }
        return data;
    } catch (error) {
        console.log('Error while fetching balance', error.response.data);
        return [];
    }
};

//Income
const fetchIncome = async (apiKey, secretKey, timestamp) => {
    
    try {
        const queryString = `timestamp=${timestamp}`;
        // const queryString = `timestamp=${timestamp}&startTime=${startTime}&endTime=${endTime}&incomeType=${incomeType}`;
        // const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);

        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchIncome}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                timestamp,
                signature,
            },
        });
    
   
        const incomeInfo = response.data;
      
        let data = null;
        if (incomeInfo != null && incomeInfo != undefined) {
            data = incomeInfo;
        } else {
            console.log('Income history not found.');
            data = [];
        }
        return data;
    } catch (error) {
        console.log('Error while fetching income', error.response.data);
        return [];
    }
};

//IncomeByRange
const fetchIncomeByRange = async (apiKey, secretKey, timestamp) => {
    const profitDataInfo = [
        { period: '1D', value: 0, percentage: 0, time: 0 },
        { period: '7D', value: 0, percentage: 0, time: 0 },
        { period: '14D', value: 0, percentage: 0, time: 0 },
        { period: '1M', value: 0, percentage: 0, time: 0 },
        { period: '3M', value: 0, percentage: 0, time: 0 },
        { period: '1Y', value: 0, percentage: 0, time: 0 },
        { period: 'ALL', value: 0, percentage: 0, time: 0 },
    ];
    const days = [1, 7, 14, 30, 90, 365];
    try {
        const requests = days.map(async (day, index) => {
            const incomeType = 'REALIZED_PNL';
            const endTime = Date.now();
            const startTime = endTime - day * 24 * 60 * 60 * 1000;
            const queryString = `timestamp=${timestamp}&startTime=${startTime}&endTime=${endTime}&incomeType=${incomeType}`;
            const signature = createSignature(queryString, secretKey);

            const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchIncome}`, {
                headers: {
                    'X-MBX-APIKEY': apiKey,
                },
                params: {
                    timestamp,
                    signature,
                    startTime,
                    endTime,
                    incomeType,
                },
            });
            profitDataInfo[index].time = parseFloat(startTime);
            if (response.data.length > 0) {
                profitDataInfo[index].value = parseFloat(response.data[0].income);
            } else {
                profitDataInfo[index].value = 0;
            }
        });

        await Promise.all(requests);
        // Fetch cumulative ALL profit:
        const newTimestamp = timestamp;
        const incomeType = 'REALIZED_PNL';
        const newSignature = createSignature(`timestamp=${newTimestamp}&incomeType=${incomeType}`, secretKey);
        const allProfitResponse = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchIncome}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                timestamp: newTimestamp,
                incomeType: incomeType,
                signature: newSignature,
            },
        });
        const totalProfit = allProfitResponse.data.reduce((sum, entry) => sum + parseFloat(entry.income), 0);
        profitDataInfo[6].value = totalProfit;

        // Calculate percentages
        profitDataInfo.forEach((item) => {
            item.percentage = Number(((item.value / totalProfit) * 100).toFixed(2));
        });

        // Return the updated profitDataInfo
        return profitDataInfo;
    } catch (error) {
        console.error(`Error fetching data for days:`, error.response.data);
    }
};

//PositionRisk
const fetchPositionRisk = async (apiKey, secretKey, timestamp) => {
    try {
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);

        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchPositionRisk}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                timestamp,
                signature,
            },
        });
        const position = response.data;

        let data = null;
        if (position != null && position != undefined) {
            data = position;
        } else {
            console.log('Position Info not found');
            data = [];
        }

        return data;
    } catch (error) {
        console.log('Error while fetching position', error.response.data); /////////
        return [];
    }
};

//fetchAllOpenOrders
const fetchOpenOrders = async (apiKey, secretKey, timestamp) => {
    try {
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);

        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchOpenOrders}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                timestamp,
                signature,
            },
        });
        const allOrders = response.data;

        let data = null;
        if (allOrders != null && allOrders != undefined) {
            data = allOrders;
        } else {
            console.log('Open orders Info not found');
            data = [];
        }
        // console.log('All Open Orders Info :', allOrders);

        return data;
    } catch (error) {
        console.log('Error while fetching Open Orders', error.response.data); ////////////////////
        return [];
    }
};

//fetchAllOrders
const fetchOrders = async (apiKey, secretKey, timestamp) => {
    try {
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);

        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchOrders}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                timestamp,
                signature,
            },
        });
        const allOrders = response.data;
        // console.log('All Orders Info :', response.data);
        let data = null;
        if (allOrders != null && allOrders != undefined) {
            data = allOrders;
        } else {
            console.log('Orders Info not found');
            data = [];
        }

        return data;
    } catch (error) {
        console.log('Error while fetching Orders', error.response.data); ////////////
        return [];
    }
};

//fetch Funding Fee By Period
const fetchFundingFeeByPeriod = async (apiKey, secretKey, timestamp, startTime, endTime) => {
    try {
        const incomeType = 'FUNDING_FEE';
        const queryString = `incomeType=${incomeType}&startTime=${startTime}&endTime=${endTime}&timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);

        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchIncome}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                incomeType,
                startTime,
                endTime,
                timestamp,
                signature,
            },
        });
        console.log('Periodic Funding Fee Info :');
        const fundingFee = response.data;
        let data = null;
        if (fundingFee != null && fundingFee != undefined) {
            data = fundingFee;
        } else {
            console.log('Funding Fee Info not found');
            data = [];
        }

        return data;
    } catch (error) {
        console.log('Error while fetching Funding Fee', error.response.data); ////////////
        return [];
    }
};

const fetchFundingFee = async (apiKey, secretKey, timestamp) => {
    try {
        const incomeType = 'FUNDING_FEE';
        const queryString = `incomeType=${incomeType}&timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);

        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchIncome}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                incomeType,
                timestamp,
                signature,
            },
        });
        const fundingFee = response.data;

        let data = null;
        if (fundingFee != null && fundingFee != undefined) {
            data = fundingFee;
        } else {
            console.log('Funding Fee Info not found');
            data = [];
        }

        return data;
    } catch (error) {
        console.log('Error while fetching Funding Fee', error.response.data);
        return [];
    }
};

//Funding Income Info
const fetchTransactionHistory = async (apiKey, secretKey, timestamp) => {
    try {
        const symbol = 'BTCUSDT';
        const incomeType = 'FUNDING_FEE';
        const queryString = `incomeType=${incomeType}&timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);

        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchIncome}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                incomeType,
                // symbol,
                timestamp,
                signature,
            },
        });
        const transactionHistory = response.data;

        let data = null;
        if (transactionHistory != null && transactionHistory != undefined) {
            data = transactionHistory;
        } else {
            console.log('Transaction history not found.');
            data = [];
        }
        return data;
    } catch (error) {
        console.log('Error while fetching Transaction history', error.response.data);
        return [];
    }
};

//fetch Transaction By Period
const fetchTransactionByPeriod = async (apiKey, secretKey, timestamp, startTime, endTime) => {
    try {
        const queryString = `startTime=${startTime}&endTime=${endTime}&timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);

        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchTransactionHistory}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                startTime,
                endTime,
                timestamp,
                signature,
            },
        });
        console.log('Periodic Transaction Info :');
        const transactionHistory = response.data;
        let data = null;
        if (transactionHistory != null && transactionHistory != undefined) {
            data = transactionHistory;
        } else {
            console.log('Transaction Info not found');
            data = [];
        }

        return data;
    } catch (error) {
        console.log('Error while fetching Transaction', error.response.data); ////////////
        return [];
    }
};

//Funding Income Info
const fetchTradeHistory = async (apiKey, secretKey, timestamp) => {
    try {
        const symbol = 'BTCUSDT';
        const incomeType = 'FUNDING_FEE';
        const queryString = `timestamp=${timestamp}`;
        const signature = createSignature(queryString, secretKey);

        const response = await axios.get(`${binanceFuturesAPI}${binEndpoints.fetchTrades}`, {
            headers: {
                'X-MBX-APIKEY': apiKey,
            },
            params: {
                timestamp,
                signature,
            },
        });
        const tradeHistory = response.data;

        let data = null;
        if (tradeHistory != null && tradeHistory != undefined) {
            data = tradeHistory;
        } else {
            console.log('Trade history not found.');
            data = [];
        }
        return data;
    } catch (error) {
        console.log('Error while fetching Trade history', error.response.data);
        return [];
    }
};

const placeOrder = async (timestamp, apiKey, secretKey, symbol, quantity, side, leverage, takeProfitPercent) => {
    try {
        // Step 1: Set leverage
        const leverageParams = {
            symbol,
            leverage,
            timestamp: timestamp,
        };
        const queryString = `symbol=${leverageParams.symbol}&leverage=${leverageParams.leverage}&timestamp=${leverageParams.timestamp}`;

        leverageParams.signature = createSignature(queryString, secretKey);
        console.log('url', `${binanceFuturesAPI}${binEndpoints.leverageOrders}`);
        const leverageResponse = await axios.post(
            `${binanceFuturesAPI}${binEndpoints.leverageOrders}`,
            {},
            {
                headers: { 'X-MBX-APIKEY': apiKey },
                params: leverageParams,
            }
        );
        console.log('Leverage set to', leverageResponse.data.leverage);

        // Step 2: Place Market Order
        const orderParams = {
            symbol,
            side, // BUY or SELL
            type: 'MARKET',
            quantity,
            timestamp: timestamp,
        };
        orderParams.signature = createSignature(orderParams, secretKey);

        const orderResponse = await axios.post(`${binanceFuturesAPI}${binEndpoints.buyOrders}`, null, {
            headers: { 'X-MBX-APIKEY': apiKey },
            params: orderParams,
        });

        console.log('Order placed:', orderResponse.data);

        // Step 3: Calculate Take Profit Price
        const entryPrice = parseFloat(orderResponse.data.avgFillPrice || orderResponse.data.fills[0].price);
        const takeProfitPrice = entryPrice * (1 + takeProfitPercent / 100);

        // Step 4: Place Take Profit Order
        const takeProfitParams = {
            symbol,
            side: side === 'BUY' ? 'SELL' : 'BUY', // Close the position
            type: 'TAKE_PROFIT_MARKET',
            stopPrice: takeProfitPrice.toFixed(2), // Ensure precision matches Binance rules
            closePosition: true,
            timestamp: timestamp,
        };
        takeProfitParams.signature = createSignature(takeProfitParams, secretKey);

        const takeProfitResponse = await axios.post(`${binanceFuturesAPI}${binEndpoints.buyOrders}`, null, {
            headers: { 'X-MBX-APIKEY': apiKey },
            params: takeProfitParams,
        });

        console.log('Take Profit set:', takeProfitResponse.data);
        return takeProfitResponse.data;
    } catch (error) {
        console.error('Error in placeOrder:', error.response?.data || error.message);
    }
};

const buyOrders = async (
    timestamp,
    apiKey,
    secretKey,
    coinName,
    pairCurrency,
    orderAmount,
    leverage,
    side,
    takeProfitPercent
) => {
    try {
        const symbol = `${coinName}${pairCurrency}`; // USDCUSDT
        console.log('symbol', symbol);
        const tickerResponse = await axios.get(`${binanceFuturesAPI}${binEndpoints.tickerOrders}`, {
            params: { symbol },
        });
        const currentPrice = parseFloat(tickerResponse.data.price);
        const quantity = (orderAmount / currentPrice).toFixed(3); // Match Binance minQty rules

        console.log(`Current price: ${currentPrice}, Quantity: ${quantity}`);
        await placeOrder(timestamp, apiKey, secretKey, symbol, quantity, side, leverage, takeProfitPercent);
    } catch (error) {
        console.error('Error fetching current price or placing order:', error.response?.data || error.message);
        throw new Error('Failed to fetch current price or place order');
    }
};

module.exports = {
    getBinanceServerTime,
    fetchAccountBalance,
    fetchIncome,
    fetchIncomeByRange,
    fetchPositionRisk,
    fetchOpenOrders,
    fetchOrders,
    buyOrders,
    fetchFundingFee,
    fetchTransactionHistory,
    fetchTradeHistory,
    fetchFundingFeeByPeriod,
    fetchTransactionByPeriod,
};
