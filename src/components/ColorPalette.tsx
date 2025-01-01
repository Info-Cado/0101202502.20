import React, { useState, useEffect, useRef } from 'react';
import { supabase, getColors, addColor, updateColor, deleteColor } from '../lib/supabase';
import { SavedColor } from '../types/color';
import { Plus, Search, Pencil, Trash2, GripHorizontal } from 'lucide-react';
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ColorPaletteProps {
  onColorSelect: (color: string) => void;
  selectedColor?: string;
  disabled?: boolean;
}

interface SortableColorItemProps {
  color: SavedColor;
  isReorderMode: boolean;
  onContextMenu: (e: React.MouseEvent, color: SavedColor) => void;
  onColorSelect: (color: string) => void;
}

const SortableColorItem: React.FC<SortableColorItemProps> = ({ color, isReorderMode, onContextMenu, onColorSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: color.id || '' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onContextMenu={(e) => onContextMenu(e, color)}
      onClick={() => onColorSelect(color.hex)}
      className="group rounded-lg border border-gray-200 p-1.5 text-left hover:border-gray-300 hover:bg-gray-50 relative"
    >
      {isReorderMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-5 cursor-grab active:cursor-grabbing"
        >
          <GripHorizontal className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <div
        className="mb-2 h-16 w-full rounded"
        style={{ backgroundColor: color.hex }}
      />
      <p className="text-sm font-medium text-gray-900">{color.name}</p>
      <p className="text-xs text-gray-500">
        {color.hex}
      </p>
    </button>
  );
};

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  onColorSelect,
  selectedColor,
  disabled = false,
}) => {
  const [colors, setColors] = useState<SavedColor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    color: SavedColor;
  } | null>(null);
  const [editingColor, setEditingColor] = useState<SavedColor | null>(null);
  const [categoryOrders, setCategoryOrders] = useState<Record<string, SavedColor[]>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [newColor, setNewColor] = useState<Partial<SavedColor>>({
    hex: '#000000',
    name: '',
    categories: [] as string[],
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const editColorInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      const oldIndex = colors.findIndex((item) => item.id === active.id);
      const newIndex = colors.findIndex((item) => item.id === over.id);
      const newColors = arrayMove(colors, oldIndex, newIndex);
      setColors(newColors);
      
      // Update positions in database
      const { error } = await supabase.rpc('update_color_positions', {
        color_ids: newColors.map(c => c.id),
        new_positions: newColors.map((_, i) => i)
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating positions:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Failed to save new order. Please try again.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  // Get the correct color array based on current filter
  const getDisplayColors = () => {
    return filteredColors;
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const { data: colors, error } = await supabase
          .from('colors')
          .select('*')
          .order('position', { ascending: true });
        
        if (error) throw error;
        
        if (colors) {
          setColors(colors.map(color => ({
            ...color,
            createdAt: new Date(color.created_at),
            id: color.id
          })));
        }
      } catch (error) {
        console.error('Error fetching colors:', error);
      }
    };

    fetchColors();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('colors_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'colors'
        },
        async () => {
          console.log('Color change detected, refreshing...');
          fetchColors();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: colors } = await supabase.from('colors').select('categories');
      const uniqueCategories = new Set<string>();
      colors?.forEach(color => {
        const categories = color.categories || [];
        categories.forEach(category => {
          if (category) uniqueCategories.add(category);
        });
      });
      setCategories(Array.from(uniqueCategories).sort());
    };
    fetchCategories();
  }, [colors]);

  // Focus color input when add form appears
  useEffect(() => {
    if (isAdding && colorInputRef.current) {
      colorInputRef.current.focus();
    }
    if (editingColor && editColorInputRef.current) {
      editColorInputRef.current.focus();
    }
  }, [isAdding, editingColor]);

  const filteredColors = colors.filter(color => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = color.name.toLowerCase().includes(query) || 
                         color.hex.toLowerCase().includes(query);
    const matchesCategory = selectedFilter ? color.categories?.includes(selectedFilter) : true;
    return matchesSearch && matchesCategory;
  });

  const handleAddColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColor.hex || !newColor.name) return;

    try {
      await addColor({
        ...newColor,
        categories: [...selectedCategories, ...(newCategory ? [newCategory] : [])],
        position: colors.length,
      });

      setIsAdding(false);
      setNewColor({ hex: '#000000', name: '', categories: [] });
      setSelectedCategories([]);
      setNewCategory('');
    } catch (error) {
      console.error('Error adding color:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = error instanceof Error ? error.message : 'Failed to save color';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, color: SavedColor) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      color,
    });
  };

  const handleDelete = async (color: SavedColor) => {
    if (!color.id) return;
    try {
      await deleteColor(color.id);
      setContextMenu(null);
    } catch (error) {
      console.error('Error deleting color:', error);
      alert('Failed to delete color. Please try again.');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingColor?.id) return;
    
    try {
      await updateColor(editingColor.id, {
        hex: editingColor.hex,
        name: editingColor.name,
        categories: editingColor.categories,
      });
      setEditingColor(null);
    } catch (error) {
      console.error('Error updating color:', error);
      alert('Failed to update color. Please try again.');
    }
  };
  return (
    <div className="w-full space-y-4 h-full">
      <div className="mb-4 flex flex-col gap-2">
        <div className="relative flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search colors..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-2">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 h-[38px] text-sm font-medium text-gray-800 hover:bg-gray-200"
            >
              <Plus className="w-4 h-4" />
              Add Color
            </button>
          </div>
          <button
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`flex items-center gap-1 rounded-lg px-3 py-2 h-[38px] text-sm font-medium ${
              isReorderMode
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            <GripHorizontal className="w-4 h-4" />
            {isReorderMode ? 'Done' : 'Reorder'}
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAddColor} className="space-y-3 rounded-lg bg-gray-50 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Color Details</label>
            <input
              type="color"
              ref={colorInputRef}
              value={newColor.hex}
              onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
              className="mt-1 h-8 w-full rounded border border-gray-300"
            />
            <input
              type="text"
              value={newColor.hex}
              placeholder="Enter hex code (e.g., #FF0000)"
              pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
              onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
              className="mt-1 h-8 w-full rounded border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Screen Name</label>
            <input
              type="text"
              value={newColor.name}
              onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              placeholder="e.g., Ocean Blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Categories</label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value.trim())}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="Enter category name"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCategory.trim() && !selectedCategories.includes(newCategory)) {
                      setSelectedCategories([...selectedCategories, newCategory]);
                      setNewCategory('');
                    }
                  }}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      if (!selectedCategories.includes(category)) {
                        setSelectedCategories([...selectedCategories, category]);
                      }
                    }}
                    className={`rounded-lg px-2 py-1 text-xs ${
                      selectedCategories.includes(category)
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map(category => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
                    >
                      {category}
                      <button
                        type="button"
                        onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== category))}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {editingColor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form onSubmit={handleEdit} className="bg-white rounded-lg p-6 w-96 space-y-4">
            <h3 className="text-lg font-semibold">Edit Color</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Color</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="color"
                  ref={editColorInputRef}
                  value={editingColor.hex}
                  onChange={(e) => setEditingColor({ ...editingColor, hex: e.target.value })}
                  className="h-8 w-14 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={editingColor.hex}
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  onChange={(e) => setEditingColor({ ...editingColor, hex: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={editingColor.name}
                onChange={(e) => setEditingColor({ ...editingColor, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Categories</label>
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    placeholder="Enter category name"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCategory && !editingColor.categories.includes(newCategory)) {
                        setEditingColor({
                          ...editingColor,
                          categories: [...editingColor.categories, newCategory]
                        });
                        setNewCategory('');
                      }
                    }}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        if (!editingColor?.categories?.includes(category)) {
                          setEditingColor({
                            ...editingColor,
                            categories: [...(editingColor?.categories || []), category]
                          });
                        }
                      }}
                      className={`rounded-lg px-2 py-1 text-xs ${
                        editingColor?.categories?.includes(category)
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                {editingColor.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editingColor.categories.map(category => (
                      <span
                        key={category}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => setEditingColor({
                            ...editingColor,
                            categories: editingColor.categories.filter(c => c !== category)
                          })}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {editingColor.categories.length === 0 && (
                <input
                  type="hidden"
                  required
                  pattern=".*\S+.*"
                  title="Please select at least one category"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setEditingColor(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 pb-4">
        <DndContext
          disabled={disabled}
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={getDisplayColors().map(color => color.id || '')}
            strategy={horizontalListSortingStrategy}
          >
            {getDisplayColors().map((color) => (
              <SortableColorItem
                key={color.id}
                color={color}
                isReorderMode={isReorderMode}
                onContextMenu={handleContextMenu}
                onColorSelect={onColorSelect}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg py-1 border border-gray-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setEditingColor(contextMenu.color);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => handleDelete(contextMenu.color)}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};
