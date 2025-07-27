"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const util_1 = require("util");
class DatabaseService {
    static getDatabase() {
        return this.db;
    }
    static async initialize() {
        const dbPath = process.env.DATABASE_PATH || './database.sqlite';
        return new Promise((resolve, reject) => {
            this.db = new sqlite3_1.default.Database(dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.createTables()
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }
    static async createTables() {
        const run = (0, util_1.promisify)(this.db.run.bind(this.db));
        // Create users table
        await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        last_login_at TEXT
      )
    `);
        // Create images table
        await run(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        original_path TEXT,
        thumbnail_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        uploaded_at TEXT NOT NULL,
        processed_at TEXT,
        status TEXT NOT NULL DEFAULT 'uploaded',
        error_message TEXT,
        user_id INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
        // Create gemini_analysis table
        await run(`
      CREATE TABLE IF NOT EXISTS gemini_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        caption TEXT NOT NULL,
        keywords TEXT NOT NULL,
        confidence REAL,
        analysis_date TEXT NOT NULL,
        title TEXT,
        headline TEXT,
        instructions TEXT,
        location TEXT,
        FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE CASCADE
      )
    `);
        // Create image_metadata table for EXIF/IPTC data
        await run(`
      CREATE TABLE IF NOT EXISTS image_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_id INTEGER NOT NULL,
        latitude REAL,
        longitude REAL,
        altitude REAL,
        make TEXT,
        model TEXT,
        software TEXT,
        lens TEXT,
        iso INTEGER,
        f_number REAL,
        exposure_time TEXT,
        focal_length REAL,
        flash TEXT,
        white_balance TEXT,
        date_time_original TEXT,
        date_time_digitized TEXT,
        title TEXT,
        description TEXT,
        keywords TEXT,
        creator TEXT,
        copyright TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        color_space TEXT,
        orientation INTEGER,
        x_resolution REAL,
        y_resolution REAL,
        resolution_unit TEXT,
        raw_exif TEXT,
        extracted_at TEXT NOT NULL,
        FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE CASCADE
      )
    `);
        // Add new columns to existing gemini_analysis table if they don't exist
        try {
            await run(`ALTER TABLE gemini_analysis ADD COLUMN title TEXT`);
        }
        catch (e) {
            // Column already exists, ignore
        }
        try {
            await run(`ALTER TABLE gemini_analysis ADD COLUMN headline TEXT`);
        }
        catch (e) {
            // Column already exists, ignore
        }
        try {
            await run(`ALTER TABLE gemini_analysis ADD COLUMN instructions TEXT`);
        }
        catch (e) {
            // Column already exists, ignore
        }
        try {
            await run(`ALTER TABLE gemini_analysis ADD COLUMN location TEXT`);
        }
        catch (e) {
            // Column already exists, ignore
        }
        // Add lens column to image_metadata table if it doesn't exist
        try {
            await run(`ALTER TABLE image_metadata ADD COLUMN lens TEXT`);
        }
        catch (e) {
            // Column already exists, ignore
        }
        // Create collections table
        await run(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        rules TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
        // Create collection_images table for manual collections
        await run(`
      CREATE TABLE IF NOT EXISTS collection_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL,
        image_id INTEGER NOT NULL,
        added_at TEXT NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE,
        FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE CASCADE,
        UNIQUE(collection_id, image_id)
      )
    `);
        // Create indexes for better performance
        await run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_images_status ON images (status)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images (uploaded_at)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_images_user_id ON images (user_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_analysis_image_id ON gemini_analysis (image_id)`);
        // Create default admin user if not exists
        await this.createDefaultAdminIfNotExists();
        await run(`CREATE INDEX IF NOT EXISTS idx_metadata_image_id ON image_metadata (image_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_metadata_location ON image_metadata (latitude, longitude)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_metadata_make_model ON image_metadata (make, model)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_metadata_keywords ON image_metadata (keywords)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_metadata_city ON image_metadata (city)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_metadata_creator ON image_metadata (creator)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections (user_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_collections_type ON collections (type)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_collection_images_collection ON collection_images (collection_id)`);
        await run(`CREATE INDEX IF NOT EXISTS idx_collection_images_image ON collection_images (image_id)`);
    }
    static async insertImage(imageData) {
        return new Promise((resolve, reject) => {
            this.db.run(`
        INSERT INTO images (
          filename, original_name, file_path, original_path, thumbnail_path, file_size,
          mime_type, width, height, uploaded_at, status, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                imageData.filename,
                imageData.originalName,
                imageData.filePath,
                imageData.originalPath,
                imageData.thumbnailPath,
                imageData.fileSize,
                imageData.mimeType,
                imageData.width,
                imageData.height,
                imageData.uploadedAt,
                imageData.status,
                imageData.userId
            ], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
        });
    }
    static async updateImageStatus(id, status, errorMessage) {
        return new Promise((resolve, reject) => {
            this.db.run(`
        UPDATE images
        SET status = ?, error_message = ?, processed_at = ?
        WHERE id = ?
      `, [status, errorMessage || null, new Date().toISOString(), id], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async getImage(id) {
        const get = (0, util_1.promisify)(this.db.get.bind(this.db));
        const row = await get(`SELECT * FROM images WHERE id = ?`, [id]);
        if (!row)
            return null;
        return this.mapRowToImageMetadata(row);
    }
    static async getAllImages(page, limit, userId) {
        const all = (0, util_1.promisify)(this.db.all.bind(this.db));
        const get = (0, util_1.promisify)(this.db.get.bind(this.db));
        // Build WHERE clause for user filtering
        const whereClause = userId ? 'WHERE user_id = ?' : '';
        const whereParams = userId ? [userId] : [];
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM images ${whereClause}`;
        const countResult = await (whereParams.length > 0 ?
            (0, util_1.promisify)(this.db.get.bind(this.db))(countQuery, whereParams) :
            get(countQuery));
        const total = countResult.total;
        if (page !== undefined && limit !== undefined) {
            // Paginated query
            const offset = (page - 1) * limit;
            const rows = await all(`
        SELECT * FROM images
        ${whereClause}
        ORDER BY uploaded_at DESC
        LIMIT ? OFFSET ?
      `, [...whereParams, limit, offset]);
            const totalPages = Math.ceil(total / limit);
            return {
                images: rows.map(this.mapRowToImageMetadata),
                total,
                page,
                totalPages
            };
        }
        else {
            // Non-paginated query (backward compatibility)
            const rows = await all(`
        SELECT * FROM images
        ${whereClause}
        ORDER BY uploaded_at DESC
      `, whereParams);
            return {
                images: rows.map(this.mapRowToImageMetadata),
                total,
                page: 1,
                totalPages: 1
            };
        }
    }
    static async findDuplicateImage(originalName, fileSize) {
        const get = (0, util_1.promisify)(this.db.get.bind(this.db));
        // Exclude images with 'error' status from duplicate checking
        const row = await get(`
      SELECT * FROM images
      WHERE original_name = ? AND file_size = ? AND status != 'error'
      ORDER BY uploaded_at DESC
      LIMIT 1
    `, [originalName, fileSize]);
        if (!row)
            return null;
        return this.mapRowToImageMetadata(row);
    }
    static async searchImagesByKeyword(keyword, userId) {
        const all = (0, util_1.promisify)(this.db.all.bind(this.db));
        const whereClause = userId ? 'WHERE ga.keywords LIKE ? AND i.user_id = ?' : 'WHERE ga.keywords LIKE ?';
        const params = userId ? [`%"${keyword}"%`, userId] : [`%"${keyword}"%`];
        const rows = await all(`
      SELECT DISTINCT i.* FROM images i
      INNER JOIN gemini_analysis ga ON i.id = ga.image_id
      ${whereClause}
      ORDER BY i.uploaded_at DESC
    `, params);
        return rows.map(this.mapRowToImageMetadata);
    }
    static async searchImages(searchTerm, userId) {
        const all = (0, util_1.promisify)(this.db.all.bind(this.db));
        const searchPattern = `%${searchTerm}%`;
        const userFilter = userId ? 'AND i.user_id = ?' : '';
        const params = [
            searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
            searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
            searchPattern, searchPattern, searchPattern, searchPattern
        ];
        if (userId) {
            params.push(userId.toString());
        }
        const rows = await all(`
      SELECT DISTINCT i.* FROM images i
      LEFT JOIN gemini_analysis ga ON i.id = ga.image_id
      LEFT JOIN image_metadata im ON i.id = im.image_id
      WHERE (
        i.original_name LIKE ? OR
        i.filename LIKE ? OR
        ga.description LIKE ? OR
        ga.caption LIKE ? OR
        ga.keywords LIKE ? OR
        im.title LIKE ? OR
        im.description LIKE ? OR
        im.keywords LIKE ? OR
        im.creator LIKE ? OR
        im.make LIKE ? OR
        im.model LIKE ? OR
        im.city LIKE ? OR
        im.state LIKE ? OR
        im.country LIKE ?
      ) ${userFilter}
      ORDER BY i.uploaded_at DESC
    `, params);
        return rows.map(this.mapRowToImageMetadata);
    }
    static async insertAnalysis(analysisData) {
        return new Promise((resolve, reject) => {
            this.db.run(`
        INSERT INTO gemini_analysis (
          image_id, description, caption, keywords, confidence, analysis_date, title, headline, instructions, location
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                analysisData.imageId,
                analysisData.description,
                analysisData.caption,
                JSON.stringify(analysisData.keywords),
                analysisData.confidence,
                analysisData.analysisDate,
                analysisData.title,
                analysisData.headline,
                analysisData.instructions,
                analysisData.location
            ], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
        });
    }
    static async getAnalysis(imageId) {
        const get = (0, util_1.promisify)(this.db.get.bind(this.db));
        const row = await get(`
      SELECT * FROM gemini_analysis WHERE image_id = ?
    `, [imageId]);
        if (!row)
            return null;
        return {
            id: row.id,
            imageId: row.image_id,
            description: row.description,
            caption: row.caption,
            keywords: JSON.parse(row.keywords),
            confidence: row.confidence ? parseFloat(row.confidence) : undefined,
            analysisDate: row.analysis_date,
            title: row.title,
            headline: row.headline,
            instructions: row.instructions,
            location: row.location
        };
    }
    static mapRowToImageMetadata(row) {
        return {
            id: row.id,
            filename: row.filename,
            originalName: row.original_name,
            filePath: row.file_path,
            originalPath: row.original_path,
            thumbnailPath: row.thumbnail_path,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            width: row.width,
            height: row.height,
            uploadedAt: row.uploaded_at,
            processedAt: row.processed_at,
            status: row.status,
            errorMessage: row.error_message,
            userId: row.user_id || 1
        };
    }
    static async insertImageMetadata(metadataData) {
        return new Promise((resolve, reject) => {
            this.db.run(`
        INSERT INTO image_metadata (
          image_id, latitude, longitude, altitude, make, model, software, lens,
          iso, f_number, exposure_time, focal_length, flash, white_balance,
          date_time_original, date_time_digitized, title, description, keywords,
          creator, copyright, city, state, country, color_space, orientation,
          x_resolution, y_resolution, resolution_unit, raw_exif, extracted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                metadataData.imageId,
                metadataData.latitude,
                metadataData.longitude,
                metadataData.altitude,
                metadataData.make,
                metadataData.model,
                metadataData.software,
                metadataData.lens,
                metadataData.iso,
                metadataData.fNumber,
                metadataData.exposureTime,
                metadataData.focalLength,
                metadataData.flash,
                metadataData.whiteBalance,
                metadataData.dateTimeOriginal,
                metadataData.dateTimeDigitized,
                metadataData.title,
                metadataData.description,
                metadataData.keywords,
                metadataData.creator,
                metadataData.copyright,
                metadataData.city,
                metadataData.state,
                metadataData.country,
                metadataData.colorSpace,
                metadataData.orientation,
                metadataData.xResolution,
                metadataData.yResolution,
                metadataData.resolutionUnit,
                metadataData.rawExif,
                metadataData.extractedAt
            ], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
        });
    }
    static async getImageMetadata(imageId) {
        const get = (0, util_1.promisify)(this.db.get.bind(this.db));
        const row = await get(`SELECT * FROM image_metadata WHERE image_id = ?`, [imageId]);
        if (!row)
            return null;
        return this.mapRowToImageExifMetadata(row);
    }
    static mapRowToImageExifMetadata(row) {
        return {
            id: row.id,
            imageId: row.image_id,
            latitude: row.latitude,
            longitude: row.longitude,
            altitude: row.altitude,
            make: row.make,
            model: row.model,
            software: row.software,
            lens: row.lens,
            iso: row.iso,
            fNumber: row.f_number,
            exposureTime: row.exposure_time,
            focalLength: row.focal_length,
            flash: row.flash,
            whiteBalance: row.white_balance,
            dateTimeOriginal: row.date_time_original,
            dateTimeDigitized: row.date_time_digitized,
            title: row.title,
            description: row.description,
            keywords: row.keywords,
            creator: row.creator,
            copyright: row.copyright,
            city: row.city,
            state: row.state,
            country: row.country,
            colorSpace: row.color_space,
            orientation: row.orientation,
            xResolution: row.x_resolution,
            yResolution: row.y_resolution,
            resolutionUnit: row.resolution_unit,
            rawExif: row.raw_exif,
            extractedAt: row.extracted_at
        };
    }
    static async createDefaultAdminIfNotExists() {
        const get = (0, util_1.promisify)(this.db.get.bind(this.db));
        const run = (0, util_1.promisify)(this.db.run.bind(this.db));
        // Check if admin user already exists
        const existingAdmin = await get(`
      SELECT id FROM users WHERE username = ?
    `, ['admin']);
        if (!existingAdmin) {
            const now = new Date().toISOString();
            const bcrypt = require('bcrypt');
            const passwordHash = await bcrypt.hash('admin123', 12);
            const runWithParams = (0, util_1.promisify)(this.db.run.bind(this.db));
            await runWithParams(`
        INSERT INTO users (username, email, name, password_hash, is_admin, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, 'admin', 'admin@image-tagger.local', 'Default Admin', passwordHash, 1, now, now);
            console.log('Created default admin user (username: admin, password: admin123)');
        }
    }
    // Collection methods
    static async insertCollection(collectionData) {
        return new Promise((resolve, reject) => {
            this.db.run(`
        INSERT INTO collections (
          name, description, type, rules, created_at, updated_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
                collectionData.name,
                collectionData.description,
                collectionData.type,
                collectionData.rules ? JSON.stringify(collectionData.rules) : null,
                collectionData.createdAt,
                collectionData.updatedAt,
                collectionData.userId
            ], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.lastID);
                }
            });
        });
    }
    static async getUserCollections(userId) {
        const all = (0, util_1.promisify)(this.db.all.bind(this.db));
        const rows = await all(`
      SELECT c.*, COUNT(ci.image_id) as image_count
      FROM collections c
      LEFT JOIN collection_images ci ON c.id = ci.collection_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `, [userId]);
        return rows.map(this.mapRowToCollection);
    }
    static async getCollection(collectionId) {
        const get = (0, util_1.promisify)(this.db.get.bind(this.db));
        const row = await get(`
      SELECT c.*, COUNT(ci.image_id) as image_count
      FROM collections c
      LEFT JOIN collection_images ci ON c.id = ci.collection_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [collectionId]);
        if (!row)
            return null;
        return this.mapRowToCollection(row);
    }
    static async updateCollection(collectionId, updates) {
        const fields = [];
        const values = [];
        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.description !== undefined) {
            fields.push('description = ?');
            values.push(updates.description);
        }
        if (updates.rules !== undefined) {
            fields.push('rules = ?');
            values.push(JSON.stringify(updates.rules));
        }
        if (updates.updatedAt !== undefined) {
            fields.push('updated_at = ?');
            values.push(updates.updatedAt);
        }
        if (fields.length === 0)
            return;
        values.push(collectionId);
        return new Promise((resolve, reject) => {
            this.db.run(`
        UPDATE collections
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async deleteCollection(collectionId) {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM collections WHERE id = ?`, [collectionId], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async addImageToCollection(collectionId, imageId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
        INSERT OR IGNORE INTO collection_images (collection_id, image_id, added_at)
        VALUES (?, ?, ?)
      `, [collectionId, imageId, new Date().toISOString()], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async removeImageFromCollection(collectionId, imageId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
        DELETE FROM collection_images 
        WHERE collection_id = ? AND image_id = ?
      `, [collectionId, imageId], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    static async getManualCollectionImages(collectionId) {
        const all = (0, util_1.promisify)(this.db.all.bind(this.db));
        const rows = await all(`
      SELECT i.* FROM images i
      INNER JOIN collection_images ci ON i.id = ci.image_id
      WHERE ci.collection_id = ?
      ORDER BY ci.added_at DESC
    `, [collectionId]);
        return rows.map(this.mapRowToImageMetadata);
    }
    static async executeSmartCollectionQuery(query, params) {
        const all = (0, util_1.promisify)(this.db.all.bind(this.db));
        const rows = await all(query, params);
        return rows.map(this.mapRowToImageMetadata);
    }
    static mapRowToCollection(row) {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            type: row.type,
            rules: row.rules ? JSON.parse(row.rules) : undefined,
            imageCount: row.image_count || 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            userId: row.user_id
        };
    }
    static async close() {
        return new Promise((resolve) => {
            this.db.close(() => resolve());
        });
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map