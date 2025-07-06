
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import ImageUpload from './components/ImageUpload';
import ImageGallery from './components/ImageGallery';
import ImageDetail from './components/ImageDetail';
import SearchResults from './components/SearchResults';
import GeneralSearchResults from './components/GeneralSearchResults';
import BatchProcessing from './components/BatchProcessing';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Header />
                <main className="main-content">
                  <ImageGallery />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/upload" element={
              <ProtectedRoute>
                <Header />
                <main className="main-content">
                  <ImageUpload />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/batch" element={
              <ProtectedRoute>
                <Header />
                <main className="main-content">
                  <BatchProcessing />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/image/:id" element={
              <ProtectedRoute>
                <Header />
                <main className="main-content">
                  <ImageDetail />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/search/:keyword" element={
              <ProtectedRoute>
                <Header />
                <main className="main-content">
                  <SearchResults />
                </main>
              </ProtectedRoute>
            } />
            <Route path="/search/general/:searchTerm" element={
              <ProtectedRoute>
                <Header />
                <main className="main-content">
                  <GeneralSearchResults />
                </main>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
