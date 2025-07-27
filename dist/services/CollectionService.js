"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionService = void 0;
const DatabaseService_1 = require("./DatabaseService");
class CollectionService {
    /**
     * Create predefined smart collections based on common photography patterns
     */
    static async createDefaultCollections(userId) {
        const defaultCollections = [
            {
                name: 'Recent Photos',
                description: 'Photos from the last 30 days',
                type: 'date',
                rules: [{
                        field: 'uploadedAt',
                        operator: 'greater_than',
                        value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                    }]
            },
            {
                name: 'Portrait Photography',
                description: 'Images identified as portraits',
                type: 'keyword',
                rules: [{
                        field: 'keywords',
                        operator: 'contains',
                        value: 'portrait'
                    }]
            },
            {
                name: 'Landscape Photography',
                description: 'Images identified as landscapes',
                type: 'keyword',
                rules: [{
                        field: 'keywords',
                        operator: 'contains',
                        value: 'landscape'
                    }]
            },
            {
                name: 'Architecture',
                description: 'Architectural photography',
                type: 'keyword',
                rules: [{
                        field: 'keywords',
                        operator: 'contains',
                        value: 'architecture'
                    }]
            },
            {
                name: 'High ISO Photos',
                description: 'Photos taken with high ISO (800+)',
                type: 'camera',
                rules: [{
                        field: 'iso',
                        operator: 'greater_than',
                        value: 800
                    }]
            },
            {
                name: 'Wide Angle Photography',
                description: 'Photos taken with wide angle lens (< 35mm)',
                type: 'camera',
                rules: [{
                        field: 'focalLength',
                        operator: 'less_than',
                        value: 35
                    }]
            },
            {
                name: 'Geotagged Photos',
                description: 'Photos with GPS location data',
                type: 'location',
                rules: [{
                        field: 'latitude',
                        operator: 'greater_than',
                        value: -90
                    }]
            }
        ];
        for (const collectionData of defaultCollections) {
            try {
                await this.createCollection({
                    ...collectionData,
                    userId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            catch (error) {
                console.warn(`Failed to create default collection "${collectionData.name}":`, error);
            }
        }
    }
    /**
     * Create a new collection
     */
    static async createCollection(collection) {
        return DatabaseService_1.DatabaseService.insertCollection(collection);
    }
    /**
     * Get all collections for a user
     */
    static async getUserCollections(userId) {
        return DatabaseService_1.DatabaseService.getUserCollections(userId);
    }
    /**
     * Get a specific collection with image count
     */
    static async getCollection(collectionId) {
        return DatabaseService_1.DatabaseService.getCollection(collectionId);
    }
    /**
     * Get images in a collection
     */
    static async getCollectionImages(collectionId) {
        const collection = await DatabaseService_1.DatabaseService.getCollection(collectionId);
        if (!collection)
            return [];
        if (collection.type === 'manual') {
            return DatabaseService_1.DatabaseService.getManualCollectionImages(collectionId);
        }
        else {
            // Smart collection - evaluate rules
            return this.evaluateSmartCollection(collection);
        }
    }
    /**
     * Add image to manual collection
     */
    static async addImageToCollection(collectionId, imageId) {
        return DatabaseService_1.DatabaseService.addImageToCollection(collectionId, imageId);
    }
    /**
     * Remove image from manual collection
     */
    static async removeImageFromCollection(collectionId, imageId) {
        return DatabaseService_1.DatabaseService.removeImageFromCollection(collectionId, imageId);
    }
    /**
     * Update collection
     */
    static async updateCollection(collectionId, updates) {
        return DatabaseService_1.DatabaseService.updateCollection(collectionId, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    }
    /**
     * Delete collection
     */
    static async deleteCollection(collectionId) {
        return DatabaseService_1.DatabaseService.deleteCollection(collectionId);
    }
    /**
     * Evaluate smart collection rules and return matching images
     */
    static async evaluateSmartCollection(collection) {
        if (!collection.rules || collection.rules.length === 0) {
            return [];
        }
        const userId = collection.userId;
        const rules = collection.rules;
        // Build SQL query based on rules
        let baseQuery = `
      SELECT DISTINCT i.* FROM images i
      LEFT JOIN gemini_analysis ga ON i.id = ga.image_id
      LEFT JOIN image_metadata im ON i.id = im.image_id
      WHERE i.user_id = ? AND i.status = 'completed'
    `;
        const params = [userId];
        // Add rule conditions
        const conditions = [];
        for (const rule of rules) {
            const condition = this.buildRuleCondition(rule, params);
            if (condition) {
                conditions.push(condition);
            }
        }
        if (conditions.length > 0) {
            baseQuery += ' AND (' + conditions.join(' AND ') + ')';
        }
        baseQuery += ' ORDER BY i.uploaded_at DESC';
        return DatabaseService_1.DatabaseService.executeSmartCollectionQuery(baseQuery, params);
    }
    /**
     * Build SQL condition for a collection rule
     */
    static buildRuleCondition(rule, params) {
        const { field, operator, value, value2 } = rule;
        // Map rule fields to SQL fields
        const fieldMap = {
            'uploadedAt': 'i.uploaded_at',
            'keywords': 'ga.keywords',
            'description': 'ga.description',
            'caption': 'ga.caption',
            'title': 'ga.title',
            'headline': 'ga.headline',
            'location': 'ga.location',
            'confidence': 'ga.confidence',
            'iso': 'im.iso',
            'fNumber': 'im.f_number',
            'exposureTime': 'im.exposure_time',
            'focalLength': 'im.focal_length',
            'make': 'im.make',
            'model': 'im.model',
            'lens': 'im.lens',
            'latitude': 'im.latitude',
            'longitude': 'im.longitude',
            'city': 'im.city',
            'state': 'im.state',
            'country': 'im.country',
            'creator': 'im.creator',
            'dateTimeOriginal': 'im.date_time_original'
        };
        const sqlField = fieldMap[field];
        if (!sqlField)
            return null;
        switch (operator) {
            case 'equals':
                params.push(value);
                return `${sqlField} = ?`;
            case 'contains':
                params.push(`%${value}%`);
                return `${sqlField} LIKE ?`;
            case 'starts_with':
                params.push(`${value}%`);
                return `${sqlField} LIKE ?`;
            case 'greater_than':
                params.push(value);
                return `${sqlField} > ?`;
            case 'less_than':
                params.push(value);
                return `${sqlField} < ?`;
            case 'between':
                if (value2 !== undefined) {
                    params.push(value, value2);
                    return `${sqlField} BETWEEN ? AND ?`;
                }
                return null;
            case 'in_range':
                if (value2 !== undefined) {
                    params.push(value, value2);
                    return `(${sqlField} >= ? AND ${sqlField} <= ?)`;
                }
                return null;
            default:
                return null;
        }
    }
    /**
     * Auto-organize images into collections based on AI analysis
     */
    static async autoOrganizeImages(userId) {
        // Get all completed images for the user
        const { images } = await DatabaseService_1.DatabaseService.getAllImages(undefined, undefined, userId);
        const completedImages = images.filter(img => img.status === 'completed');
        for (const image of completedImages) {
            try {
                const analysis = await DatabaseService_1.DatabaseService.getAnalysis(image.id);
                const metadata = await DatabaseService_1.DatabaseService.getImageMetadata(image.id);
                if (analysis) {
                    await this.categorizeImageByContent(image, analysis, userId);
                }
                if (metadata) {
                    await this.categorizeImageByLocation(image, metadata, userId);
                    await this.categorizeImageByCamera(image, metadata, userId);
                }
            }
            catch (error) {
                console.warn(`Failed to auto-organize image ${image.id}:`, error);
            }
        }
    }
    /**
     * Categorize image by content analysis
     */
    static async categorizeImageByContent(image, analysis, userId) {
        const keywords = analysis.keywords;
        // Define content-based collections
        const contentCategories = [
            { name: 'People & Portraits', keywords: ['person', 'people', 'portrait', 'face', 'family', 'child', 'adult'] },
            { name: 'Nature & Wildlife', keywords: ['nature', 'wildlife', 'animal', 'bird', 'tree', 'forest', 'flower', 'plant'] },
            { name: 'Architecture', keywords: ['building', 'architecture', 'house', 'bridge', 'structure', 'urban'] },
            { name: 'Transportation', keywords: ['car', 'vehicle', 'train', 'airplane', 'boat', 'motorcycle', 'bicycle'] },
            { name: 'Food & Dining', keywords: ['food', 'meal', 'restaurant', 'cooking', 'drink', 'coffee', 'dinner'] },
            { name: 'Sports & Activities', keywords: ['sport', 'game', 'activity', 'exercise', 'running', 'swimming', 'cycling'] },
            { name: 'Events & Celebrations', keywords: ['event', 'party', 'celebration', 'wedding', 'birthday', 'festival'] }
        ];
        for (const category of contentCategories) {
            const hasMatch = category.keywords.some(keyword => keywords.some(imgKeyword => imgKeyword.toLowerCase().includes(keyword)));
            if (hasMatch) {
                const collection = await this.findOrCreateContentCollection(category.name, userId);
                if (collection) {
                    await this.addImageToCollection(collection.id, image.id);
                }
            }
        }
    }
    /**
     * Categorize image by location
     */
    static async categorizeImageByLocation(image, metadata, userId) {
        if (metadata.country) {
            const collection = await this.findOrCreateLocationCollection(metadata.country, userId);
            if (collection) {
                await this.addImageToCollection(collection.id, image.id);
            }
        }
        if (metadata.city) {
            const collection = await this.findOrCreateLocationCollection(metadata.city, userId);
            if (collection) {
                await this.addImageToCollection(collection.id, image.id);
            }
        }
    }
    /**
     * Categorize image by camera
     */
    static async categorizeImageByCamera(image, metadata, userId) {
        if (metadata.make && metadata.model) {
            const cameraName = `${metadata.make} ${metadata.model}`;
            const collection = await this.findOrCreateCameraCollection(cameraName, userId);
            if (collection) {
                await this.addImageToCollection(collection.id, image.id);
            }
        }
    }
    /**
     * Find or create content-based collection
     */
    static async findOrCreateContentCollection(name, userId) {
        const collections = await DatabaseService_1.DatabaseService.getUserCollections(userId);
        const existing = collections.find(c => c.name === name && c.type === 'keyword');
        if (existing)
            return existing;
        try {
            const collectionId = await this.createCollection({
                name,
                description: `Auto-generated collection for ${name.toLowerCase()}`,
                type: 'manual',
                userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return DatabaseService_1.DatabaseService.getCollection(collectionId);
        }
        catch (error) {
            console.warn(`Failed to create content collection "${name}":`, error);
            return null;
        }
    }
    /**
     * Find or create location-based collection
     */
    static async findOrCreateLocationCollection(location, userId) {
        const collections = await DatabaseService_1.DatabaseService.getUserCollections(userId);
        const existing = collections.find(c => c.name === location && c.type === 'location');
        if (existing)
            return existing;
        try {
            const collectionId = await this.createCollection({
                name: location,
                description: `Photos taken in ${location}`,
                type: 'manual',
                userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return DatabaseService_1.DatabaseService.getCollection(collectionId);
        }
        catch (error) {
            console.warn(`Failed to create location collection "${location}":`, error);
            return null;
        }
    }
    /**
     * Find or create camera-based collection
     */
    static async findOrCreateCameraCollection(camera, userId) {
        const collections = await DatabaseService_1.DatabaseService.getUserCollections(userId);
        const existing = collections.find(c => c.name === camera && c.type === 'camera');
        if (existing)
            return existing;
        try {
            const collectionId = await this.createCollection({
                name: camera,
                description: `Photos taken with ${camera}`,
                type: 'manual',
                userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return DatabaseService_1.DatabaseService.getCollection(collectionId);
        }
        catch (error) {
            console.warn(`Failed to create camera collection "${camera}":`, error);
            return null;
        }
    }
}
exports.CollectionService = CollectionService;
//# sourceMappingURL=CollectionService.js.map