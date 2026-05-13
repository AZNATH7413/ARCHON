'use client';

import React, { useState } from 'react';
import { Category } from '../services/api';

interface SearchFormProps {
  categories: Category[];
  onSearch: (task: string, category: string) => void;
  loading: boolean;
}

export default function SearchForm({ categories, onSearch, loading }: SearchFormProps) {
  const [task, setTask] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim()) {
      onSearch(task, category);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative bg-[#1e1f2e] rounded-2xl border border-[#3b3d54] p-2 flex flex-col md:flex-row gap-2 shadow-lg transition-all focus-within:border-[#9d4edd] focus-within:shadow-[0_0_15px_rgba(157,78,221,0.15)]">
        
        <div className="flex-grow flex items-center px-4 py-3">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Ask me anything about AI models..."
            className="w-full bg-transparent border-none outline-none text-[#e1e1e1] placeholder-[#6b7280] text-lg font-medium"
            disabled={loading}
          />
        </div>

        <div className="h-px md:h-auto md:w-px bg-[#2a2b3d] mx-2"></div>

        <div className="flex flex-col md:flex-row gap-2 shrink-0">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-3 md:py-0 bg-transparent border-none outline-none text-[#9ca3af] cursor-pointer hover:text-[#e1e1e1] transition-colors font-medium text-sm appearance-none min-w-[140px]"
            disabled={loading}
          >
            <option value="" className="bg-[#1e1f2e] text-[#e1e1e1]">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name} className="bg-[#1e1f2e] text-[#e1e1e1]">
                {cat.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!task.trim() || loading}
            className="px-6 py-3 bg-[#e1e1e1] hover:bg-white text-[#0a0e27] font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#0a0e27]/30 border-t-[#0a0e27] rounded-full animate-spin"></div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
