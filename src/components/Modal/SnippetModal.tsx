import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { FaTimes, FaSave, FaPlus, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';

// Monaco editor setup
import * as monaco from 'monaco-editor';
import Editor from '@monaco-editor/react';

const SnippetModal = ({ snippet, onClose }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const isEditing = !!snippet;

  // Initialize form with snippet data if editing
  useEffect(() => {
    if (snippet) {
      setName(snippet.name || '');
      setDescription(snippet.description || '');
      setCode(snippet.code || '');
      setTags(snippet.tags || []);
    }
  }, [snippet]);

  // Create snippet mutation
  const createMutation = useMutation(
    (data) => api.createSnippet(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('snippets');
        toast.success('Snippet created successfully');
        onClose(true);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create snippet');
      },
    }
  );

  // Update snippet mutation
  const updateMutation = useMutation(
    ({ id, data }) => api.updateSnippet(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('snippets');
        toast.success('Snippet updated successfully');
        onClose(true);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update snippet');
      },
    }
  );

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      name,
      code,
      description,
      tags,
    };

    if (isEditing) {
      updateMutation.mutate({ id: snippet.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle adding a tag
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (tags.includes(newTag.trim())) {
      toast.error('Tag already exists');
      return;
    }
    setTags([...tags, newTag.trim()]);
    setNewTag('');
  };

  // Handle removing a tag
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Handle key press in tag input
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Editor options
  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    minimap: { enabled: false },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Snippet' : 'Create Snippet'}
          </h2>
          <button
            onClick={() => onClose()}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Add a tag..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                >
                  <FaPlus className="mr-1" /> Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full flex items-center"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code *
              </label>
              <div className="border border-gray-300 rounded-md h-96">
                <Editor
                  height="100%"
                  language="csharp" // Use C# language mode for ChucK
                  value={code}
                  options={editorOptions}
                  onChange={(value) => setCode(value)}
                />
              </div>
            </div>
          </div>
        </form>

        <div className="p-4 border-t flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => onClose()}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
            disabled={createMutation.isLoading || updateMutation.isLoading}
          >
            <FaSave className="mr-2" />
            {createMutation.isLoading || updateMutation.isLoading
              ? 'Saving...'
              : 'Save Snippet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SnippetModal;