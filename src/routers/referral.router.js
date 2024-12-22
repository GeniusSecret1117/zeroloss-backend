const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { userValidate } = require('../middlewares/jwt_service');
const upload = require('../middlewares/multer');

// Endpoint for getting a record by id
router.get('/', userValidate, referralController.getReferral);
router.post('/invite', userValidate, referralController.invite);

// // Endpoint for updating a record
// router.put('/', userValidate, apiController.updateProfile);

// // Endpoint for getting a record by user_id
// router.get('/', userValidate, apiController.getProfileByUserId);

// // Endpoint for finding a record by user_id and deleting
// router.delete('/:id', userValidate, apiController.getProfileByIdAndDelete);

// // Endpoint for finding a record by user_id and updating
// router.put(
//     '/profile-image',
//     userValidate,
//     upload.single('profileImage'),
//     apiController.getProfileByIdAndUpdateProfileImage
// );

// // Endpoint for finding a record by user_id and updating
// router.put('/:id', userValidate, apiController.getProfileByIdAndUpdate);

module.exports = router;
