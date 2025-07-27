import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { imageApi, type Collection } from '../services/api';
import './Collections.css';

const Collections: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    type: 'manual' as const
  });

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const response = await imageApi.getAllCollections();
      if (response.success && response.collections) {
        setCollections(response.collections);
      } else {
        setError(response.error || 'Failed to load collections');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await imageApi.createCollection(newCollection);
      if (response.success) {
        setNewCollection({ name: '', description: '', type: 'manual' });
        setShowCreateForm(false);
        loadCollections();
      } else {
        setError(response.error || 'Failed to create collection');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create collection');
    }
  };

  const handleDeleteCollection = async (id: number) => {
    if (!confirm('Are you sure you want to delete this collection?')) {
      return;
    }

    try {
      const response = await imageApi.deleteCollection(id);
      if (response.success) {
        loadCollections();
      } else {
        setError(response.error || 'Failed to delete collection');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete collection');
    }
  };

  const handleSetupDefaults = async () => {
    try {
      const response = await imageApi.setupDefaultCollections();
      if (response.success) {
        loadCollections();
      } else {
        setError(response.error || 'Failed to setup default collections');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to setup default collections');
    }
  };

  const handleAutoOrganize = async () => {
    try {
      const response = await imageApi.autoOrganizeImages();
      if (response.success) {
        loadCollections();
        alert('Images have been auto-organized into collections!');
      } else {
        setError(response.error || 'Failed to auto-organize images');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to auto-organize images');
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
      case 'manual': return 'Manual';
      case 'smart': return 'Smart';
      case 'keyword': return 'Keyword';
      case 'location': return 'Location';
      case 'camera': return 'Camera';
      case 'date': return 'Date';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="collections-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="collections-container">
      <div className="collections-header">
        <div className="header-left">
          <Link to="/" className="back-link">← Back to Gallery</Link>
          <h1>Collections</h1>
        </div>
        <div className="header-actions">
          <button onClick={handleSetupDefaults} className="setup-button">
            Setup Default Collections
          </button>
          <button onClick={handleAutoOrganize} className="auto-organize-button">
            Auto-Organize Images
          </button>
          <button 
            onClick={() => setShowCreateForm(true)} 
            className="create-button"
          >
            + Create Collection
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="icon">❌</span>
          <p>{error}</p>
          <button onClick={() => setError(null)} className="dismiss-button">
            Dismiss
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className="create-form-overlay">
          <div className="create-form">
            <h3>Create New Collection</h3>
            <form onSubmit={handleCreateCollection}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={newCollection.name}
                  onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="type">Type</label>
                <select
                  id="type"
                  value={newCollection.type}
                  onChange={(e) => setNewCollection({ ...newCollection, type: e.target.value as any })}
                >
                  <option value="manual">Manual</option>
                  <option value="smart">Smart</option>
                  <option value="keyword">Keyword</option>
                  <option value="location">Location</option>
                  <option value="camera">Camera</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="collections-grid">
        {collections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No Collections Yet</h3>
            <p>Create your first collection or setup default collections to get started.</p>
            <button onClick={handleSetupDefaults} className="setup-button">
              Setup Default Collections
            </button>
          </div>
        ) : (
          collections.map((collection) => (
            <div key={collection.id} className="collection-card">
              <div className="collection-header">
                <div className="collection-icon">
                  {getCollectionTypeIcon(collection.type)}
                </div>
                <div className="collection-info">
                  <h3>{collection.name}</h3>
                  <span className="collection-type">
                    {getCollectionTypeLabel(collection.type)}
                  </span>
                </div>
                <div className="collection-actions">
                  <button 
                    onClick={() => handleDeleteCollection(collection.id!)}
                    className="delete-button"
                    title="Delete collection"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {collection.description && (
                <p className="collection-description">{collection.description}</p>
              )}
              
              <div className="collection-stats">
                <span className="image-count">
                  {collection.imageCount || 0} images
                </span>
                <span className="date-updated">
                  Updated {new Date(collection.updatedAt).toLocaleDateString()}
                </span>
              </div>
              
              <Link 
                to={`/collections/${collection.id}`}
                className="view-collection-button"
              >
                View Collection →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Collections;