const express = require('express');
const authRouter = require('./auth.router');
const profileRouter = require('./profile.router');
const binanceRouter = require('./binance.router');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/binance', binanceRouter);

module.exports = router;
