import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SnippetsPage from './pages/SnippetsPage';
import SnippetDetail from './pages/SnippetDetail';
import SamplesPage from './pages/SamplesPage';
import VolumesPage from './pages/VolumesPage';
import NotFound from './pages/NotFound';
import './styles/index.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="snippets" element={<SnippetsPage />} />
            <Route path="snippets/:id" element={<SnippetDetail />} />
            <Route path="samples" element={<SamplesPage />} />
            <Route path="volumes" element={<VolumesPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;