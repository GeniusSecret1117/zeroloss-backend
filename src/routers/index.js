const express = require('express');
const authRouter = require('./auth.router');
const profileRouter = require('./profile.router');
const binanceRouter = require('./binance.router');
const referralRouter = require('./referral.router');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/binance', binanceRouter);
router.use('/referral', referralRouter);

module.exports = router;
