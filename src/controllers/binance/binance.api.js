const axios = require('axios');
const crypto = require('crypto');

const binEndpoints = require('./binance.endpoints');
const { log } = require('console');

// Helper function to create the signature
const createSignature = (params, secretKey) => {
    const queryString = new URLSearchParams(params).toString(); // Correctly encode the query params
    return crypto
        .createHmac('sha256', secretKey)
        .update(queryString) // Sign the query string
        .digest('hex'); // Generate the signature
};
// For live:
// const binanceFuturesAPI = 'https://fapi.binance.com';
// For Test:
const binanceFuturesAPI = 'https://testnet.binancefuture.com';

// Get Binance server time
// const getBinanceServerTime = async () => {
//     const response = await axios.get('https://api.binance.com/api/v3/time');
//     return response.data.serverTime; // Binance server time in milliseconds
// };


const getBinanceServerTime = async () => {
    try {
       
        const response = await axios.get('https://testnet.binancefuture.com/fapi/v1/time');
        return response.data.serverTime; // Binance Futures Testnet server time in milliseconds
    } catch (error) {
        console.log('Error fetching server time:', error.response?.data || error.message);
        throw new Error('Failed to fetch Binance server time');
    }
};

//Balance
const fetchAccountBalance = async (apiKey, secretKey) => {
    
    try {
        const timestamp = await getBinanceServerTime();
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
const fetchIncome = async (apiKey, secretKey) => {
    
    try {
        const timestamp = await getBinanceServerTime();
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
const fetchIncomeByRange = async (apiKey, secretKey) => {
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
        const timestamp = await getBinanceServerTime();
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
        const newTimestamp = await getBinanceServerTime();
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

//Fetching All Income data by period(such as 1 day, 7 day, 1M, 3M, 1Y, dd to dd and so on)
const fetchAllProfitByPeriod = async (apiKey, secretKey, startTime, endTime) => {
    try {
        const timestamp = await getBinanceServerTime();
        const incomeType = 'REALIZED_PNL';
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
        const profit = response.data;
        let data = null;
        if (profit != null && profit != undefined) {
            data = profit;
        } else {
            console.log('Profit Statement Info not found');
            data = [];
        }

        return data;
    } catch (error) {
        console.log('Error while fetching Profit Statement', error.response.data);
        return [];
    }
};

//PositionRisk
const fetchPositionRisk = async (apiKey, secretKey) => {
    try {
        const timestamp = await getBinanceServerTime();
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
const fetchOpenOrders = async (apiKey, secretKey) => {
    try {
        const timestamp = await getBinanceServerTime();
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
const fetchOrders = async (apiKey, secretKey) => {
    try {
        const timestamp = await getBinanceServerTime();
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
const fetchFundingFeeByPeriod = async (apiKey, secretKey, startTime, endTime) => {
    try {
        const timestamp = await getBinanceServerTime();
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

const fetchFundingFee = async (apiKey, secretKey) => {
    try {
        const timestamp = await getBinanceServerTime();
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
const fetchTransactionHistory = async (apiKey, secretKey) => {
    try {
        const timestamp = await getBinanceServerTime();
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
const fetchTransactionByPeriod = async (apiKey, secretKey, startTime, endTime) => {
    try {
        const timestamp = await getBinanceServerTime();
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
const fetchTradeHistory = async (apiKey, secretKey) => {
    try {
        const timestamp = await getBinanceServerTime();
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

















const getSymbolInfo = async (symbol) => {
    try {
        const response = await axios.get(`${binanceFuturesAPI}/fapi/v1/exchangeInfo`);
        const symbolInfo = response.data.symbols.find(s => s.symbol === symbol);
        return symbolInfo;
    } catch (error) {
        console.error('Error getting symbol info:', error.message);
        throw error;
    }
};

// Function to check precision for quantity and price
const checkPrecision = async (symbol) => {
    const symbolInfo = await getSymbolInfo(symbol);
    
    // Get precision for quantity and price
    const quantityPrecision = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE').stepSize;
    const pricePrecision = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER').tickSize;
    
    console.log('Quantity Precision:', quantityPrecision);
    console.log('Price Precision:', pricePrecision);
    
    return {
        quantityPrecision,
        pricePrecision
    };
};
const adjustPrecision = (value, precision) => {
    value = parseFloat(value);
    if (isNaN(value)) {
        throw new Error('Invalid value for precision adjustment');
    }

    // Get the number of decimal places from the precision (e.g., 0.01 => 2 decimals)
    const decimalPlaces = (precision.split('.')[1] || '').length;
    
    // Use toFixed to adjust the value to the correct precision
    return parseFloat(value.toFixed(decimalPlaces));
};

const binanceAPI = 'https://testnet.binancefuture.com/fapi/v1/exchangeInfo';


const getSymbolFilters = async (symbol) => {
    try {
        const response = await axios.get(binanceAPI);
        const symbolInfo = response.data.symbols.find((s) => s.symbol === symbol);

        if (!symbolInfo) {
            throw new Error(`Symbol ${symbol} not found in the exchange info.`);
        }

        const percentPriceFilter = symbolInfo.filters.find(f => f.filterType === 'PERCENT_PRICE');

        if (!percentPriceFilter) {
            console.warn('No PERCENT_PRICE filter found for this symbol.');
            return null;  // If no PERCENT_PRICE filter exists, return null.
        }

        return percentPriceFilter;
    } catch (error) {
        console.error('Error fetching symbol filters:', error.message);
        return null;
    }
};

// Function to calculate the valid price range based on PERCENT_PRICE filter
const calculateValidPriceRange = (marketPrice, percentPriceFilter) => {
    const multiplyFactor = parseFloat(percentPriceFilter.multiplyFactor);
    const maxDeviation = marketPrice * multiplyFactor / 100;

    const minPrice = marketPrice - maxDeviation;
    const maxPrice = marketPrice + maxDeviation;

    return { minPrice, maxPrice };
};

const getMarketPrice = async (symbol) => {
    try {
        const response = await axios.get(`https://testnet.binancefuture.com/fapi/v1/ticker/price?symbol=${symbol}`);
        return parseFloat(response.data.price);
    } catch (error) {
        console.error('Error fetching market price:', error.message);
        return 0;
    }
};
const pollOrderStatus = async (orderId,symbol,secretKey,apiKey) => {
    let orderStatus = null;
    const maxAttempts = 10;
    let attempts = 0;
    

    while (attempts < maxAttempts) {
        var timestamp = await getBinanceServerTime();
        try {
            const orderStatusResponse = await axios.get(`${binanceFuturesAPI}/fapi/v1/order`, {
                params: {
                    symbol: symbol,
                    orderId: orderId,
                    timestamp:timestamp,
                    signature: createSignature({ symbol, orderId, timestamp:timestamp }, secretKey),
                },
                headers: {
                    'X-MBX-APIKEY': apiKey,
                },
            });

            orderStatus = orderStatusResponse.data;

            // If the order is filled, exit the loop
            if (orderStatus.status === 'FILLED') {
                break;
            }
        } catch (error) {
            console.error('Error checking order status:', error.response?.data || error.message);
        }

        attempts++;
        // Wait for 1 second before polling again
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return orderStatus;
};
const placeOrder = async (apiKey, secretKey, symbol, quantity, side, leverage, takeProfitPercent) => {
    try {
        const orderPrice = takeProfitPercent;
        const percentPriceFilter = await getSymbolFilters(symbol);
        if (!percentPriceFilter) {
            throw new Error('Unable to fetch necessary symbol filters. Aborting order.');
        }
        
        const marketPrice = await getMarketPrice(symbol);

        let adjustedPrice = marketPrice;

        if (percentPriceFilter) {

            const multiplierUp = parseFloat(percentPriceFilter.multiplierUp);
            const multiplierDown = parseFloat(percentPriceFilter.multiplierDown);

            const maxDeviation = marketPrice * multiplierUp / 100;
            const minDeviation = marketPrice * multiplierDown / 100;

            const minPrice = marketPrice - minDeviation;
            const maxPrice = marketPrice + maxDeviation;

            console.log(`Allowed price range: Min: ${minPrice} Max: ${maxPrice}`);

            // Ensure the price is within the allowed range for limit orders
            if (orderPrice < minPrice || orderPrice > maxPrice) {
                throw new Error(`Order price is outside the allowed range. Please choose a price between ${minPrice} and ${maxPrice}`);
            }
            // If you're placing a limit order, adjust price to be within range
            adjustedPrice = Math.max(minPrice, Math.min(orderPrice, maxPrice));
            console.log(`Adjusted order price: ${adjustedPrice}`);
        }
     
        
        const adjustedQuantity = Math.round(quantity); // You can adjust the price similarly if needed

        var timestamp = await getBinanceServerTime();
        const leverageParams = {
            symbol,
            leverage,
            timestamp: timestamp,
        };
        
        
        // Generate the correct signature for leverage
        const leverageSignature = createSignature(leverageParams, secretKey);
        leverageParams.signature = leverageSignature;
        
        const leverageResponse = await axios.post(
            `${binanceFuturesAPI}${binEndpoints.leverageOrders}`,
            null, // Empty body, params are sent
            {
                headers: { 'X-MBX-APIKEY': apiKey },
                params: leverageParams,
            }
        );
        timestamp = await getBinanceServerTime();
        const orderParams = {
            symbol,
            side, // BUY or SELL
            type: 'MARKET',
            quantity:adjustedQuantity,
            timestamp: timestamp,
        };
         if (orderPrice !== undefined) {
            orderParams.type = 'LIMIT';
            orderParams.price = adjustedPrice.toFixed(6); // Set the adjusted price to 6 decimals
            orderParams.timeInForce = 'GTC'; // Good Till Cancelled
        }
       
        // Generate the correct signature for market order
        const orderSignature = createSignature(orderParams, secretKey);
        orderParams.signature = orderSignature;

        const orderResponse = await axios.post(
            `${binanceFuturesAPI}${binEndpoints.buyOrders}`,
            null, // Empty body, params are sent
            {
                headers: { 'X-MBX-APIKEY': apiKey },
                params: orderParams,
            }
        );

        console.log('Order placed:', orderResponse.data);

        const orderStatus = await pollOrderStatus(orderResponse.data.orderId,symbol,secretKey,apiKey,);

        // Step 3: Extract the entry price
        let entryPrice = 0;
        if (orderStatus && orderStatus.status === 'FILLED') {
            entryPrice = parseFloat(orderStatus.avgFillPrice || orderStatus.fills[0]?.price || 0);
        }

        if (entryPrice <= 0) {
            console.error('No valid entry price found in order response');
            return;
        }

        console.log('Entry Price:', entryPrice);

        // Step 4: Calculate take profit price
        const takeProfitPrice = entryPrice * (1 + takeProfitPercent / 100);
        console.log(`Take Profit Price: ${takeProfitPrice}`);

        // Step 5: Place Take Profit Order
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
        return takeProfitResponse.data;

    } catch (error) {
        console.error('Error in placeOrder:', error.response?.data || error.message);
    }
};

const buyOrders = async (
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
        const timestamp = await getBinanceServerTime();
        const symbol = `${coinName}${pairCurrency}`; // USDCUSDT
        console.log('symbol', symbol);
        const tickerResponse = await axios.get(`${binanceFuturesAPI}${binEndpoints.tickerOrders}`, {
            params: { symbol },
        });
        const currentPrice = parseFloat(tickerResponse.data.price);
        const quantity = (orderAmount / currentPrice).toFixed(2); // Match Binance minQty rules

        console.log(`Current price: ${currentPrice}, Quantity: ${quantity}`);
        await placeOrder(apiKey, secretKey, symbol, quantity, side, leverage, takeProfitPercent);
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
    fetchAllProfitByPeriod
};
