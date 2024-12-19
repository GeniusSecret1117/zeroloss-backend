const { userValidate } = require('../middlewares/jwt_service');
const Profile = require('../models/profile.model');
const config = require('config');

const createProfile = () => {
    try {
        const profile = new Profile({
            userId,
        });
    } catch (err) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: err.message,
            data: null,
        });
    }
};

const getProfileById = async (req, res) => {
    const id = req.params;
    try {
        const profile = await Profile.findById(id);

        if (!profile) {
            return res.status(404).send({
                statusCode: 404,
                statusMessage: 'Not found',
                message: 'Profile not found.',
                data: null,
            });
        }

        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully retrieved the user.',
            data: profile,
        });
    } catch (err) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: err.message,
            data: null,
        });
    }
};

const getProfileByUserId = async (req, res) => {
    try {
        const id = req.userId;
        const profile = await Profile.findByUserId(id);

        if (!profile) {
            return res.status(404).send({
                statusCode: 404,
                statusMessage: 'Not found',
                message: 'Profile not found.',
                data: null,
            });
        }

        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully retrieved the user.',
            data: {
                userId: profile[0].user_id,
                binanceId: profile[0].binance_id,
                avatarUrl: profile[0].avatar_url,
                fullName: profile[0].full_name,
                telegram: profile[0].telegram_id,
                whatsapp: profile[0].whatsapp,
                facebook: profile[0].facebook,
                instagram: profile[0].instagram,
                twitter: profile[0].twitter,
                linkedin: profile[0].linkedin,
                photoUrl: profile[0].photo_url,
                phoneNo: profile[0].phone_no,
            },
        });
    } catch (error) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error while getting profile',
            message: error.message,
            data: null,
        });
    }
};

const getProfileByIdAndDelete = async (req, res) => {
    try {
        const { id } = req.userId;

        const profile = await Profile.findByIdAndDelete(id);

        if (!profile) {
            return res.status(404).send({
                statusCode: 404,
                statusMessage: 'Ok',
                message: 'Profile not found',
                data: null,
            });
        }

        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully deleted the profile.',
            data: profile,
        });
    } catch (err) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: err.message,
            data: null,
        });
    }
};

const getProfileByIdAndUpdateProfileImage = async (req, res) => {
    try {
        const photoUrl = req.file.filename;
        const profile = await Profile.findByIdAndUpdateProfileImage(req.userId, photoUrl);
        console.log('profile returned', profile);
        console.log('profile returned', profile[0]?.photo_url);
        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully updated profile image.',
            data: profile[0]?.photo_url || null,
        });
    } catch (error) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: error.message,
            data: null,
        });
    }
};

const getProfileByIdAndUpdate = async (req, res) => {
    try {
        console.log('inside getprofilebyId and update');
        const { id } = req.userId;
        const updates = req.body;

        const profile = await Profile.findByIdAndUpdate(id, updates);

        if (!profile) {
            return res.status(404).send({
                statusCode: 404,
                statusMessage: 'Ok',
                message: 'Profile not found',
                data: null,
            });
        }

        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Ok',
            message: 'Successfully updated the profile.',
            data: profile,
        });
    } catch (error) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: error.message,
            data: null,
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        console.log('hitting update profile');
        const userId = req.userId;
        const updates = req.body;
        console.log("///////////////",updates);
        
        const updatedProfile = await Profile.findByIdAndUpdate(userId, updates);

        console.log('updated profile', updatedProfile);
        console.log('updated profile 0', updatedProfile[0]);
        console.log();
        return res.status(200).send({
            statusCode: 200,
            statusMessage: 'Updated',
            message: 'Successfully updated user',
            data: {
                userId: updatedProfile[0].user_id,
                binanceIc: updatedProfile[0].binance_id,
                avatarUrl: updatedProfile[0].avatar_url,
                fullName: updatedProfile[0].full_name,
                telegram: updatedProfile[0].telegram_id,
                whatsapp: updatedProfile[0].whatsapp,
                facebook: updatedProfile[0].facebook,
                instagram: updatedProfile[0].instagram,
                twitter: updatedProfile[0].twitter,
                linkedin: updatedProfile[0].linkedin,
                photoUrl: updatedProfile[0].photo_url,
                phoneNo: updatedProfile[0].phone_no,
            },
        });
    } catch (err) {
        return res.status(500).send({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: err.message,
            data: null,
        });
    }
};

module.exports = {
    getProfileById,
    getProfileByUserId,
    getProfileByIdAndDelete,
    getProfileByIdAndUpdate,
    createProfile,
    updateProfile,
    getProfileByIdAndUpdateProfileImage,
};
