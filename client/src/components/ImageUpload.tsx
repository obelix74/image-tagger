import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { imageApi } from '../services/api';
import './ImageUpload.css';

const ImageUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const supportedFormats = ['JPG', 'JPEG', 'PNG', 'TIFF', 'TIF', 'CR2', 'NEF', 'ARW', 'DNG', 'RAF', 'ORF', 'RW2'];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    
    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toUpperCase();
    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      setError(`Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`);
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await imageApi.uploadImage(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.image) {
        setSuccess(`Image uploaded successfully! Processing started.`);
        setTimeout(() => {
          navigate(`/image/${response.image!.id}`);
        }, 2000);
      } else if (response.duplicate && response.existingImage) {
        setError(`This file has already been uploaded. Click here to view the existing image.`);
        setTimeout(() => {
          navigate(`/image/${response.existingImage!.id}`);
        }, 3000);
      } else {
        setError(response.error || 'Upload failed');
      }
    } catch (error: any) {
      // Handle duplicate file error (409 status)
      if (error.response?.status === 409 && error.response?.data?.duplicate) {
        const responseData = error.response.data;
        setError(`This file has already been uploaded. Redirecting to existing image...`);
        setTimeout(() => {
          navigate(`/image/${responseData.existingImage.id}`);
        }, 3000);
      } else {
        setError(error instanceof Error ? error.message : 'Upload failed');
      }
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
      }, 2000);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>Upload Image for AI Analysis</h2>
        <p>Upload your photos to get AI-generated descriptions, captions, and SEO keywords</p>
      </div>

      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.tiff,.tif,.cr2,.nef,.arw,.dng,.raf,.orf,.rw2"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="upload-progress">
            <div className="progress-circle">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path
                  className="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${uploadProgress}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="percentage">{uploadProgress}%</div>
            </div>
            <p>Uploading and processing...</p>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📸</div>
            <h3>Drop your image here or click to browse</h3>
            <p>Supports: {supportedFormats.join(', ')}</p>
            <p>Maximum file size: 50MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="message error">
          <span className="icon">❌</span>
          {error}
        </div>
      )}

      {success && (
        <div className="message success">
          <span className="icon">✅</span>
          {success}
        </div>
      )}

      <div className="upload-info">
        <h3>What happens next?</h3>
        <ul>
          <li>Your image will be uploaded and processed</li>
          <li>AI will analyze the content and generate descriptions</li>
          <li>You'll get SEO-optimized keywords and captions</li>
          <li>RAW files will have their preview extracted automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;
