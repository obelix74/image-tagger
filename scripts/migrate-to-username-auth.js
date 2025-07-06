#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Database path
const dbPath = process.env.DATABASE_PATH || './database.sqlite';

console.log('Starting migration to username/password authentication...');
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
      // Drop the old users table if it exists
      db.run("DROP TABLE IF EXISTS users_old", (err) => {
        if (err) {
          console.log('No old users table to drop');
        }
      });

      // Rename current users table to backup
      db.run("ALTER TABLE users RENAME TO users_old", (err) => {
        if (err) {
          console.log('No existing users table found, creating new one');
        }

        // Create new users table with username/password structure
        db.run(`
          CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            last_login_at TEXT
          )
        `, async (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('Created new users table');

          // Create index
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`, (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('Created username index');

            // Create default admin user
            const now = new Date().toISOString();
            bcrypt.hash('admin123', 12, (err, passwordHash) => {
              if (err) {
                reject(err);
                return;
              }

              db.run(`
                INSERT INTO users (username, email, name, password_hash, is_admin, created_at, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                'admin',
                'admin@image-tagger.local',
                'Default Admin',
                passwordHash,
                1,
                now,
                now
              ], function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                console.log('Created default admin user (username: admin, password: admin123)');

                // Update images table to reference the new admin user
                db.run(`UPDATE images SET user_id = 1 WHERE user_id IS NULL OR user_id = 0 OR user_id NOT IN (SELECT id FROM users)`, function(err) {
                  if (err) {
                    reject(err);
                    return;
                  }
                  console.log(`Updated ${this.changes} images to belong to admin user`);

                  // Clean up old users table
                  db.run("DROP TABLE IF EXISTS users_old", (err) => {
                    if (err) {
                      console.log('Warning: Could not drop old users table:', err.message);
                    } else {
                      console.log('Cleaned up old users table');
                    }
                    resolve();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

// Run migration
runMigration()
  .then(() => {
    console.log('Migration completed successfully!');
    console.log('');
    console.log('You can now log in with:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('');
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
