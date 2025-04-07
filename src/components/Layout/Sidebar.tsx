import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaHome, 
  FaCode, 
  FaDatabase, 
  FaMusic,
  FaCog
} from 'react-icons/fa';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
  const { sidebarOpen } = useApp();

  // Navigation items
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <FaHome size={20} /> },
    { path: '/snippets', label: 'Code Snippets', icon: <FaCode size={20} /> },
    { path: '/samples', label: 'Sample Library', icon: <FaMusic size={20} /> },
    { path: '/volumes', label: 'Volumes', icon: <FaDatabase size={20} /> },
  ];

  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 bg-gray-800 text-white fixed inset-y-0 left-0 mt-16 z-10 overflow-y-auto transition-all duration-300">
      <nav className="mt-5 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 mt-2 text-sm rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`
            }
          >
            <span className="mr-3">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-6 mt-6 border-t border-gray-700">
        <div className="flex items-center px-4 py-3 text-sm text-gray-300">
          <span className="mr-3">
            <FaCog size={20} />
          </span>
          <span>Settings</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;