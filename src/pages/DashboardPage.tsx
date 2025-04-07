import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FaCode, FaMusic, FaDatabase, FaPlayCircle } from 'react-icons/fa';
import api from '../services/api';
import { useApp } from '../context/AppContext';

const Dashboard = () => {
  const { chuckSession } = useApp();
  
  // Fetch statistics
  const { data: snippets } = useQuery('snippets', () => api.getSnippets({ limit: 5 }), {
    refetchOnWindowFocus: false,
  });
  
  const { data: samples } = useQuery('sampleCount', () => api.getSamples({ limit: 1 }), {
    refetchOnWindowFocus: false,
  });
  
  const { data: volumes } = useQuery('volumes', api.getVolumes, {
    refetchOnWindowFocus: false,
  });
  
  // Calculate statistics
  const snippetCount = snippets?.length || 0;
  const sampleCount = samples?.pagination?.total || 0;
  const volumeCount = volumes?.length || 0;
  
  const stats = [
    {
      name: 'Code Snippets',
      value: snippetCount,
      icon: <FaCode size={24} className="text-blue-500" />,
      link: '/snippets',
      color: 'bg-blue-100 border-blue-300',
    },
    {
      name: 'Samples',
      value: sampleCount,
      icon: <FaMusic size={24} className="text-green-500" />,
      link: '/samples',
      color: 'bg-green-100 border-green-300',
    },
    {
      name: 'Volumes',
      value: volumeCount,
      icon: <FaDatabase size={24} className="text-purple-500" />,
      link: '/volumes',
      color: 'bg-purple-100 border-purple-300',
    },
  ];
  
  return (
    <div className="py-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      {/* Status Card */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md border-l-4 border-indigo-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">ChucK Session Status</h2>
            <p className="text-gray-600">
              {chuckSession 
                ? 'ChucK session is active and ready for execution' 
                : 'No active ChucK session found'}
            </p>
          </div>
          <div className={`p-4 rounded-full ${chuckSession ? 'bg-green-100' : 'bg-red-100'}`}>
            <FaPlayCircle size={32} className={chuckSession ? 'text-green-500' : 'text-red-500'} />
          </div>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <Link 
            key={stat.name} 
            to={stat.link}
            className={`${stat.color} border p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold mt-1">{stat.value}</p>
              </div>
              <div className="p-3 rounded-full bg-white shadow-sm">
                {stat.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Recent Snippets */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Code Snippets</h2>
        {snippets && snippets.length > 0 ? (
          <div className="space-y-2">
            {snippets.map((snippet) => (
              <Link 
                key={snippet.id} 
                to={`/snippets/${snippet.id}`}
                className="block p-3 rounded-md hover:bg-gray-50 border-l-4 border-blue-300"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{snippet.name}</p>
                    <p className="text-sm text-gray-500 truncate">{snippet.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {snippet.tags && snippet.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No snippets found</p>
        )}
        <div className="mt-4 text-right">
          <Link 
            to="/snippets" 
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            View all snippets →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;