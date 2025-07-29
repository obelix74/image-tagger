import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { imageApi, type BatchJob, type BatchProcessingOptions } from '../services/api';
import PromptConfiguration from './PromptConfiguration';
import './BatchProcessing.css';

const BatchProcessing: React.FC = () => {
  const [folderPath, setFolderPath] = useState('');
  const [options, setOptions] = useState<BatchProcessingOptions>({
    skipDuplicates: true,
    thumbnailSize: 300,
    geminiImageSize: 1024,
    quality: 85,
    parallelConnections: 1,
    customPrompt: undefined
  });
  const [batches, setBatches] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'ollama'>('gemini');

  useEffect(() => {
    loadBatches();
    loadAIProvider();
    const interval = setInterval(loadBatches, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAIProvider = async () => {
    try {
      const response = await imageApi.getAIProviderInfo();
      if (response.success) {
        setAiProvider(response.provider);
      }
    } catch (error) {
      console.error('Failed to load AI provider info:', error);
    }
  };

  const getProviderDisplayName = (provider: 'gemini' | 'ollama'): string => {
    return provider === 'gemini' ? 'Gemini' : 'Ollama';
  };

  const loadBatches = async () => {
    try {
      const response = await imageApi.getAllBatches();
      if (response.success && response.batches) {
        setBatches(response.batches);
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
    }
  };

  const validateFolderPath = (path: string): string | null => {
    const trimmedPath = path.trim();

    if (!trimmedPath) {
      return 'Please enter a folder path';
    }

    // Basic path validation
    if (trimmedPath.length < 2) {
      return 'Path is too short';
    }

    // Check for invalid characters (basic validation)
    const invalidChars = /[<>"|?*]/;
    if (invalidChars.test(trimmedPath)) {
      return 'Path contains invalid characters';
    }

    return null;
  };

  const handleStartBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    const pathError = validateFolderPath(folderPath);
    if (pathError) {
      setError(pathError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log(`Starting batch processing for path: "${folderPath.trim()}"`);
      const response = await imageApi.startBatchProcessing(folderPath.trim(), options);

      if (response.success) {
        setSuccess(`Batch processing started! Batch ID: ${response.batchId}`);
        setFolderPath('');
        loadBatches();
      } else {
        setError(response.error || 'Failed to start batch processing');
      }
    } catch (error: any) {
      console.error('Batch processing error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to start batch processing';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      const response = await imageApi.deleteBatch(batchId);
      if (response.success) {
        loadBatches();
      } else {
        setError(response.error || 'Failed to delete batch');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Failed to delete batch');
    }
  };

  const handlePromptChange = (prompt: string) => {
    setOptions({...options, customPrompt: prompt});
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return '⏳';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return '#ffc107';
      case 'completed': return '#28a745';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  return (
    <div className="batch-container">
      <div className="batch-header">
        <Link to="/" className="back-link">
          ← Back to Gallery
        </Link>
        <h1>Batch Processing</h1>
        <p>Process multiple images from a folder recursively</p>
      </div>

      <div className="batch-form-section">
        <h2>Start New Batch</h2>
        <form onSubmit={handleStartBatch} className="batch-form">
          <div className="form-group">
            <label htmlFor="folderPath">Folder Path</label>
            <input
              id="folderPath"
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="/path/to/your/images/folder"
              className="folder-input"
              disabled={loading}
            />
            <small className="help-text">
              Enter the full path to the folder containing images. All subfolders will be processed recursively.
              <br />
              <strong>Note:</strong> Paths with spaces are supported (e.g., "/Users/john/My Photos/Vacation 2024").
              <br />
              <strong>Examples:</strong>
              <br />
              • macOS/Linux: <code>/Users/username/Pictures/My Photos</code>
              <br />
              • Windows: <code>C:\Users\username\Pictures\My Photos</code>
            </small>
          </div>

          <div className="options-grid">
            <div className="form-group">
              <label htmlFor="thumbnailSize">Thumbnail Size</label>
              <input
                id="thumbnailSize"
                type="number"
                value={options.thumbnailSize}
                onChange={(e) => setOptions({...options, thumbnailSize: parseInt(e.target.value)})}
                min="100"
                max="800"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="geminiImageSize">AI Analysis Size</label>
              <input
                id="geminiImageSize"
                type="number"
                value={options.geminiImageSize}
                onChange={(e) => setOptions({...options, geminiImageSize: parseInt(e.target.value)})}
                min="512"
                max="2048"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="quality">JPEG Quality</label>
              <input
                id="quality"
                type="number"
                value={options.quality}
                onChange={(e) => setOptions({...options, quality: parseInt(e.target.value)})}
                min="50"
                max="100"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="parallelConnections">
                Parallel {getProviderDisplayName(aiProvider)} Connections: {options.parallelConnections}
              </label>
              <input
                id="parallelConnections"
                type="range"
                min="1"
                max="10"
                value={options.parallelConnections}
                onChange={(e) => setOptions({...options, parallelConnections: parseInt(e.target.value)})}
                disabled={loading}
                className="slider"
              />
              <div className="slider-labels">
                <span>1 (Sequential)</span>
                <span>10 (Max Parallel)</span>
              </div>
              <small className="help-text">
                Higher values process images faster but may hit API rate limits.
                Start with 1 for reliability, increase gradually if needed.
              </small>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={options.skipDuplicates}
                  onChange={(e) => setOptions({...options, skipDuplicates: e.target.checked})}
                  disabled={loading}
                />
                Skip duplicate files
              </label>
            </div>
          </div>

          <PromptConfiguration 
            onPromptChange={handlePromptChange}
            currentPrompt={options.customPrompt}
          />

          <button
            type="submit"
            className="start-batch-button"
            disabled={loading || !folderPath.trim()}
          >
            {loading ? 'Starting...' : 'Start Batch Processing'}
          </button>
        </form>

        {error && (
          <div className="message error">
            <span className="icon">❌</span>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="message success">
            <span className="icon">✅</span>
            <p>{success}</p>
          </div>
        )}
      </div>

      <div className="batches-section">
        <h2>Batch History</h2>
        
        {batches.length === 0 ? (
          <div className="no-batches">
            <div className="no-batches-icon">📁</div>
            <h3>No batch jobs found</h3>
            <p>Start your first batch processing job above</p>
          </div>
        ) : (
          <div className="batches-list">
            {batches.map((batch) => (
              <div key={batch.id} className="batch-card">
                <div className="batch-header-row">
                  <div className="batch-info">
                    <h3 className="batch-title">
                      <span 
                        className="status-icon"
                        style={{ color: getStatusColor(batch.result.status) }}
                      >
                        {getStatusIcon(batch.result.status)}
                      </span>
                      {batch.folderPath}
                    </h3>
                    <p className="batch-meta">
                      Started: {new Date(batch.createdAt).toLocaleString()} • 
                      Duration: {formatDuration(batch.result.startTime, batch.result.endTime)}
                    </p>
                  </div>
                  
                  <div className="batch-actions">
                    {(batch.result.status === 'completed' || batch.result.status === 'error') && (
                      <button
                        onClick={() => handleDeleteBatch(batch.id)}
                        className="delete-button"
                        title="Delete batch"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                <div className="batch-progress">
                  <div className="progress-stats">
                    <div className="stat">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">{batch.result.totalFiles}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Processed:</span>
                      <span className="stat-value">{batch.result.processedFiles}</span>
                    </div>
                    <div className="stat success">
                      <span className="stat-label">Success:</span>
                      <span className="stat-value">{batch.result.successfulFiles}</span>
                    </div>
                    <div className="stat warning">
                      <span className="stat-label">Duplicates:</span>
                      <span className="stat-value">{batch.result.duplicateFiles}</span>
                    </div>
                    <div className="stat error">
                      <span className="stat-label">Errors:</span>
                      <span className="stat-value">{batch.result.errorFiles}</span>
                    </div>
                  </div>

                  {batch.result.totalFiles > 0 && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${(batch.result.processedFiles / batch.result.totalFiles) * 100}%`,
                          backgroundColor: getStatusColor(batch.result.status)
                        }}
                      ></div>
                    </div>
                  )}
                </div>

                {batch.result.errors.length > 0 && (
                  <details className="batch-errors">
                    <summary>View Errors ({batch.result.errors.length})</summary>
                    <div className="errors-list">
                      {batch.result.errors.map((error, index) => (
                        <div key={index} className="error-item">
                          <span className="error-type">[{error.type}]</span>
                          <span className="error-file">{error.file}</span>
                          <span className="error-message">{error.error}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchProcessing;
