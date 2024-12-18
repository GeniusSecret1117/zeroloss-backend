const jwt = require('jsonwebtoken');
require('dotenv').config();

// const payload = { id: user.id, email: user.email }; // Customize as needed
const generateJWT = (payload) => {
    return jwt.sign({ payload }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const verifyJWT = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

const userValidate = (req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
        return res.status(401).send({
            statusCode: 401,
            statusMessage: 'Invalid token',
            message: 'Unauthorized',
            data: null,
        });
    }
    const decoded = verifyJWT(token);
    req.userId = decoded.payload.id;
    next();
};

module.exports = {
    generateJWT,
    verifyJWT,
    userValidate,
};

// const payload = { id: user.id }; // Customize as needed
// const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Change expiration as needed
