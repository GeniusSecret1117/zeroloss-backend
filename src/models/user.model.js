const pool = require('../databases/mysql.db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { isEmail } = require('validator');

class User {
    constructor({
        email,
        password,
        status = false,
        emailVerified = false,
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.email = email;
        this.password = password;
        this.status = status;
        this.emailVerified = emailVerified;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    get email() {
        return this._email;
    }

    set email(email) {
        if (!isEmail(email)) throw new Error('Invalid email address.');
        this._email = email.trim().toLowerCase();
    }

    get password() {
        return this._password;
    }

    set password(password) {
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters long.');
        this._password = password; // Don't hash the password here, just store it
    }

    get status() {
        return this._status;
    }

    set status(status) {
        if (typeof status !== 'boolean') throw new Error('Invalid status value.');
        this._status = status;
    }

    get emailVerified() {
        return this._emailVerified;
    }

    set emailVerified(emailVerified) {
        if (typeof emailVerified !== 'boolean') throw new Error('Invalid email verification status.');
        this._emailVerified = emailVerified;
    }

    get createdAt() {
        return this._createdAt;
    }

    set createdAt(createdAt) {
        this._createdAt = createdAt;
    }

    get updatedAt() {
        return this._updatedAt;
    }

    set updatedAt(updatedAt) {
        this._updatedAt = updatedAt;
    }

    static async emailExists(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await pool.execute(sql, [email]);
        return rows.length > 0; // Return true if email exists
    }

    // Generate a 6-digit OTP
    static generateOTP() {
        return crypto.randomInt(100000, 999999).toString();
    }

    // Save user to database (with hashed password)
    async save() {
        try {
            const emailExists = await User.emailExists(this.email);
            if (emailExists) {
                throw new Error('Email already exists.');
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(this.password, salt); // Hash password during save
            const otp = User.generateOTP();
            const otpExpiration = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

            const sql = `INSERT INTO users (id, email, password, status, email_verified, otp, otp_expiration, created_at, updated_at, role)
                         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, 'user')`;

            this.sendEmail(this.email, otp);

            const now = new Date();
            return await pool.execute(sql, [
                this.email,
                hashedPassword,
                this.status,
                this.emailVerified,
                otp,
                otpExpiration,
                now,
                now,
            ]);
        } catch (error) {
            console.error('Error saving user:', error.message);
            throw new Error('Could not save user.');
        }
    }

    static async findByEmailAndUpdateOTP(email, otp, otpExpiration) {
        try {
            const updateSql = 'UPDATE users SET otp = ?, otp_expiration = ? WHERE email = ?';
            return await pool.execute(updateSql, [otp, otpExpiration, email]);
        } catch (err) {
            throw new Error('Could not send new OTP');
        }
    }

    // Email-sending function using Nodemailer
    async sendEmail(toEmail, otp) {
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
            subject: 'Your OTP Code For ZeroLoss',
            text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
        };

        // Send the email
        try {
            await transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${toEmail}`);
            return;
        } catch (error) {
            console.error('Error sending OTP email:', error.message);
            throw new Error('Could not send OTP email.');
        }
    }

    // Verify OTP and set emailVerified to truey
    static async verifyOTP(email, inputOtp) {
        try {
            const sql = 'SELECT otp, otp_expiration FROM users WHERE email = ?';
            const [rows] = await pool.execute(sql, [email]);
            if (!rows.length) throw new Error('User not found.');

            const { otp, otp_expiration } = rows[0];
            if (otp !== inputOtp) {
                throw new Error('Invalid OTP.');
            }
            if (new Date() > new Date(otp_expiration)) {
                throw new Error('OTP has expired.');
            }

            // If valid, set emailVerified to true and clear OTP fields
            const updateSql = 'UPDATE users SET email_verified = 1, otp = NULL, otp_expiration = NULL WHERE email = ?';
            return await pool.execute(updateSql, [email]);
        } catch (error) {
            console.error('Error verifying OTP:', error.message);
            throw new Error('OTP verification gone wrong');
        }
    }

    // Fetch all users from database
    static async findById(id) {
        try {
            const sql = 'SELECT * FROM users WHERE id = ?';
            const [rows] = await pool.execute(sql, [id]);
            return rows[0];
        } catch (error) {
            return null;
        }
    }

    static async findByEmail(email) {
        try {
            const sql = 'SELECT * FROM users WHERE email = ?';
            const [rows] = await pool.execute(sql, [email]);
            return rows[0];
        } catch (error) {
            return null;
        }
    }

    static async find() {
        try {
            const sql = 'SELECT * FROM users';
            const [rows] = await pool.execute(sql);
            return rows;
        } catch (error) {
            console.error('Error fetching users:', error.message);
            throw new Error('Could not fetch users.');
        }
    }

    static async findByIdAndUpdate(id, options) {
        try {
            const now = new Date();
    
            // Initialize an empty array for fields and values to update
            let fieldsToUpdate = [];
            let valuesToUpdate = [];
    
            // Only include email if it's provided and not an empty string
            if (options.email && options.email.trim() !== '') {
                fieldsToUpdate.push('email = ?');
                valuesToUpdate.push(options.email);
            }
    
            // Only include password if it's provided (and hash it)
            let hashedPassword = undefined;
            if (options.password) {
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(options.password, salt);
                fieldsToUpdate.push('password = ?');
                valuesToUpdate.push(hashedPassword);
            }
    
            // Only include status if it's provided
            if (options.status) {
                fieldsToUpdate.push('status = ?');
                valuesToUpdate.push(options.status);
            }
    
            // Only include email_verified if it's provided
            if (options.emailVerified !== undefined) {
                fieldsToUpdate.push('email_verified = ?');
                valuesToUpdate.push(options.emailVerified);
            }
    
            // Include updated_at field
            fieldsToUpdate.push('updated_at = ?');
            valuesToUpdate.push(now);
    
            // Construct the final SQL query
            const sql = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    
            // Log the final SQL for debugging purposes
            console.log('SQL:', sql);
            console.log('Values:', valuesToUpdate);
    
            // Execute the SQL query with the valuesToUpdate array
            await pool.execute(sql, [...valuesToUpdate, id]);
    
            console.log('User updated successfully');
        } catch (error) {
            console.error(`Error updating user with id ${id}:`, error.message);
            throw new Error('Could not update user.');
        }
    }
    
    

    // Delete user by ID
    static async findByIdAndDelete(id) {
        try {
            const sql = `DELETE FROM users WHERE id = ?`;
            await pool.execute(sql, [id]);
        } catch (error) {
            console.error(`Error deleting user with id ${id}:`, error.message);
            throw new Error('Could not delete user.');
        }
    }
}

module.exports = User;
