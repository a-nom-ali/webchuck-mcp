import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FaPlay, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import SnippetModal from '../components/SnippetModal';

// Monaco editor setup
import * as monaco from 'monaco-editor';
import Editor from '@monaco-editor/react';

const SnippetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { executeSnippet } = useApp();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Fetch snippet details
  const { data: snippet, isLoading, isError } = useQuery(
    ['snippet', id],
    () => api.getSnippet(id),
    {
      onError: () => {
        toast.error('Failed to load snippet');
      },
    }
  );
  
  // Handle execute snippet
  const handleExecute = async () => {
    try {
      await executeSnippet(id);
    } catch (error) {
      // Error is handled by executeSnippet
    }
  };
  
  // Handle delete snippet
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this snippet?')) {
      return;
    }
    
    try {
      await api.deleteSnippet(id);
      toast.success('Snippet deleted successfully');
      navigate('/snippets');
    } catch (error) {
      toast.error('Failed to delete snippet');
    }
  };
  
  // Handle edit modal close
  const handleEditModalClose = (refresh = false) => {
    setIsEditModalOpen(false);
    
    if (refresh) {
      // Refetch snippet details
      // The react-query cache will automatically refetch the data
    }
  };
  
  // Editor options
  const editorOptions = {
    selectOnLineNumbers: true,
    readOnly: true,
    cursorStyle: 'line',
    automaticLayout: true,
    minimap: { enabled: true },
  };
  
  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (isError || !snippet) {
    return (
      <div className="py-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Snippet</h1>
        <p className="mb-4">The snippet could not be loaded or does not exist.</p>
        <Link
          to="/snippets"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-flex items-center"
        >
          <FaArrowLeft className="mr-2" /> Back to Snippets
        </Link>
      </div>
    );
  }
  
  return (
    <div className="py-6">
      <div className="mb-6 flex justify-between items-center">
        <Link
          to="/snippets"
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          <FaArrowLeft className="mr-2" /> Back to Snippets
        </Link>
        
        <div className="flex space-x-2">
          <button
            onClick={handleExecute}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <FaPlay className="mr-2" /> Run
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <FaEdit className="mr-2" /> Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
          >
            <FaTrash className="mr-2" /> Delete
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{snippet.name}</h1>
          
          {snippet.description && (
            <p className="text-lg text-gray-600 mb-4">{snippet.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2 mb-6">
            {snippet.tags?.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="border border-gray-300 rounded-md h-96 mb-4">
            <Editor
              height="100%"
              language="csharp" // Use C# language mode for ChucK
              value={snippet.code}
              options={editorOptions}
            />
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Created: {new Date(snippet.created_at).toLocaleString()}</p>
            {snippet.updated_at && (
              <p>Last updated: {new Date(snippet.updated_at).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
      
      {isEditModalOpen && (
        <SnippetModal snippet={snippet} onClose={handleEditModalClose} />
      )}
    </div>
  );
};

export default SnippetDetail;