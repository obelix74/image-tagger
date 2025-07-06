import bcrypt from 'bcrypt';
import { DatabaseService } from './DatabaseService';
import { User } from '../types';

export class UserService {
  private static readonly SALT_ROUNDS = 12;

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async createUser(userData: Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string }): Promise<User> {
    const db = DatabaseService.getDatabase();
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
      ], function(err) {
        if (err) {
          reject(err);
        } else {
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

  static async findUserByUsername(username: string): Promise<User | null> {
    const db = DatabaseService.getDatabase();

    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM users
        WHERE username = ?
      `, [username], (err, row: any) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(this.mapRowToUser(row));
        }
      });
    });
  }

  static async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.findUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    // Update last login time
    await this.updateLastLogin(user.id!);

    return user;
  }

  static async findUserById(id: number): Promise<User | null> {
    const db = DatabaseService.getDatabase();
    
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM users WHERE id = ?
      `, [id], (err, row: any) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(this.mapRowToUser(row));
        }
      });
    });
  }

  static async updateLastLogin(id: number): Promise<void> {
    const db = DatabaseService.getDatabase();
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE users SET last_login_at = ? WHERE id = ?
      `, [now, id], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  static async createDefaultAdminUser(): Promise<User> {
    const adminUser = {
      username: 'admin',
      email: 'admin@image-tagger.local',
      name: 'Default Admin',
      password: 'admin123', // Default password - should be changed in production
      isAdmin: true
    };

    return this.createUser(adminUser);
  }

  static async getDefaultAdminUser(): Promise<User> {
    const existingAdmin = await this.findUserByUsername('admin');
    if (existingAdmin) {
      return existingAdmin;
    }
    return this.createDefaultAdminUser();
  }

  private static mapRowToUser(row: any): User {
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
