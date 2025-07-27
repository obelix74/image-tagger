import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { imageApi, type Collection, type ImageMetadata } from '../services/api';
import './CollectionDetail.css';

const CollectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCollectionData(parseInt(id));
    }
  }, [id]);

  const loadCollectionData = async (collectionId: number) => {
    try {
      setLoading(true);
      setImagesLoading(true);
      
      // Load collection info
      const collectionResponse = await imageApi.getCollection(collectionId);
      if (collectionResponse.success && collectionResponse.collection) {
        setCollection(collectionResponse.collection);
      } else {
        setError(collectionResponse.error || 'Collection not found');
        setLoading(false);
        setImagesLoading(false);
        return;
      }
      
      setLoading(false);
      
      // Load collection images
      const imagesResponse = await imageApi.getCollectionImages(collectionId);
      if (imagesResponse.success && imagesResponse.images) {
        setImages(imagesResponse.images);
      } else {
        setError(imagesResponse.error || 'Failed to load collection images');
      }
      
      setImagesLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load collection');
      setLoading(false);
      setImagesLoading(false);
    }
  };

  const getCollectionTypeIcon = (type: string) => {
    switch (type) {
      case 'manual': return '📁';
      case 'smart': return '⚡';
      case 'keyword': return '🏷️';
      case 'location': return '📍';
      case 'camera': return '📷';
      case 'date': return '📅';
      default: return '📁';
    }
  };

  const getCollectionTypeLabel = (type: string) => {
    switch (type) {
      case 'manual': return 'Manual Collection';
      case 'smart': return 'Smart Collection';
      case 'keyword': return 'Keyword Collection';
      case 'location': return 'Location Collection';
      case 'camera': return 'Camera Collection';
      case 'date': return 'Date Collection';
      default: return 'Collection';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="collection-detail-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading collection...</p>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="collection-detail-container">
        <div className="error">
          <span className="icon">❌</span>
          <p>{error || 'Collection not found'}</p>
          <Link to="/collections" className="back-button">
            Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-detail-container">
      <div className="collection-header">
        <div className="header-left">
          <Link to="/collections" className="back-link">
            ← Back to Collections
          </Link>
          <div className="collection-info">
            <div className="collection-title">
              <span className="collection-icon">
                {getCollectionTypeIcon(collection.type)}
              </span>
              <h1>{collection.name}</h1>
            </div>
            <div className="collection-meta">
              <span className="collection-type">
                {getCollectionTypeLabel(collection.type)}
              </span>
              <span className="separator">•</span>
              <span className="image-count">
                {images.length} images
              </span>
              <span className="separator">•</span>
              <span className="date-updated">
                Updated {formatDate(collection.updatedAt)}
              </span>
            </div>
            {collection.description && (
              <p className="collection-description">{collection.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="collection-content">
        {imagesLoading ? (
          <div className="loading">
            <div className="spinner small"></div>
            <p>Loading images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <h3>No Images in Collection</h3>
            <p>
              {collection.type === 'manual' 
                ? 'Add images to this collection from the gallery or image detail pages.'
                : 'Images will appear here automatically based on the collection rules.'
              }
            </p>
            <Link to="/" className="browse-button">
              Browse Gallery
            </Link>
          </div>
        ) : (
          <div className="images-grid">
            {images.map((image) => (
              <div key={image.id} className="image-card">
                <Link to={`/image/${image.id}`} className="image-link">
                  <div className="image-thumbnail">
                    <img
                      src={imageApi.getThumbnailUrlById(image.id!)}
                      alt={image.originalName}
                      loading="lazy"
                    />
                    <div className="image-overlay">
                      <div className="image-name">{image.originalName}</div>
                      <div className="image-status">
                        <span 
                          className={`status-indicator ${image.status}`}
                          title={`Status: ${image.status}`}
                        >
                          {image.status === 'completed' && '✓'}
                          {image.status === 'processing' && '⏳'}
                          {image.status === 'error' && '❌'}
                          {image.status === 'uploaded' && '📤'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                
                {collection.type === 'manual' && (
                  <div className="image-actions">
                    <button
                      onClick={async () => {
                        try {
                          await imageApi.removeImageFromCollection(collection.id!, image.id!);
                          setImages(images.filter(img => img.id !== image.id));
                        } catch (error) {
                          setError('Failed to remove image from collection');
                        }
                      }}
                      className="remove-button"
                      title="Remove from collection"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionDetail;