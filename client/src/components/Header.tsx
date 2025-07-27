import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import './Header.css';

const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>{t('header.title')}</h1>
          <span className="subtitle">{t('header.subtitle')}</span>
        </div>

        <nav className="navigation">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            {t('header.gallery')}
          </Link>
          <Link
            to="/upload"
            className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}
          >
            {t('header.upload')}
          </Link>
          <Link
            to="/collections"
            className={`nav-link ${location.pathname.startsWith('/collections') ? 'active' : ''}`}
          >
            {t('header.collections')}
          </Link>
        </nav>

        <div className="header-actions">
          <LanguageSelector />
          
          {user && (
          <div className="user-menu">
            <button
              className="user-button"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar-placeholder">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user.name}</span>
              <svg className="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-info">
                  <div className="user-username">@{user.username}</div>
                  {user.email && <div className="user-email">{user.email}</div>}
                  {user.isAdmin && <div className="admin-badge">Admin</div>}
                </div>
                <button className="logout-button" onClick={handleLogout}>
                  {t('header.logout')}
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
