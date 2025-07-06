#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = process.env.DATABASE_PATH || './database.sqlite';

console.log('Starting user data migration...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Migration function
function runMigration() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if user_id column already exists
      db.get("PRAGMA table_info(images)", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Check if users table exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, userTableRow) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!userTableRow) {
            console.log('Users table does not exist. Creating...');
            
            // Create users table
            db.run(`
              CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                provider TEXT NOT NULL,
                provider_id TEXT NOT NULL,
                avatar TEXT,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                last_login_at TEXT,
                UNIQUE(provider, provider_id)
              )
            `, (err) => {
              if (err) {
                reject(err);
                return;
              }
              console.log('Users table created');
              
              // Create default admin user
              const now = new Date().toISOString();
              db.run(`
                INSERT INTO users (email, name, provider, provider_id, is_admin, created_at, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                'admin@image-tagger.local',
                'Default Admin',
                'google',
                'default-admin',
                1,
                now,
                now
              ], function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                console.log('Default admin user created with ID:', this.lastID);
                
                // Check if user_id column exists in images table
                db.all("PRAGMA table_info(images)", (err, columns) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  const hasUserIdColumn = columns.some(col => col.name === 'user_id');
                  
                  if (!hasUserIdColumn) {
                    console.log('Adding user_id column to images table...');
                    
                    // Add user_id column with default value of 1 (admin user)
                    db.run(`ALTER TABLE images ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`, (err) => {
                      if (err) {
                        reject(err);
                        return;
                      }
                      console.log('user_id column added to images table');
                      
                      // Update all existing images to belong to admin user
                      db.run(`UPDATE images SET user_id = 1 WHERE user_id IS NULL OR user_id = 0`, function(err) {
                        if (err) {
                          reject(err);
                          return;
                        }
                        console.log(`Updated ${this.changes} images to belong to admin user`);
                        resolve();
                      });
                    });
                  } else {
                    console.log('user_id column already exists in images table');
                    resolve();
                  }
                });
              });
            });
          } else {
            console.log('Users table already exists');
            
            // Check if default admin exists
            db.get("SELECT id FROM users WHERE provider = ? AND provider_id = ?", ['google', 'default-admin'], (err, adminRow) => {
              if (err) {
                reject(err);
                return;
              }
              
              if (!adminRow) {
                console.log('Creating default admin user...');
                const now = new Date().toISOString();
                db.run(`
                  INSERT INTO users (email, name, provider, provider_id, is_admin, created_at, last_login_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                  'admin@image-tagger.local',
                  'Default Admin',
                  'google',
                  'default-admin',
                  1,
                  now,
                  now
                ], function(err) {
                  if (err) {
                    reject(err);
                    return;
                  }
                  console.log('Default admin user created with ID:', this.lastID);
                  resolve();
                });
              } else {
                console.log('Default admin user already exists');
                resolve();
              }
            });
          }
        });
      });
    });
  });
}

// Run migration
runMigration()
  .then(() => {
    console.log('Migration completed successfully!');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    db.close();
    process.exit(1);
  });
