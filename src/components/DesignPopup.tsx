import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Download, Edit } from 'lucide-react';
import { downloadMatchingImage } from '../utils/imageUtils';
import { EditMatchingDialog } from './EditMatchingDialog';
import { LoadingSpinner } from './LoadingSpinner';
import { supabase } from '../lib/supabase';

// Rest of the file content remains the same...
interface DesignPopupProps {
  design: {
    id: string;
    design_number: string;
    image_url: string;
    thumbnail_url?: string;
    created_at: string;
    category?: string;
  };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditDetails: (design: { design_number: string; category: string }) => void;
  onDeleteMatching: (matchId: string, matchingUrl: string, designNumber: string, matchingNumber: number) => void;
}

export const DesignPopup: React.FC<DesignPopupProps> = ({
  design,
  onClose,
  onEdit,
  onEditDetails,
  onDelete,
  onDeleteMatching,
}) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    design_number: design.design_number,
    category: design.category || '',
  });
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matches, setMatches] = useState<Array<{
    id: string;
    matching_number: number;
    matching_image_url: string;
  }>>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isViewingFullImage, setIsViewingFullImage] = useState(false);
  const [editingMatch, setEditingMatch] = useState<{
    id: string;
    imageUrl: string;
    matchingNumber: number;
  } | null>(null);

  const loadMatches = async () => {
    setLoadError(null);
    try {
      const { data: matches, error } = await supabase
        .from('design_matches')
        .select('id, matching_number, matching_image_url')
        .eq('original_design_id', design.id)
        .order('matching_number', { ascending: true });
      
      if (error) throw error;
      setMatches(matches || []);
    } catch (error) {
      console.error('Failed to load matches:', error);
      setLoadError('Failed to load matches. Please try again.');
    } finally {
      setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [design.id]);

  useEffect(() => {
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`design_matches_${design.id}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_matches',
          filter: `original_design_id=eq.${design.id}`
        },
        (payload) => {
          console.log('Matching update received:', payload);
          loadMatches();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [design.id]);

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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!/^[A-Za-z0-9][A-Za-z0-9-_]*$/.test(editForm.design_number)) {
        throw new Error('Design number can only contain letters, numbers, hyphens and underscores');
      }

      const { error } = await supabase
        .from('designs')
        .update({
          design_number: editForm.design_number,
          category: editForm.category
        })
        .eq('id', design.id);

      if (error) throw error;

      onEditDetails(editForm);
      setIsEditing(false);

      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Design details updated successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error('Failed to update design:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = error instanceof Error ? error.message : 'Failed to update design details';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const handleDownload = async (match: any) => {
    try {
      const { data: changes } = await supabase
        .from('color_changes')
        .select(`
          default_color:design_default_colors!inner(hex, name),
          selected_color:colors!inner(hex, name)
        `)
        .eq('design_match_id', match.id);

      if (changes) {
        const formattedChanges = changes.map((change: any) => ({
          name: change.default_color.name,
          newColor: change.selected_color.name,
          hex: change.default_color.hex,
          newHex: change.selected_color.hex
        }));

        await downloadMatchingImage(
          match.matching_image_url,
          design.design_number,
          match.matching_number,
          formattedChanges
        );
      }
    } catch (error) {
      console.error('Failed to get color changes:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Failed to download image with color changes';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl w-[80%] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="flex-1">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Design Number
                  </label>
                  <input
                    type="text"
                    value={editForm.design_number}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      design_number: e.target.value
                    }))}
                    className="w-48 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    placeholder="Enter design number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      category: e.target.value
                    }))}
                    className="w-48 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    <option value="">No Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="text-xl font-semibold">Design #{design?.design_number}</h2>
              <p className="text-sm text-gray-500">
                {new Date(design.created_at).toLocaleDateString()}
                {design.category && ` • ${design.category}`}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Edit className="w-4 h-4" />
              Edit Details
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700"
            >
              <Plus className="w-4 h-4" />
              Add Matching
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Design
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
            {/* Action buttons */}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Original Design */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Original Design</h3>
            <div 
              className="bg-gray-50 rounded-lg p-4 flex items-center justify-center h-[calc(100vh-20rem)] cursor-zoom-in"
              onClick={() => setIsViewingFullImage(true)}
            >
              <img
                src={design.thumbnail_url || design.image_url}
                alt={`Design ${design.design_number}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            {isViewingFullImage && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-75 z-[80] flex items-center justify-center cursor-zoom-out p-4"
                onClick={() => setIsViewingFullImage(false)}
              >
                <img
                  src={design.image_url}
                  alt={`Design ${design.design_number} (Full Resolution)`}
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>

          {/* Matching Designs */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Designs Matching</h3>
            {isLoadingMatches ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : loadError ? (
              <div className="text-center py-12 text-red-600">{loadError}</div>
            ) : matches.length > 0 ? (
              <div className="grid grid-cols-3 gap-6">
                {matches.map(match => (
                  <div key={match.id} className="relative group">
                    <img
                      src={match.matching_image_url}
                      alt={`Matching design ${match.matching_number}`}
                      className="w-full h-full object-contain bg-gray-50 rounded-lg"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-30 rounded-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMatch({
                            id: match.id,
                            imageUrl: match.matching_image_url,
                            matchingNumber: match.matching_number
                          });
                        }}
                        className="bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
                        title="Edit matching"
                      >
                        <Edit className="w-5 h-5 text-gray-800" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(match);
                        }}
                        className="bg-white rounded-full p-2 hover:bg-gray-100 transition-colors"
                        title="Download matching"
                      >
                        <Download className="w-5 h-5 text-gray-800" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMatching(
                            match.id,
                            match.matching_image_url,
                            design.design_number,
                            match.matching_number
                          );
                        }}
                        className="bg-white rounded-full p-2 hover:bg-gray-100"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-md">
                      Match #{match.matching_number}
                    </div>
                    {/* Matching actions overlay */}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No matching designs found
              </div>
            )}
          </div>
        </div>
      </div>
      {editingMatch && design && (
        <EditMatchingDialog
          designId={design.id}
          matchId={editingMatch.id}
          matchingUrl={editingMatch.imageUrl}
          designNumber={design.design_number}
          matchingNumber={editingMatch.matchingNumber}
          onClose={() => setEditingMatch(null)}
          onSave={() => {
            setEditingMatch(null);
            loadMatches();
          }}
        />
      )}
    </div>
  );
};
