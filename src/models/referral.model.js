const { log } = require('console');
const pool = require('../databases/mysql.db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { isEmail } = require('validator');
class Referral {
    constructor({
        user_id,
        invite_email,
        status,
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.user_id = user_id;
        this.invite_email = invite_email;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;       
    }
    async save() {
        try {
            const sql = `INSERT INTO referrals (id, user_id, invite_email,created_at, updated_at)
                         VALUES (UUID(), ?, ?, ?, ?)`;

            
            const now = new Date();
            return await pool.execute(sql, [
                this.user_id,
                this.invite_email,
                now,
                now,
            ]);
        } catch (error) {
            console.error('Error saving referral:', error.message);
            throw new Error('Could not save referral.');
        }
    }
    static async sendEmail(toEmail,email,referral_code){
        // Configure your email transport
        const transporter = nodemailer.createTransport({
            service: process.env.email_provider,
            host: process.env.email_host, 
            port: 465,
            secure: true,
            auth: {
                user: process.env.email_address,
                pass: process.env.email_password,
            },
        });

        // Define email options
        const mailOptions = {
            from: process.env.email_address, // Sender address
            to: toEmail, // Recipient's address
            subject: 'Join ZeroLoss',
            text: `
                    You have been invited to register on zeroloss site by ${email}.
                    You can find the link below.
                    Join using this referral link: http://localhost:3000/sign-up?ref=${referral_code}`,
        };

        // Send the email
        try {
            await transporter.sendMail(mailOptions);
            console.log(`invite sent to ${toEmail}`);
            return;
        } catch (error) {
            console.error('Error sending OTP email:', error.message);
            throw new Error('Could not send OTP email.');
        }
    }
    
}

module.exports = Referral;