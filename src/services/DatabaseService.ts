import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { ImageMetadata, GeminiAnalysis, ImageExifMetadata } from '../types';

export class DatabaseService {
  private static db: sqlite3.Database;

  static getDatabase(): sqlite3.Database {
    return this.db;
  }

  static async initialize(): Promise<void> {
    const dbPath = process.env.DATABASE_PATH || './database.sqlite';
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
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

  private static async createTables(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));

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
  }

  static async insertImage(imageData: Omit<ImageMetadata, 'id'>): Promise<number> {
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
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  static async updateImageStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE images
        SET status = ?, error_message = ?, processed_at = ?
        WHERE id = ?
      `, [status, errorMessage || null, new Date().toISOString(), id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  static async getImage(id: number): Promise<ImageMetadata | null> {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params: any[]) => Promise<any>;

    const row = await get(`SELECT * FROM images WHERE id = ?`, [id]) as any;
    
    if (!row) return null;
    
    return this.mapRowToImageMetadata(row);
  }

  static async getAllImages(page?: number, limit?: number, userId?: number): Promise<{ images: ImageMetadata[], total: number, page: number, totalPages: number }> {
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: any[]) => Promise<any[]>;
    const get = promisify(this.db.get.bind(this.db)) as (sql: string) => Promise<any>;

    // Build WHERE clause for user filtering
    const whereClause = userId ? 'WHERE user_id = ?' : '';
    const whereParams = userId ? [userId] : [];

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM images ${whereClause}`;
    const countResult = await (whereParams.length > 0 ?
      (promisify(this.db.get.bind(this.db)) as (sql: string, params: any[]) => Promise<any>)(countQuery, whereParams) :
      get(countQuery)) as { total: number };
    const total = countResult.total;

    if (page !== undefined && limit !== undefined) {
      // Paginated query
      const offset = (page - 1) * limit;
      const rows = await all(`
        SELECT * FROM images
        ${whereClause}
        ORDER BY uploaded_at DESC
        LIMIT ? OFFSET ?
      `, [...whereParams, limit, offset]) as any[];

      const totalPages = Math.ceil(total / limit);

      return {
        images: rows.map(this.mapRowToImageMetadata),
        total,
        page,
        totalPages
      };
    } else {
      // Non-paginated query (backward compatibility)
      const rows = await all(`
        SELECT * FROM images
        ${whereClause}
        ORDER BY uploaded_at DESC
      `, whereParams) as any[];

      return {
        images: rows.map(this.mapRowToImageMetadata),
        total,
        page: 1,
        totalPages: 1
      };
    }
  }

  static async findDuplicateImage(originalName: string, fileSize: number): Promise<ImageMetadata | null> {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params: any[]) => Promise<any>;

    // Exclude images with 'error' status from duplicate checking
    const row = await get(`
      SELECT * FROM images
      WHERE original_name = ? AND file_size = ? AND status != 'error'
      ORDER BY uploaded_at DESC
      LIMIT 1
    `, [originalName, fileSize]) as any;

    if (!row) return null;

    return this.mapRowToImageMetadata(row);
  }

  static async searchImagesByKeyword(keyword: string, userId?: number): Promise<ImageMetadata[]> {
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params: any[]) => Promise<any[]>;

    const whereClause = userId ? 'WHERE ga.keywords LIKE ? AND i.user_id = ?' : 'WHERE ga.keywords LIKE ?';
    const params = userId ? [`%"${keyword}"%`, userId] : [`%"${keyword}"%`];

    const rows = await all(`
      SELECT DISTINCT i.* FROM images i
      INNER JOIN gemini_analysis ga ON i.id = ga.image_id
      ${whereClause}
      ORDER BY i.uploaded_at DESC
    `, params) as any[];

    return rows.map(this.mapRowToImageMetadata);
  }

  static async searchImages(searchTerm: string, userId?: number): Promise<ImageMetadata[]> {
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params: any[]) => Promise<any[]>;

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
    `, params) as any[];

    return rows.map(this.mapRowToImageMetadata);
  }

  static async insertAnalysis(analysisData: Omit<GeminiAnalysis, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO gemini_analysis (
          image_id, description, caption, keywords, confidence, analysis_date
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        analysisData.imageId,
        analysisData.description,
        analysisData.caption,
        JSON.stringify(analysisData.keywords),
        analysisData.confidence,
        analysisData.analysisDate
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  static async getAnalysis(imageId: number): Promise<GeminiAnalysis | null> {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params: any[]) => Promise<any>;

    const row = await get(`
      SELECT * FROM gemini_analysis WHERE image_id = ?
    `, [imageId]) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      imageId: row.image_id,
      description: row.description,
      caption: row.caption,
      keywords: JSON.parse(row.keywords),
      confidence: row.confidence ? parseFloat(row.confidence) : undefined,
      analysisDate: row.analysis_date
    };
  }

  private static mapRowToImageMetadata(row: any): ImageMetadata {
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

  static async insertImageMetadata(metadataData: Omit<ImageExifMetadata, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO image_metadata (
          image_id, latitude, longitude, altitude, make, model, software,
          iso, f_number, exposure_time, focal_length, flash, white_balance,
          date_time_original, date_time_digitized, title, description, keywords,
          creator, copyright, city, state, country, color_space, orientation,
          x_resolution, y_resolution, resolution_unit, raw_exif, extracted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        metadataData.imageId,
        metadataData.latitude,
        metadataData.longitude,
        metadataData.altitude,
        metadataData.make,
        metadataData.model,
        metadataData.software,
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
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  static async getImageMetadata(imageId: number): Promise<ImageExifMetadata | null> {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params: any[]) => Promise<any>;

    const row = await get(`SELECT * FROM image_metadata WHERE image_id = ?`, [imageId]) as any;

    if (!row) return null;

    return this.mapRowToImageExifMetadata(row);
  }

  private static mapRowToImageExifMetadata(row: any): ImageExifMetadata {
    return {
      id: row.id,
      imageId: row.image_id,
      latitude: row.latitude,
      longitude: row.longitude,
      altitude: row.altitude,
      make: row.make,
      model: row.model,
      software: row.software,
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

  private static async createDefaultAdminIfNotExists(): Promise<void> {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params: any[]) => Promise<any>;
    const run = promisify(this.db.run.bind(this.db));

    // Check if admin user already exists
    const existingAdmin = await get(`
      SELECT id FROM users WHERE username = ?
    `, ['admin']);

    if (!existingAdmin) {
      const now = new Date().toISOString();
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('admin123', 12);
      const runWithParams = promisify(this.db.run.bind(this.db)) as (sql: string, ...params: any[]) => Promise<any>;
      await runWithParams(`
        INSERT INTO users (username, email, name, password_hash, is_admin, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, 'admin', 'admin@image-tagger.local', 'Default Admin', passwordHash, 1, now, now);
      console.log('Created default admin user (username: admin, password: admin123)');
    }
  }

  static async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close(() => resolve());
    });
  }
}
