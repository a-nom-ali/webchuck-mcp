import React from 'react';
import { Link } from 'react-router-dom';
import { FaBars, FaCode, FaWaveSquare } from 'react-icons/fa';
import { useApp } from '../context/AppContext';

const Navbar = () => {
  const { sidebarOpen, setSidebarOpen, chuckSession } = useApp();

  return (
    <nav className="bg-indigo-700 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-indigo-200 hover:text-white focus:outline-none"
            >
              <FaBars size={24} />
            </button>
            
            <Link to="/" className="ml-4 flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <FaWaveSquare size={24} />
                <span className="text-xl font-bold">ChucK Library</span>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {chuckSession ? (
              <div className="px-3 py-1 rounded bg-green-600 text-white text-sm">
                ChucK Session Active
              </div>
            ) : (
              <div className="px-3 py-1 rounded bg-red-600 text-white text-sm">
                No ChucK Session
              </div>
            )}
            
            <Link
              to="/snippets"
              className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-indigo-600"
            >
              <FaCode />
              <span>Code Library</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;