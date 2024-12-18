const pool = require('../databases/mysql.db');
const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Helper function to decrypt data
function decrypt(text) {
    let parts = text.split(':');
    let iv = Buffer.from(parts.shift(), 'hex');
    let encryptedText = Buffer.from(parts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

class BinanceSetting {
    constructor({
        user_id,
        api_key = null,
        secret_key = null,
        created_at = new Date(),
        updated_at = new Date(),
        ip_addresses = null,
    }) {
        this.userId = user_id;
        this.apiKey = api_key;
        this.secretKey = secret_key;
        this.createdAt = created_at;
        this.updatedAt = updated_at;
        this.ipAddresses = ip_addresses;
    }
    static async findByUserId(userId) {
        try {
            const sql = 'SELECT * FROM api_keys WHERE user_id = ?';
            const [rows] = await pool.execute(sql, [userId]);
            if (rows.length) {
                return new BinanceSetting(rows[0]);
            }
            return null;
        } catch (error) {
            console.error('Error fetching profile:', error.message);
            throw new Error('Could not fetch profile.');
        }
    }
    static async findApiKeyByUserId(userId) {
        try {
            const sql = `SELECT api_key, secret_key FROM api_keys WHERE user_id = ?`;
            const [row] = await pool.execute(sql, [userId]);
            if (row.length > 0) {
                row[0].api_key = decrypt(row[0].api_key);
                row[0].secret_key = decrypt(row[0].secret_key);

                return row[0];
            }
            return null;
        } catch (error) {
            console.log('Error while getting api_key by userId : ', error.message);
            return null;
        }
    }

    // Save new profile to the database with encrypted bio
    async save() {
        try {
            const sql = `INSERT INTO api_keys (id, user_id, api_key, secret_key, created_at, updated_at, ip_addresses) 
                         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`;
            const now = new Date();
            return await pool.execute(sql, [this.userId, null, null, now, now, null]);
        } catch (error) {
            console.error('Error saving binance account:', error.message);
            throw new Error('Could not create binance account.');
        }
    }

    async getByUserId(userId) {
        try {
            const sql = 'SELECT * FROM api_keys WHERE user_id = ?';
            const [rows] = await pool.execute(sql, [userId]);
            if (rows.length) {
                rows[0].api_key = rows[0].api_key ? decrypt(rows[0].api_key) : null;
                rows[0].secret_key = rows[0].secret_key ? decrypt(rows[0].secret_key) : null;
                if (rows[0].ip_addresses) {
                    rows[0].ip_addresses = rows[0].ip_addresses.split(',').filter((ip) => ip !== '');
                } else {
                    rows[0].ip_addresses = [];
                }
                return rows[0];
            }
            return null;
        } catch (error) {
            console.error('Error fetching profile:', error.message);
            throw new Error('Could not fetch profile.');
        }
    }

    // Update profile in the database with encrypted bio
    async update() {
        try {
            const encryptedApiKey = encrypt(this.apiKey); // Encrypt apiKey before updating
            const encryptedSecretKey = encrypt(this.secretKey); // Encrypt secretKey before updating
            const arrIpAddresses = this.ipAddresses.join(',');
            console.log('ip addres update arr', arrIpAddresses);
            const sql = `UPDATE api_keys 
                         SET api_key = ?, secret_key = ?, updated_at = ?, ip_addresses = ? 
                         WHERE user_id = ?`;
            await pool.execute(sql, [encryptedApiKey, encryptedSecretKey, new Date(), arrIpAddresses, this.userId]);

            const creds = await this.getByUserId(this.userId);
            return creds;
        } catch (error) {
            console.error('Error updating profile:', error.message);
            throw new Error('Could not update profile.');
        }
    }
}

module.exports = BinanceSetting;
