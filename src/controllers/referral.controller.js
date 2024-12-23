const { userValidate } = require('../middlewares/jwt_service');
const Referral = require('../models/referral.model');
const config = require('config');
const User = require('../models/user.model');


const getReferral = async (req,res) =>{
    const userId = req.userId; 
    const data = await Referral.getReferralByUserId(userId);
    if (!data) {
        return res.status(404).send({
            statusCode: 404,
            statusMessage: 'Not found',
            message: 'Referral not found.',
            data: null,
        });
    }
    return res.status(200).send({
        statusCode: 200,
        message:"get referral data",
        data: data,
    });

}

const invite = async (req, res) => {
    const friends = req.body.data;
   
    const user = await User.findById(req.userId);
    const email = user.email;
    const referral_code =user.referral_code;
    friends.forEach(friend => {
        const referral = new Referral({ user_id:req.userId,invite_email:friend});       
        const saved =  referral.save()
        Referral.sendEmail(friend,email,referral_code);
    });
   return res.status(200).send({
                                statusCode: 200,
                                message:"Invite friends successfuly",
                                data: friends,
                                });
    
};



module.exports = {
    getReferral,
    invite
};
