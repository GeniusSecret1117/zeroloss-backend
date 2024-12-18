const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const config = require('config');

// const JWT_SECRET = config.get('JWT_SECRET');

// const jwt = require('jsonwebtoken');
const { generateJWT } = require('../middlewares/jwt_service');
const Profile = require('../models/profile.model');
const { getProfileByUserId } = require('./profile.controller');
const BinanceSetting = require('../models/binance_setting');

const getUsers = async (req, res) => {
    try {
        const users = await User.find();

        res.send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully retrieved all the users.',
            data: users,
        });
    } catch (err) {
        res.status(500).send({ statusCode: 500, statusMessage: 'Internal Server Error', message: null, data: null });
    }
};

const verifyToken = async (req, res) => {
    try {
        //user
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).send({
                statusCode: 404,
                statusMessage: 'Not Found',
                message: 'User not found.',
            });
        }

        //jwt
        const payload = { id: user.id, email: user.email }; // Customize as needed
        const token = generateJWT(payload);

        //profile
        const profile = await Profile.findByUserId(user.id);
        const role = user.role;
        const userId = user.id;

        //binance
        let connected = false;
        const Binance = await BinanceSetting.findByUserId(userId);
        if (Binance.apiKey != null && Binance.secretKey != null) {
            connected = true;
        }

        //response
        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Logged in',
            message: 'Successfully logged in',
            data: {
                userId,
                data: {
                    displayName: profile[0]?.full_name,
                    photoUrl: profile[0]?.photo_url,
                    email: user.email,
                    shortcuts: ['apps.dashboard', 'apps.mailbox', 'apps.settings'],
                },
                role: [role],
                connected,
            },
            access_token: token,
        });
    } catch (err) {
        res.status(400).send({
            statusCode: 400,
            statusMessage: 'Bad request',
            message: err.message,
            data: null,
        });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !email.trim() || !password || !password.trim()) {
        return res.status(400).send({ statusCode: 400, statusMessage: 'Bad Request', message: null, data: null });
    }
    try {
        //user
        const user = await User.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        //jwt
        const payload = { id: user.id, email: user.email }; // Customize as needed
        const token = generateJWT(payload);

        //profile
        const profile = await Profile.findByUserId(user.id);
        const userProfile = {
            photoUrl: profile[0]?.photo_url || null,
            displayName: profile[0]?.full_name || null,
        };
        const role = user.role;
        const userId = user.id;

        //binance
        let connected = false;
        const Binance = await BinanceSetting.findByUserId(userId);
        if (Binance.apiKey != null && Binance.secretKey != null) {
            connected = true;
        }

        // res.json({ token });
        res.status(200).send({
            statusCode: 200,
            statusMessage: 'Logged in',
            message: 'Successfully logged in',
            data: {
                userId,
                data: {
                    displayName: userProfile.displayName,
                    photoUrl: userProfile.photoUrl,
                    email: user.email,
                    shortcuts: ['apps.dashboard', 'apps.mailbox', 'apps.settings'],
                },
                role: [role],
                connected,
            },
            access_token: token,
        });
    } catch (err) {
        res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: err.message,
            data: null,
        });
    }
};

const register = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !email.trim() || !password || !password.trim())
        return res.status(400).send({ statusCode: 400, statusMessage: 'Bad Request', message: null, data: null });
    try {
        const user = new User({ email, password });

        const saved = await user.save();
        if (saved) {
            const savedUser = await User.findByEmail(email);
            const userId = savedUser.id;

            // creating new profile_row
            const profile = new Profile({
                userId: userId,
            });
            await profile.save();

            console.log('in register user ID', userId);
            // creating new api_keys_row
            const binance = new BinanceSetting({
                user_id: userId,
            });
            console.log('binance instance', binance);
            await binance.save();

            //jwt
            const payload = { id: savedUser.id, email: savedUser.email }; // Customize as needed
            const access_token = generateJWT(payload);

            return res.status(201).send({
                statusCode: 201,
                statusMessage: 'Created',
                message: 'Successfully created a user.',
                data: {
                    userId: savedUser?.id ?? null,
                    // binanceId: zerolossId?.id ?? null,
                    data: {
                        displayName: null,
                        photoUrl: null,
                        email: savedUser?.email ?? null,
                        shortcuts: ['apps.dashboard', 'apps.mailbox', 'apps.settings'],
                    },
                    role: ['user'], //get this dynamically
                },
                access_token: access_token,
                connected: false,
            });
        }
    } catch (err) {
        res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: err.message,
            data: null,
        });
    }
};

const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !email.trim())
        return res.status(400).send({ statusCode: 400, statusMessage: 'Bad Request', message: null, data: null });

    try {
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(404).send({ statusCode: 404, statusMessage: 'User Not Found' });
        }

        await User.verifyOTP(email, otp);
        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Updated',
            message: 'Successfully verified email.',
            data: null,
        });
    } catch (err) {
        res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: err.message,
            data: null,
        });
    }
};

const requestOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const otp = User.generateOTP();
        const otpExpiration = new Date(Date.now() + 10 * 60 * 1000);

        return await findByEmailAndUpdateOTP(email, otp, otpExpiration);
    } catch (err) {
        res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: err.message,
            data: null,
        });
    }
};

module.exports = {
    getUsers,
    register,
    login,
    verifyOTP,
    requestOTP,
    verifyToken,
};
