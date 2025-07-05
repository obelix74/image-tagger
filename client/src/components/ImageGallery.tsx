import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { imageApi, type ImageMetadata } from '../services/api';
import SearchBox from './SearchBox';
import './ImageGallery.css';

const ImageGallery: React.FC = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await imageApi.getAllImages();

      if (response.success && response.images) {
        setImages(response.images);
      } else {
        setError(response.error || 'Failed to load images');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      navigate(`/search/general/${encodeURIComponent(searchTerm)}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'Uploaded';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="gallery-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gallery-container">
        <div className="error">
          <span className="icon">❌</span>
          <p>{error}</p>
          <button onClick={loadImages} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2>Image Gallery</h2>
        <p>{images.length} image{images.length !== 1 ? 's' : ''} uploaded</p>
        <Link to="/upload" className="upload-button">
          Upload New Image
        </Link>
      </div>

      <div className="search-section">
        <SearchBox
          onSearch={handleSearch}
          placeholder="Search images by name, description, keywords..."
          className="compact"
        />
      </div>

      {images.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <h3>No images yet</h3>
          <p>Upload your first image to get started with AI analysis</p>
          <Link to="/upload" className="upload-button primary">
            Upload Image
          </Link>
        </div>
      ) : (
        <div className="image-grid">
          {images.map((image) => (
            <Link
              key={image.id}
              to={`/image/${image.id}`}
              className="image-card"
            >
              <div className="image-thumbnail">
                <img
                  src={imageApi.getThumbnailUrl(image.thumbnailPath)}
                  alt={image.originalName}
                  loading="lazy"
                />
                <div className={`status-badge ${image.status}`}>
                  <span className="status-icon">{getStatusIcon(image.status)}</span>
                  <span className="status-text">{getStatusText(image.status)}</span>
                </div>
              </div>
              
              <div className="image-info">
                <h3 className="image-title">{image.originalName}</h3>
                <div className="image-meta">
                  <span className="file-size">{formatFileSize(image.fileSize)}</span>
                  {image.width && image.height && (
                    <span className="dimensions">{image.width} × {image.height}</span>
                  )}
                </div>
                <div className="upload-date">
                  {formatDate(image.uploadedAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
