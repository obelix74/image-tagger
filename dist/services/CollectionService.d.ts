import { Collection, ImageMetadata } from '../types';
export declare class CollectionService {
    /**
     * Create predefined smart collections based on common photography patterns
     */
    static createDefaultCollections(userId: number): Promise<void>;
    /**
     * Create a new collection
     */
    static createCollection(collection: Omit<Collection, 'id'>): Promise<number>;
    /**
     * Get all collections for a user
     */
    static getUserCollections(userId: number): Promise<Collection[]>;
    /**
     * Get a specific collection with image count
     */
    static getCollection(collectionId: number): Promise<Collection | null>;
    /**
     * Get images in a collection
     */
    static getCollectionImages(collectionId: number): Promise<ImageMetadata[]>;
    /**
     * Add image to manual collection
     */
    static addImageToCollection(collectionId: number, imageId: number): Promise<void>;
    /**
     * Remove image from manual collection
     */
    static removeImageFromCollection(collectionId: number, imageId: number): Promise<void>;
    /**
     * Update collection
     */
    static updateCollection(collectionId: number, updates: Partial<Collection>): Promise<void>;
    /**
     * Delete collection
     */
    static deleteCollection(collectionId: number): Promise<void>;
    /**
     * Evaluate smart collection rules and return matching images
     */
    private static evaluateSmartCollection;
    /**
     * Build SQL condition for a collection rule
     */
    private static buildRuleCondition;
    /**
     * Auto-organize images into collections based on AI analysis
     */
    static autoOrganizeImages(userId: number): Promise<void>;
    /**
     * Categorize image by content analysis
     */
    private static categorizeImageByContent;
    /**
     * Categorize image by location
     */
    private static categorizeImageByLocation;
    /**
     * Categorize image by camera
     */
    private static categorizeImageByCamera;
    /**
     * Find or create content-based collection
     */
    private static findOrCreateContentCollection;
    /**
     * Find or create location-based collection
     */
    private static findOrCreateLocationCollection;
    /**
     * Find or create camera-based collection
     */
    private static findOrCreateCameraCollection;
}
//# sourceMappingURL=CollectionService.d.ts.map