
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ImageUpload from './components/ImageUpload';
import ImageGallery from './components/ImageGallery';
import ImageDetail from './components/ImageDetail';
import SearchResults from './components/SearchResults';
import GeneralSearchResults from './components/GeneralSearchResults';
import BatchProcessing from './components/BatchProcessing';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ImageGallery />} />
            <Route path="/upload" element={<ImageUpload />} />
            <Route path="/batch" element={<BatchProcessing />} />
            <Route path="/image/:id" element={<ImageDetail />} />
            <Route path="/search/:keyword" element={<SearchResults />} />
            <Route path="/search/general/:searchTerm" element={<GeneralSearchResults />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
