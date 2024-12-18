// passport.js
const { Strategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/user.model');
const config = require('config');

const JWT_SECRET = config.get('JWT_SECRET');

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET, // Change this to your secret
};

const strategy = new Strategy(opts, async (jwt_payload, done) => {
    try {
        const user = await User.findById(jwt_payload.id); // Adjust the method to find user
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    } catch (err) {
        return done(err, false);
    }
});

module.exports = function (passport) {
    passport.use(strategy);
};
