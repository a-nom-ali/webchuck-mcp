import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FaSearch, FaPlay, FaPause, FaTags, FaTrash, FaFilter } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import WaveSurfer from 'wavesurfer.js';

const SamplesPage = () => {
  const queryClient = useQueryClient();
  const { loadSampleToChucK } = useApp();
  const [search, setSearch] = useState('');
  const [selectedVolume, setSelectedVolume] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [playingSample, setPlayingSample] = useState(null);
  const [waveSurfer, setWaveSurfer] = useState(null);
  const waveformRef = useRef(null);
  const audioRef = useRef(new Audio());
  
  // Fetch volumes for filter dropdown
  const { data: volumes } = useQuery('volumes', api.getVolumes, {
    refetchOnWindowFocus: false,
  });
  
  // Fetch samples
  const { data: samplesData, isLoading } = useQuery(
    ['samples', selectedVolume, selectedTag, search, page, limit],
    () => api.getSamples({
      volume_id: selectedVolume || undefined,
      tag: selectedTag || undefined,
      search: search || undefined,
      limit,
      offset: (page - 1) * limit,
    }),
    {
      keepPreviousData: true,
    }
  );
  
  // Fetch all unique tags for filter
  const { data: allSamplesData } = useQuery(['allSampleTags'], () => api.getSamples({ limit: 999999 }), {
    enabled: false, // Don't auto-fetch this, it could be very large
  });
  
  const samples = samplesData?.samples || [];
  const totalSamples = samplesData?.pagination?.total || 0;
  const totalPages = Math.ceil(totalSamples / limit);
  
  // Extract all unique tags from samples
  const allTags = React.useMemo(() => {
    if (!allSamplesData?.samples) return [];
    const tags = new Set();
    allSamplesData.samples.forEach(sample => {
      if (sample.tags) {
        sample.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [allSamplesData]);
  
  // Delete sample mutation
  const deleteMutation = useMutation(
    (id) => api.deleteSample(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('samples');
        toast.success('Sample deleted successfully');
      },
    }
  );
  
  // Handle delete sample
  const handleDeleteSample = (id) => {
    if (window.confirm('Are you sure you want to delete this sample?')) {
      deleteMutation.mutate(id);
    }
  };
  
  // Handle play sample
  const handlePlaySample = (sample) => {
    if (playingSample?.id === sample.id) {
      // Toggle play/pause
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      return;
    }
    
    // Stop current playback
    audioRef.current.pause();
    
    // Create new audio player
    const sampleUrl = api.getSampleFileUrl(sample.id);
    audioRef.current.src = sampleUrl;
    audioRef.current.play();
    
    setPlayingSample(sample);
    
    // Create waveform if not exists
    if (!waveSurfer && waveformRef.current) {
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4f46e5',
        progressColor: '#818cf8',
        cursorColor: '#4f46e5',
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 1,
        height: 80,
        barGap: 2,
        responsive: true,
      });
      
      ws.load(sampleUrl);
      setWaveSurfer(ws);
      
      // When playback ends
      audioRef.current.onended = () => {
        ws.seekTo(0);
        setPlayingSample(prev => prev ? { ...prev, isPlaying: false } : null);
      };
    } else if (waveSurfer) {
      waveSurfer.load(sampleUrl);
    }
  };
  
  // Handle load sample into ChucK
  const handleLoadSampleToChucK = async (sample) => {
    try {
      await loadSampleToChucK(sample.id);
    } catch (error) {
      // Error is handled by loadSampleToChucK
    }
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };
  
  // Clear filters
  const handleClearFilters = () => {
    setSearch('');
    setSelectedVolume('');
    setSelectedTag('');
    setPage(1);
  };
  
  return (
    <div className="py-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Sample Library</h1>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search samples..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="w-full md:w-64">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaFilter className="text-gray-400" />
              </div>
              <select
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedVolume}
                onChange={(e) => setSelectedVolume(e.target.value)}
              >
                <option value="">All Volumes</option>
                {volumes?.map((volume) => (
                  <option key={volume.id} value={volume.id}>
                    {volume.name}
                  </option>
                ))}
              </select>
            </div>
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
        
        <div className="flex justify-end">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Currently Playing */}
      {playingSample && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Now Playing: {playingSample.filename}</h3>
            <button
              onClick={() => {
                audioRef.current.pause();
                setPlayingSample(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
          <div ref={waveformRef} className="w-full h-20"></div>
        </div>
      )}
      
      {/* Samples List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : samples.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No samples found</p>
            {(search || selectedVolume || selectedTag) && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {samples.map((sample) => (
                  <tr key={sample.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sample.filename}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{sample.relative_path}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{sample.volume_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {sample.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handlePlaySample(sample)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title={playingSample?.id === sample.id ? 'Pause' : 'Play'}
                        >
                          {playingSample?.id === sample.id && !audioRef.current.paused ? (
                            <FaPause />
                          ) : (
                            <FaPlay />
                          )}
                        </button>
                        <button
                          onClick={() => handleLoadSampleToChucK(sample)}
                          className="text-green-600 hover:text-green-900"
                          title="Load into ChucK"
                        >
                          <FaMusic />
                        </button>
                        <button
                          onClick={() => handleDeleteSample(sample.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete sample"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(page * limit, totalSamples)}
            </span>{' '}
            of <span className="font-medium">{totalSamples}</span> samples
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`px-4 py-2 border rounded-md ${
                page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className={`px-4 py-2 border rounded-md ${
                page === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SamplesPage;