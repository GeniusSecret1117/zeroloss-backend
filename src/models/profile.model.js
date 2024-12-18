const pool = require('../databases/mysql.db');

class Profile {
    constructor({
        userId,
        binanceId = null,
        avatarUrl = null,
        fullName = null,
        telegramId = null,
        whatsapp = null,
        facebook = null,
        instagram = null,
        twitter = null,
        linkedin = null,
        createdAt = new Date(),
        updatedAt = new Date(),
        photoUrl = null,
        phoneNo = null,
    }) {
        this.userId = userId;
        this.binanceId = binanceId;
        this.avatarUrl = avatarUrl;
        this.fullName = fullName;
        this.telegramId = telegramId;
        this.whatsapp = whatsapp;
        this.facebook = facebook;
        this.instagram = instagram;
        this.twitter = twitter;
        this.linkedin = linkedin;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.photoUrl = photoUrl;
        this.phoneNo = phoneNo;
    }

    async save() {
        try {
            const sql = `INSERT INTO profiles 
                         (id, user_id, binance_id, avatar_url, full_name, telegram_id, whatsapp, facebook, instagram, twitter, linkedin, created_at, updated_at, photo_url, phone_no)
                         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const now = new Date();
            await pool.execute(sql, [
                this.userId,
                this.binanceId,
                this.avatarUrl,
                this.fullName,
                this.telegramId,
                this.whatsapp,
                this.facebook,
                this.instagram,
                this.twitter,
                this.linkedin,
                now,
                now,
                this.photoUrl,
                this.phoneNo,
            ]);
        } catch (error) {
            console.error('Error saving profile:', error.message);
            throw new Error('Could not save profile.');
        }
    }

    // Fetch a profile by ID
    static async findById(id) {
        try {
            const sql = 'SELECT * FROM profiles WHERE id = ?';
            const [rows] = await pool.execute(sql, [id]);
            return rows[0];
        } catch (error) {
            console.error(`Error fetching profile with id ${id}:`, error.message);
            return null;
        }
    }

    // Fetch profiles by userId
    static async findByUserId(userId) {
        try {
            const sql = 'SELECT * FROM profiles WHERE user_id = ?';
            const rows = await pool.execute(sql, [userId]);
            return rows[0];
        } catch (error) {
            console.error(`Error fetching profiles for user with id ${userId}:`, error.message);
            return [];
        }
    }

    // Update profile image by userId
    static async findByIdAndUpdateProfileImage(userId, photoUrl) {
        try {
            const sql = `UPDATE profiles SET photo_url = ? WHERE user_id = ?`;
            const [result] = await pool.execute(sql, [photoUrl, userId]);
            if (result.affectedRows === 0) {
                console.error('No rows were updated');
            }
            return await this.findByUserId(userId);
        } catch (error) {
            throw new Error('Could not save profile image!');
        }
    }

    // Update a profile by ID
    static async findByIdAndUpdate(id, updates) {
        try {
            console.log('updates', updates);
            const [oldUpdates] = await this.findByUserId(id);
            console.log('old updates', oldUpdates);
            const now = new Date();
            const sql = `UPDATE profiles 
                         SET binance_id = ?, avatar_url = ?, full_name = ?, telegram_id = ?, whatsapp = ?, 
                             facebook = ?, instagram = ?, twitter = ?, linkedin = ?, updated_at = ?, photo_url = ?, phone_no = ?
                         WHERE user_id = ?`;
            const [result] = await pool.execute(sql, [
                updates.binanceId ?? oldUpdates?.binance_id ?? null,
                updates.avatarUrl ?? oldUpdates?.avatar_url ?? null,
                updates.fullName ?? oldUpdates.fullName,
                updates.telegramId ?? oldUpdates.telegram_id,
                updates.whatsapp ?? oldUpdates.whatsapp,
                updates.facebook ?? oldUpdates.facebook,
                updates.instagram ?? oldUpdates.instagram,
                updates.twitter ?? oldUpdates.twitter,
                updates.linkedin ?? oldUpdates.linkedin,
                now,
                updates.photoUrl ?? oldUpdates.photo_url,
                updates.phoneNo ?? oldUpdates.phone_no,
                id,
            ]);

            if (result.affectedRows === 0) {
                return null;
            }

            return await this.findByUserId(id);
        } catch (error) {
            console.error(`Error updating profile with id ${id}:`, error.message);
            throw new Error('Could not update profile.');
        }
    }

    // Delete a profile by ID
    static async findByIdAndDelete(id) {
        try {
            const sql = 'DELETE FROM profiles WHERE user_id = ?';
            await pool.execute(sql, [id]);
        } catch (error) {
            console.error(`Error deleting profile with id ${id}:`, error.message);
            throw new Error('Could not delete profile.');
        }
    }
}

module.exports = Profile;
