import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { imageApi, type ImageMetadata } from '../services/api';
import SearchBox from './SearchBox';
import './SearchResults.css';

const GeneralSearchResults: React.FC = () => {
  const { searchTerm } = useParams<{ searchTerm: string }>();
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(searchTerm || '');

  useEffect(() => {
    if (searchTerm) {
      setCurrentSearchTerm(searchTerm);
      searchImages(searchTerm);
    }
  }, [searchTerm]);

  const searchImages = async (term: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await imageApi.searchImages(term);
      
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

  const handleNewSearch = async (newSearchTerm: string) => {
    if (newSearchTerm.trim()) {
      setCurrentSearchTerm(newSearchTerm);
      await searchImages(newSearchTerm);
      // Update URL without navigation
      window.history.pushState(null, '', `/search/general/${encodeURIComponent(newSearchTerm)}`);
    } else {
      // Clear search
      setImages([]);
      setCurrentSearchTerm('');
      setError(null);
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

  return (
    <div className="search-container">
      <div className="search-header">
        <Link to="/" className="back-link">
          ← Back to Gallery
        </Link>
        <h1>Search Images</h1>
        
        <div className="search-box-container">
          <SearchBox 
            onSearch={handleNewSearch}
            placeholder="Search images by name, description, keywords..."
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Searching for "{currentSearchTerm}"...</p>
        </div>
      ) : error ? (
        <div className="error">
          <span className="icon">❌</span>
          <p>{error}</p>
        </div>
      ) : currentSearchTerm && images.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No images found</h3>
          <p>No images match your search for "{currentSearchTerm}"</p>
          <p className="search-tips">
            <strong>Search tips:</strong>
            <br />• Try different keywords
            <br />• Check for typos
            <br />• Use broader terms
            <br />• Search for image names, descriptions, or keywords
          </p>
        </div>
      ) : currentSearchTerm ? (
        <div className="search-results">
          <div className="results-info">
            <p>
              Found <strong>{images.length}</strong> image{images.length !== 1 ? 's' : ''} 
              matching "<strong>{currentSearchTerm}</strong>"
            </p>
          </div>
          
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
      ) : (
        <div className="search-prompt">
          <div className="search-prompt-icon">🔍</div>
          <h3>Search your images</h3>
          <p>Enter a search term to find images by name, description, caption, or keywords</p>
        </div>
      )}
    </div>
  );
};

export default GeneralSearchResults;
