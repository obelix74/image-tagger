import express from 'express';
import { CollectionService } from '../services/CollectionService';
import { Collection, CollectionResponse } from '../types';

const router = express.Router();

// Get all collections for the current user
router.get('/', async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId || 1; // Default to user 1 for now
    const collections = await CollectionService.getUserCollections(userId);
    
    const response: CollectionResponse = {
      success: true,
      collections
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch collections'
    });
  }
});

// Create a new collection
router.post('/', async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId || 1; // Default to user 1 for now
    const { name, description, type, rules } = req.body;
    
    if (!name || !type) {
      res.status(400).json({
        success: false,
        error: 'Name and type are required'
      });
      return;
    }

    const collectionData: Omit<Collection, 'id'> = {
      name,
      description,
      type,
      rules,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const collectionId = await CollectionService.createCollection(collectionData);
    const collection = await CollectionService.getCollection(collectionId);
    
    const response: CollectionResponse = {
      success: true,
      collection: collection!
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create collection'
    });
  }
});

// Get a specific collection
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const collectionId = parseInt(req.params.id);
    if (isNaN(collectionId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid collection ID'
      });
      return;
    }

    const collection = await CollectionService.getCollection(collectionId);
    if (!collection) {
      res.status(404).json({
        success: false,
        error: 'Collection not found'
      });
      return;
    }
    
    const response: CollectionResponse = {
      success: true,
      collection
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch collection'
    });
  }
});

// Update a collection
router.put('/:id', async (req, res): Promise<void> => {
  try {
    const collectionId = parseInt(req.params.id);
    if (isNaN(collectionId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid collection ID'
      });
      return;
    }

    const { name, description, rules } = req.body;
    const updates: Partial<Collection> = {};
    
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (rules !== undefined) updates.rules = rules;

    await CollectionService.updateCollection(collectionId, updates);
    const collection = await CollectionService.getCollection(collectionId);
    
    const response: CollectionResponse = {
      success: true,
      collection: collection!
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update collection'
    });
  }
});

// Delete a collection
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    const collectionId = parseInt(req.params.id);
    if (isNaN(collectionId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid collection ID'
      });
      return;
    }

    await CollectionService.deleteCollection(collectionId);
    
    res.json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete collection'
    });
  }
});

// Get images in a collection
router.get('/:id/images', async (req, res): Promise<void> => {
  try {
    const collectionId = parseInt(req.params.id);
    if (isNaN(collectionId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid collection ID'
      });
      return;
    }

    const images = await CollectionService.getCollectionImages(collectionId);
    
    const response: CollectionResponse = {
      success: true,
      images
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching collection images:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch collection images'
    });
  }
});

// Add image to collection
router.post('/:id/images/:imageId', async (req, res): Promise<void> => {
  try {
    const collectionId = parseInt(req.params.id);
    const imageId = parseInt(req.params.imageId);
    
    if (isNaN(collectionId) || isNaN(imageId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid collection ID or image ID'
      });
      return;
    }

    await CollectionService.addImageToCollection(collectionId, imageId);
    
    res.json({
      success: true,
      message: 'Image added to collection successfully'
    });
  } catch (error) {
    console.error('Error adding image to collection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add image to collection'
    });
  }
});

// Remove image from collection
router.delete('/:id/images/:imageId', async (req, res): Promise<void> => {
  try {
    const collectionId = parseInt(req.params.id);
    const imageId = parseInt(req.params.imageId);
    
    if (isNaN(collectionId) || isNaN(imageId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid collection ID or image ID'
      });
      return;
    }

    await CollectionService.removeImageFromCollection(collectionId, imageId);
    
    res.json({
      success: true,
      message: 'Image removed from collection successfully'
    });
  } catch (error) {
    console.error('Error removing image from collection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove image from collection'
    });
  }
});

// Create default collections for user
router.post('/setup-defaults', async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId || 1; // Default to user 1 for now
    
    await CollectionService.createDefaultCollections(userId);
    
    res.json({
      success: true,
      message: 'Default collections created successfully'
    });
  } catch (error) {
    console.error('Error creating default collections:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create default collections'
    });
  }
});

// Auto-organize images into collections
router.post('/auto-organize', async (req, res): Promise<void> => {
  try {
    const userId = (req as any).userId || 1; // Default to user 1 for now
    
    await CollectionService.autoOrganizeImages(userId);
    
    res.json({
      success: true,
      message: 'Images auto-organized into collections successfully'
    });
  } catch (error) {
    console.error('Error auto-organizing images:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-organize images'
    });
  }
});

export { router as collectionRoutes };