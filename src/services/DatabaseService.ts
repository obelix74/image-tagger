import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { ImageMetadata, GeminiAnalysis } from '../types';

export class DatabaseService {
  private static db: sqlite3.Database;

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

    // Create images table
    await run(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        thumbnail_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        uploaded_at TEXT NOT NULL,
        processed_at TEXT,
        status TEXT NOT NULL DEFAULT 'uploaded',
        error_message TEXT
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

    // Create indexes for better performance
    await run(`CREATE INDEX IF NOT EXISTS idx_images_status ON images (status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images (uploaded_at)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_analysis_image_id ON gemini_analysis (image_id)`);
  }

  static async insertImage(imageData: Omit<ImageMetadata, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO images (
          filename, original_name, file_path, thumbnail_path, file_size,
          mime_type, width, height, uploaded_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        imageData.filename,
        imageData.originalName,
        imageData.filePath,
        imageData.thumbnailPath,
        imageData.fileSize,
        imageData.mimeType,
        imageData.width,
        imageData.height,
        imageData.uploadedAt,
        imageData.status
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

  static async getAllImages(): Promise<ImageMetadata[]> {
    const all = promisify(this.db.all.bind(this.db)) as (sql: string) => Promise<any[]>;

    const rows = await all(`
      SELECT * FROM images
      ORDER BY uploaded_at DESC
    `) as any[];
    
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
      confidence: row.confidence,
      analysisDate: row.analysis_date
    };
  }

  private static mapRowToImageMetadata(row: any): ImageMetadata {
    return {
      id: row.id,
      filename: row.filename,
      originalName: row.original_name,
      filePath: row.file_path,
      thumbnailPath: row.thumbnail_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      width: row.width,
      height: row.height,
      uploadedAt: row.uploaded_at,
      processedAt: row.processed_at,
      status: row.status,
      errorMessage: row.error_message
    };
  }

  static async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close(() => resolve());
    });
  }
}
