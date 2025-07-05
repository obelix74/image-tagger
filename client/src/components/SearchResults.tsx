import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { imageApi, type ImageMetadata } from '../services/api';
import './SearchResults.css';

const SearchResults: React.FC = () => {
  const { keyword } = useParams<{ keyword: string }>();
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (keyword) {
      searchImages(keyword);
    }
  }, [keyword]);

  const searchImages = async (searchKeyword: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await imageApi.searchByKeyword(searchKeyword);
      
      if (response.success && response.images) {
        setImages(response.images);
      } else {
        setError(response.error || 'Search failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Analyzed';
      case 'processing': return 'Processing';
      case 'error': return 'Error';
      default: return 'Uploaded';
    }
  };

  if (loading) {
    return (
      <div className="search-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Searching for images with keyword "{keyword}"...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-container">
        <div className="error">
          <span className="icon">❌</span>
          <p>{error}</p>
          <Link to="/" className="back-button">
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="search-container">
      <div className="search-header">
        <Link to="/" className="back-link">
          ← Back to Gallery
        </Link>
        <h1>Search Results</h1>
        <p className="search-info">
          Found <strong>{images.length}</strong> image{images.length !== 1 ? 's' : ''} with keyword: <strong>"{keyword}"</strong>
        </p>
      </div>

      {images.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No images found</h3>
          <p>No images contain the keyword "{keyword}"</p>
          <Link to="/" className="back-button">
            Back to Gallery
          </Link>
        </div>
      ) : (
        <div className="search-results">
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
                  <p className="image-date">
                    {new Date(image.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
