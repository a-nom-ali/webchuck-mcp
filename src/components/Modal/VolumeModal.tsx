import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { FaTimes, FaSave, FaFolder } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';

const VolumeModal = ({ volume, onClose }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [physicalPath, setPhysicalPath] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('filesystem');
  const [isActive, setIsActive] = useState(true);
  const isEditing = !!volume;

  // Initialize form with volume data if editing
  useEffect(() => {
    if (volume) {
      setName(volume.name || '');
      setPhysicalPath(volume.physical_path || '');
      setDescription(volume.description || '');
      setType(volume.type || 'filesystem');
      setIsActive(!!volume.is_active);
    }
  }, [volume]);

  // Create volume mutation
  const createMutation = useMutation(
    (data) => api.createVolume(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('volumes');
        toast.success('Volume created successfully');
        onClose(true);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create volume');
      },
    }
  );

  // Update volume mutation
  const updateMutation = useMutation(
    ({ id, data }) => api.updateVolume(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('volumes');
        toast.success('Volume updated successfully');
        onClose(true);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update volume');
      },
    }
  );

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      name,
      physical_path: physicalPath,
      description,
      type,
      is_active: isActive,
    };

    if (isEditing) {
      updateMutation.mutate({ id: volume.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Volume' : 'Create Volume'}
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
              <p className="mt-1 text-xs text-gray-500">
                A unique name for this volume
              </p>
            </div>

            {/* Physical Path */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Physical Path *
              </label>
              <div className="flex">
                <input
                  type="text"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  value={physicalPath}
                  onChange={(e) => setPhysicalPath(e.target.value)}
                />
                <button
                  type="button"
                  className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  title="Browse for folder (not implemented in this demo)"
                >
                  <FaFolder />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                The server-side path to the folder containing audio samples
              </p>
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

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="filesystem">Filesystem</option>
                <option value="browser_recorded">Browser Recorded</option>
              </select>
            </div>

            {/* Is Active */}
            {isEditing && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
            )}
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
              : 'Save Volume'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VolumeModal;