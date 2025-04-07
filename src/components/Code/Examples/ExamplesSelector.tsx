// src/components/Code/Examples/ExamplesSelector.jsx
import React, {useState, useEffect, SetStateAction} from 'react';
import { toast } from 'react-hot-toast';
import { FaBook, FaChevronDown } from 'react-icons/fa';
import apiService from '../../../services/ApiService.js';
import ExampleItem from './ExampleItem.js';
import './ExamplesSelector.css';

const ExamplesSelector = ({ onSelectExample }:{onSelectExample: (example: any) => void} | any) => {
  type Example = {
    id: string;
    category: string;
    [key: string]: any;
  };

  const [examples, setExamples] = useState<Example[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchExamples();
  }, []);

  const fetchExamples = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getExamples();
      setExamples(data);
      
      // Extract unique categories
      if (data && data.map){
        const uniqueCategories:SetStateAction<string[]> = ['all', ...Array.from(new Set<string>(data.map(ex => ex.category)))];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      toast.error(`Failed to load examples: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Failed to load examples:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleSelect = async (id: string) => {
    try {
      const example = await apiService.getExample(id);
      if (onSelectExample) {
        onSelectExample(example);
      }
      setIsOpen(false);
    } catch (error) {
      toast.error(`Failed to load example: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const filteredExamples = selectedCategory === 'all' 
    ? Array.from(examples)
    : examples.filter(ex => ex.category === selectedCategory);

  return (
    <div className="examples-selector">
      <button 
        className="examples-dropdown-btn"
        onClick={toggleDropdown}
      >
        <FaBook /> Examples <FaChevronDown className={isOpen ? 'rotate' : ''} />
      </button>
      
      {isOpen && (
        <div className="examples-dropdown-menu">
          {isLoading ? (
            <div className="loading-examples">Loading examples...</div>
          ) : (
            <>
              <div className="category-filter">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'All Categories' : category}
                  </button>
                ))}
              </div>
              
              <ul className="examples-list">
                {filteredExamples.length > 0 ? (
                  filteredExamples.map(example => (
                    <ExampleItem
                      key={example.id}
                      example={example}
                      onSelect={() => handleExampleSelect(example.id)}
                    />
                  ))
                ) : (
                  <li className="no-examples">No examples found</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamplesSelector;