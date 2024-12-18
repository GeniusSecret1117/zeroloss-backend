const binEndpoints = {
    fetchAccount: '/fapi/v2/account',
    fetchIncome: '/fapi/v1/income',
    fetchOpenOrders: '/fapi/v1/openOrders',
    fetchOrders: '/fapi/v1/allOrders',
    fetchFundingFee: '/fapi/v1/fundingRate',
    fetchTransactionHistory: '/fapi/v1/transaction',
    fetchPositionRisk: '/fapi/v2/positionRisk',
    fetchTrades: '/fapi/v1/userTrades',
    fetchOrders: '/fapi/v1/allOrders',
    buyOrders: '/fapi/v1/order',
    leverageOrders: '/fapi/v1/leverage',
    tickerOrders: '/fapi/v1/ticker/price',
};

module.exports = binEndpoints;
