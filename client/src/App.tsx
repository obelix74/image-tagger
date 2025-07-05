
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import ImageUpload from './components/ImageUpload';
import ImageGallery from './components/ImageGallery';
import ImageDetail from './components/ImageDetail';
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
            <Route path="/image/:id" element={<ImageDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
