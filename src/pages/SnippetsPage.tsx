import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FaPlus, FaSearch, FaPlay, FaTags, FaEdit, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import SnippetModal from '../components/SnippetModal';

const SnippetsPage = () => {
  const queryClient = useQueryClient();
  const { executeSnippet } = useApp();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Fetch snippets
  const { data: snippets, isLoading } = useQuery(
    ['snippets', search, selectedTag],
    () => api.getSnippets({ search, tag: selectedTag }),
    {
      keepPreviousData: true,
    }
  );
  
  // Fetch all unique tags for filter dropdown
  const { data: allSnippets } = useQuery('allSnippets', () => api.getSnippets());
  
  const allTags = React.useMemo(() => {
    if (!allSnippets) return [];
    const tags = new Set();
    allSnippets.forEach(snippet => {
      if (snippet.tags) {
        snippet.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [allSnippets]);
  
  // Delete snippet mutation
  const deleteMutation = useMutation(
    (id) => api.deleteSnippet(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('snippets');
        queryClient.invalidateQueries('allSnippets');
        toast.success('Snippet deleted successfully');
      },
    }
  );
  
  // Handle delete snippet
  const handleDeleteSnippet = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this snippet?')) {
      deleteMutation.mutate(id);
    }
  };
  
  // Handle run snippet
  const handleRunSnippet = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await executeSnippet(id);
    } catch (error) {
      // Error is handled by executeSnippet
    }
  };
  
  // Handle edit snippet
  const handleEditSnippet = (snippet, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedSnippet(snippet);
    setIsModalOpen(true);
  };
  
  // Handle create new snippet
  const handleCreateSnippet = () => {
    setSelectedSnippet(null);
    setIsModalOpen(true);
  };
  
  // Handle modal close
  const handleModalClose = (refresh = false) => {
    setIsModalOpen(false);
    setSelectedSnippet(null);
    
    if (refresh) {
      queryClient.invalidateQueries('snippets');
      queryClient.invalidateQueries('allSnippets');
    }
  };
  
  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Code Snippets</h1>
        <button
          onClick={handleCreateSnippet}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          <FaPlus className="mr-2" />
          New Snippet
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search snippets..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="w-full md:w-64">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaTags className="text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Snippets List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : snippets?.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No snippets found</p>
            <button
              onClick={handleCreateSnippet}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Create your first snippet
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {snippets?.map((snippet) => (
              <Link
                key={snippet.id}
                to={`/snippets/${snippet.id}`}
                className="block hover:bg-gray-50 transition-colors"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-800 mb-1">{snippet.name}</h2>
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {snippet.description || 'No description'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {snippet.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ml-4 flex space-x-2">
                      <button
                        onClick={(e) => handleRunSnippet(snippet.id, e)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-full"
                        title="Run snippet"
                      >
                        <FaPlay />
                      </button>
                      <button
                        onClick={(e) => handleEditSnippet(snippet, e)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                        title="Edit snippet"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSnippet(snippet.id, e)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-full"
                        title="Delete snippet"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Create/Edit Modal */}
      {isModalOpen && (
        <SnippetModal
          snippet={selectedSnippet}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default SnippetsPage;
  