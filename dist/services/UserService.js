"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const DatabaseService_1 = require("./DatabaseService");
class UserService {
    static async hashPassword(password) {
        return bcrypt_1.default.hash(password, this.SALT_ROUNDS);
    }
    static async verifyPassword(password, hash) {
        return bcrypt_1.default.compare(password, hash);
    }
    static async createUser(userData) {
        const db = DatabaseService_1.DatabaseService.getDatabase();
        const now = new Date().toISOString();
        const passwordHash = await this.hashPassword(userData.password);
        return new Promise((resolve, reject) => {
            db.run(`
        INSERT INTO users (username, email, name, password_hash, is_admin, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
                userData.username,
                userData.email || null,
                userData.name,
                passwordHash,
                userData.isAdmin ? 1 : 0,
                now,
                now
            ], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({
                        id: this.lastID,
                        username: userData.username,
                        email: userData.email,
                        name: userData.name,
                        passwordHash,
                        isAdmin: userData.isAdmin,
                        createdAt: now,
                        lastLoginAt: now
                    });
                }
            });
        });
    }
    static async findUserByUsername(username) {
        const db = DatabaseService_1.DatabaseService.getDatabase();
        return new Promise((resolve, reject) => {
            db.get(`
        SELECT * FROM users
        WHERE username = ?
      `, [username], (err, row) => {
                if (err) {
                    reject(err);
                }
                else if (!row) {
                    resolve(null);
                }
                else {
                    resolve(this.mapRowToUser(row));
                }
            });
        });
    }
    static async authenticateUser(username, password) {
        const user = await this.findUserByUsername(username);
        if (!user) {
            return null;
        }
        const isValid = await this.verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return null;
        }
        // Update last login time
        await this.updateLastLogin(user.id);
        return user;
    }
    static async findUserById(id) {
        const db = DatabaseService_1.DatabaseService.getDatabase();
        return new Promise((resolve, reject) => {
            db.get(`
        SELECT * FROM users WHERE id = ?
      `, [id], (err, row) => {
                if (err) {
                    reject(err);
                }
                else if (!row) {
                    resolve(null);
                }
                else {
                    resolve(this.mapRowToUser(row));
                }
            });
        });
    }
    static async updateLastLogin(id) {
        const db = DatabaseService_1.DatabaseService.getDatabase();
        const now = new Date().toISOString();
        return new Promise((resolve, reject) => {
            db.run(`
        UPDATE users SET last_login_at = ? WHERE id = ?
      `, [now, id], (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async createDefaultAdminUser() {
        const adminUser = {
            username: 'admin',
            email: 'admin@image-tagger.local',
            name: 'Default Admin',
            password: 'admin123', // Default password - should be changed in production
            isAdmin: true
        };
        return this.createUser(adminUser);
    }
    static async getDefaultAdminUser() {
        const existingAdmin = await this.findUserByUsername('admin');
        if (existingAdmin) {
            return existingAdmin;
        }
        return this.createDefaultAdminUser();
    }
    static mapRowToUser(row) {
        return {
            id: row.id,
            username: row.username,
            email: row.email,
            name: row.name,
            passwordHash: row.password_hash,
            isAdmin: row.is_admin === 1,
            createdAt: row.created_at,
            lastLoginAt: row.last_login_at
        };
    }
}
exports.UserService = UserService;
UserService.SALT_ROUNDS = 12;
//# sourceMappingURL=UserService.js.map