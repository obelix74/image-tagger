import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { imageApi, type ImageMetadata, type GeminiAnalysis } from '../services/api';
import './ImageDetail.css';

const ImageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [image, setImage] = useState<ImageMetadata | null>(null);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadImageData(parseInt(id));
    }
  }, [id]);

  const loadImageData = async (imageId: number) => {
    try {
      setLoading(true);
      setError(null);

      // Load image metadata
      const imageResponse = await imageApi.getImage(imageId);
      if (imageResponse.success && imageResponse.image) {
        setImage(imageResponse.image);

        // Try to load analysis if image is completed
        if (imageResponse.image.status === 'completed') {
          try {
            const analysisResponse = await imageApi.getAnalysis(imageId);
            if (analysisResponse.success && analysisResponse.analysis) {
              setAnalysis(analysisResponse.analysis);
            }
          } catch (analysisError) {
            console.warn('Analysis not available yet');
          }
        }
      } else {
        setError(imageResponse.error || 'Image not found');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    try {
      setAnalysisLoading(true);
      const response = await imageApi.analyzeImage(image.id!);
      
      if (response.success) {
        // Reload image data to get updated status
        await loadImageData(image.id!);
      } else {
        setError(response.error || 'Failed to start analysis');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return '#ffc107';
      case 'processing': return '#17a2b8';
      case 'completed': return '#28a745';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="detail-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading image details...</p>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="detail-container">
        <div className="error">
          <span className="icon">❌</span>
          <p>{error || 'Image not found'}</p>
          <Link to="/" className="back-button">
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <div className="detail-header">
        <Link to="/" className="back-link">
          ← Back to Gallery
        </Link>
        <h1>{image.originalName}</h1>
      </div>

      <div className="detail-content">
        <div className="image-section">
          <div className="image-display">
            <img
              src={imageApi.getImageUrl(image.filePath)}
              alt={image.originalName}
            />
          </div>
          
          <div className="image-metadata">
            <h3>Image Information</h3>
            <div className="metadata-grid">
              <div className="metadata-item">
                <label>Status:</label>
                <span 
                  className="status-indicator"
                  style={{ color: getStatusColor(image.status) }}
                >
                  {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
                </span>
              </div>
              <div className="metadata-item">
                <label>File Size:</label>
                <span>{formatFileSize(image.fileSize)}</span>
              </div>
              {image.width && image.height && (
                <div className="metadata-item">
                  <label>Dimensions:</label>
                  <span>{image.width} × {image.height} pixels</span>
                </div>
              )}
              <div className="metadata-item">
                <label>Format:</label>
                <span>{image.mimeType}</span>
              </div>
              <div className="metadata-item">
                <label>Uploaded:</label>
                <span>{formatDate(image.uploadedAt)}</span>
              </div>
              {image.processedAt && (
                <div className="metadata-item">
                  <label>Processed:</label>
                  <span>{formatDate(image.processedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="analysis-section">
          <div className="analysis-header">
            <h3>AI Analysis</h3>
            {image.status !== 'completed' && (
              <button
                onClick={handleAnalyze}
                disabled={analysisLoading || image.status === 'processing'}
                className="analyze-button"
              >
                {analysisLoading ? 'Starting...' : 
                 image.status === 'processing' ? 'Processing...' : 
                 'Analyze with AI'}
              </button>
            )}
          </div>

          {image.status === 'processing' && (
            <div className="processing-indicator">
              <div className="spinner small"></div>
              <p>AI is analyzing your image...</p>
            </div>
          )}

          {image.status === 'error' && (
            <div className="error-message">
              <span className="icon">❌</span>
              <p>{image.errorMessage || 'Analysis failed'}</p>
              <button onClick={handleAnalyze} className="retry-button">
                Retry Analysis
              </button>
            </div>
          )}

          {analysis && (
            <div className="analysis-results">
              <div className="analysis-item">
                <div className="analysis-label">
                  <h4>Description</h4>
                  <button
                    onClick={() => copyToClipboard(analysis.description)}
                    className="copy-button"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
                <p className="description">{analysis.description}</p>
              </div>

              <div className="analysis-item">
                <div className="analysis-label">
                  <h4>Caption</h4>
                  <button
                    onClick={() => copyToClipboard(analysis.caption)}
                    className="copy-button"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
                <p className="caption">{analysis.caption}</p>
              </div>

              <div className="analysis-item">
                <div className="analysis-label">
                  <h4>SEO Keywords</h4>
                  <button
                    onClick={() => copyToClipboard(analysis.keywords.join(', '))}
                    className="copy-button"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
                <div className="keywords">
                  {analysis.keywords.map((keyword, index) => (
                    <span key={index} className="keyword-tag">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {analysis.confidence && (
                <div className="confidence-indicator">
                  <label>AI Confidence:</label>
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill"
                      style={{ width: `${analysis.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span>{Math.round(analysis.confidence * 100)}%</span>
                </div>
              )}

              <div className="analysis-date">
                <small>Analyzed on {formatDate(analysis.analysisDate)}</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageDetail;
