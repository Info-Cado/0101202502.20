import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DesignInputDialogProps {
  onSubmit: (designNumber: string, category: string) => void;
  onClose: () => void;
}

export const DesignInputDialog: React.FC<DesignInputDialogProps> = ({
  onSubmit,
  onClose,
}) => {
  const [designNumber, setDesignNumber] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('designs')
        .select('category')
        .not('category', 'is', null);
      
      const uniqueCategories = new Set(data?.map(d => d.category).filter(Boolean));
      setCategories(Array.from(uniqueCategories).sort());
    };

    fetchCategories();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const category = isAddingCategory ? newCategory : selectedCategory;
    if (!designNumber || !category) {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Please fill in all fields';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      return;
    }
    onSubmit(designNumber, category);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add New Design</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Design Number
            </label>
            <input
              type="text"
              value={designNumber}
              onChange={(e) => setDesignNumber(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Enter design number"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                {isAddingCategory ? 'Select Existing' : 'Add New'}
              </button>
            </div>

            {isAddingCategory ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Enter new category"
                />
              </div>
            ) : (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-lg"
            >
              Add Design
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
