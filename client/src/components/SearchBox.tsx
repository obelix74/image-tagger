import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBox.css';

interface SearchBoxProps {
  onSearch?: (searchTerm: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({ 
  onSearch, 
  placeholder = "Search images by name, description, keywords...",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) return;

    setIsSearching(true);
    
    try {
      if (onSearch) {
        // If onSearch prop is provided, use it (for inline search)
        await onSearch(trimmedTerm);
      } else {
        // Otherwise, navigate to search results page
        navigate(`/search/general/${encodeURIComponent(trimmedTerm)}`);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
    if (onSearch) {
      onSearch(''); // Clear search results
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className={`search-box ${className}`}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <div className="search-icon">
            {isSearching ? (
              <div className="search-spinner"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            )}
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="search-input"
            disabled={isSearching}
          />
          
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              title="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        
        <button
          type="submit"
          className="search-button"
          disabled={!searchTerm.trim() || isSearching}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>
    </div>
  );
};

export default SearchBox;
