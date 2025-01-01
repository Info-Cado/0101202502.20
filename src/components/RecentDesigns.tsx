import React, { useState, useEffect } from 'react';
import { Edit2, Download, Trash2, Search, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { downloadMatchingImage } from '../utils/imageUtils';
import { DesignPopup } from './DesignPopup';

interface Design {
  id: string;
  design_number: string;
  image_url: string;
  created_at: string;
  default_colors: Array<{ hex: string; name: string; }>;
}

interface RecentDesignsProps {
  designs: Design[];
  onEditDesign: (design: { designNumber: string; designId: string; imageUrl: string; step: 'colors' | 'editor' }) => void;
  onDesignDeleted: (designId: string) => void;
  onDesignUpdated?: (design: Design) => void;
  onMatchesChange?: () => void;
}

interface DeleteConfirmationProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

export const RecentDesigns: React.FC<RecentDesignsProps> = ({ 
  designs, 
  onEditDesign,
  onDesignDeleted,
  onDesignUpdated,
  onMatchesChange
}) => {
  const [expandedDesign, setExpandedDesign] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, any[]>>({});
  const [loadingMatches, setLoadingMatches] = useState<Record<string, boolean>>({});
  const [matchErrors, setMatchErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<Design[]>(designs);

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedCategories([]);
  };

  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [selectedDesignMatches, setSelectedDesignMatches] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const designsPerPage = 20; // 5 columns x 4 rows
  const [editingMatching, setEditingMatching] = useState<{
    id: string;
    imageUrl: string;
  } | null>(null);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadMatchCounts = async () => {
      try {
        const { data: matches } = await supabase
          .from('design_matches')
          .select('original_design_id');

        const counts: Record<string, number> = {};
        matches?.forEach(match => {
          counts[match.original_design_id] = (counts[match.original_design_id] || 0) + 1;
        });
        setMatchCounts(counts);
      } catch (error) {
        console.error('Failed to load match counts:', error);
      }
    };

    loadMatchCounts();

    // Subscribe to changes
    const channel = supabase
      .channel('match_counts')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'design_matches' },
        () => {
          loadMatchCounts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleEditDetails = async (updatedDesign: { design_number: string; category: string }) => {
    if (!selectedDesign) return;
    
    try {
      const { error } = await supabase
        .from('designs')
        .update({
          design_number: updatedDesign.design_number,
          category: updatedDesign.category
        })
        .eq('id', selectedDesign.id);

      if (error) throw error;

      // Create updated design object
      const updatedDesignObj = {
        ...selectedDesign,
        design_number: updatedDesign.design_number,
        category: updatedDesign.category
      };

      // Update selected design state
      setSelectedDesign(updatedDesignObj);

      // Update filtered designs
      setFilteredDesigns(prevFiltered => 
        prevFiltered.map(d => d.id === selectedDesign.id ? updatedDesignObj : d)
      );

      // Update main designs list through parent
      if (onDesignUpdated) {
        onDesignUpdated(updatedDesignObj);
      }

      // Notify parent component
      onDesignUpdated?.(updatedDesignObj);

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

  const handleEditDesign = (design: Design) => {
    onEditDesign({
      designNumber: design.design_number,
      designId: design.id,
      imageUrl: design.image_url,
      step: 'editor',
      matchingId: undefined
    });
    setSelectedDesign(null);
  };

  const handleDesignClick = (design: Design) => {
    setSelectedDesign(design);
  };

  useEffect(() => {
    // Extract unique categories
    const uniqueCategories = Array.from(new Set(designs.map(d => d.category).filter(Boolean)));
    setCategories(uniqueCategories.sort());
    setCurrentPage(1); // Reset to first page when filters change
  }, [designs]);

  useEffect(() => {
    let filtered = [...designs];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(design => 
        design.design_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(design => 
        new Date(design.created_at) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(design => 
        new Date(design.created_at) <= new Date(endDate)
      );
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(design => 
        design.category && selectedCategories.includes(design.category)
      );
    }

    setFilteredDesigns(filtered);
  }, [designs, searchQuery, startDate, endDate, selectedCategories]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const loadMatches = async (designId: string) => {
      setLoadingMatches(prev => ({ ...prev, [designId]: true }));
      setMatchErrors(prev => ({ ...prev, [designId]: '' }));
      setMatchErrors(prev => ({ ...prev, [designId]: '' }));

      try {
        const { data: matchingDesigns, error } = await supabase
          .from('design_matches')
          .select('*')
          .eq('original_design_id', designId)
          .order('matching_number', { ascending: true });

        if (error) throw error;
        setMatches(prev => ({
          ...prev,
          [designId]: matchingDesigns || []
        }));
        setMatchErrors(prev => ({ ...prev, [designId]: '' }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load matches. Please try again.';
        console.error('Failed to load matches:', errorMessage);
        setMatchErrors(prev => ({ 
          ...prev, 
          [designId]: errorMessage
        }));
        setMatchErrors(prev => ({
          ...prev,
          [designId]: error instanceof Error ? error.message : 'Failed to load matches'
        }));
      } finally {
        setLoadingMatches(prev => ({ ...prev, [designId]: false }));
      }
    };

    if (expandedDesign) {
      loadMatches(expandedDesign);
      
      const channel = supabase
        .channel('matches_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'design_matches' },
          () => {
            loadMatches(expandedDesign);
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [expandedDesign]);

  // Load matches when a design is selected
  const loadMatches = async () => {
    if (!selectedDesign?.id) return;
    
    console.log('Loading matches for design:', selectedDesign.id);
    setIsLoadingMatches(true);
    setSubscriptionError(null);
    setSelectedDesignMatches([]);

    try {
      const { data: matchingDesigns } = await supabase
        .from('design_matches')
        .select('*')
        .eq('original_design_id', selectedDesign.id)
        .order('matching_number', { ascending: true });

      console.log('Matches loaded:', matchingDesigns);
      
      if (!matchingDesigns) {
        throw new Error('Failed to load matches');
      }

      setSelectedDesignMatches(matchingDesigns || []);
    } catch (error) {
      console.error('Failed to load matches:', error);
      setSubscriptionError(error instanceof Error ? error.message : 'Failed to load matches');
      setSelectedDesignMatches([]);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // Load matches when a design is selected
  useEffect(() => {
    if (selectedDesign) {
      loadMatches();

      // Subscribe to changes for this specific design
      const channel = supabase
        .channel(`matches_${selectedDesign.id}`)
        .on('postgres_changes',
          {
            event: '*',  // This catches all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'design_matches',
            filter: `original_design_id=eq.${selectedDesign.id}`
          },
          (payload) => {
            console.log('Matching update received:', payload);
            // Force immediate reload of matches
            loadMatches();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to matches changes');
          } else {
            console.error('Failed to subscribe to matches changes:', status);
            setSubscriptionError('Failed to subscribe to real-time updates');
          }
        });

      // Cleanup subscription on unmount or when selectedDesign changes
      return () => {
        console.log('Unsubscribing from matches channel');
        channel.unsubscribe();
      };
    }
  }, [selectedDesign]);

  const handleDeleteDesign = async (design: Design) => {
    setDeleteConfirmation({
      title: 'Delete Design',
      message: `Are you sure you want to delete Design #${design.design_number} and all its matchings? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          // Close the popup and cleanup subscription first
          setSelectedDesign(null);
          setDeleteConfirmation(null);
          
          // Unsubscribe from matches channel if it exists
          if (expandedDesign) {
            const channel = supabase.channel(`matches_${design.id}`);
            await channel.unsubscribe();
          }

          const toast = document.createElement('div');
          toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          toast.textContent = 'Deleting design...';
          document.body.appendChild(toast);

          await storage.deleteDesign(design.id);
          onDesignDeleted(design.id);
          
          toast.textContent = 'Design deleted successfully';
          toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          setTimeout(() => toast.remove(), 3000);
        } catch (error) {
          console.error('Failed to delete design:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete design';
          const toast = document.createElement('div');
          toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
          toast.textContent = `Error: ${errorMessage}`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        }
      },
    });
  };

  const handleDeleteMatching = async (matchId: string, matchingUrl: string, designNumber: string, matchingNumber: number) => {
    setDeleteConfirmation({
      title: 'Delete Matching',
      message: `Are you sure you want to delete Match #${matchingNumber} of Design #${designNumber}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await storage.deleteMatching(matchId);
          if (expandedDesign) {
            const updatedMatches = storage.getDesignMatches(expandedDesign);
            setMatches(prev => ({
              ...prev,
              [expandedDesign]: updatedMatches
            }));
          }
          setDeleteConfirmation(null);
        } catch (error) {
          console.error('Failed to delete matching:', error);
          alert('Failed to delete matching. Please try again.');
        }
      },
    });
  };

  // Get current designs for pagination
  const indexOfLastDesign = currentPage * designsPerPage;
  const indexOfFirstDesign = indexOfLastDesign - designsPerPage;
  const currentDesigns = filteredDesigns.slice(indexOfFirstDesign, indexOfLastDesign);
  const totalPages = Math.ceil(filteredDesigns.length / designsPerPage);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="#1234"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none p-0 text-sm w-32"
              placeholder="start date"
            />
            <span className="text-gray-500 text-sm">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none p-0 text-sm w-32"
              placeholder="end date"
            />
          </div>
        </div>
        {(searchQuery || startDate || endDate || selectedCategories.length > 0) && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Clear Filters
          </button>
        )}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategories(prev => 
                  prev.includes(category)
                    ? prev.filter(c => c !== category)
                    : [...prev, category]
                );
              }}
              className={`px-4 py-1 rounded-full text-sm ${
                selectedCategories.includes(category)
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-6">
        {currentDesigns.map((design) => (
          <div 
            key={design.id} 
            className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 cursor-pointer"
            onClick={() => handleDesignClick(design)}
          >
            <div className="relative group aspect-square">
              <img
                src={design.thumbnail_url || design.image_url}
                alt={`Design ${design.design_number}`}
                className="w-full h-full object-contain bg-gray-50"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">#{design.design_number}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-500">
                  {new Date(design.created_at).toLocaleDateString()}
                  {matchCounts[design.id] !== undefined && (
                    <>
                      {' • '}
                      <span className="font-medium">
                        {matchCounts[design.id]} Matching{matchCounts[design.id] !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </p>
                {design.category && (
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {design.category}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedDesign && (
        <DesignPopup
          design={selectedDesign}
          matches={isLoadingMatches ? [] : selectedDesignMatches}
          isLoadingMatches={isLoadingMatches}
          matchesError={subscriptionError}
          onClose={() => setSelectedDesign(null)}
          onEdit={() => {
            if (!selectedDesign?.id) return;
            
            if (editingMatching) {
              onEditDesign({
                designNumber: selectedDesign.design_number,
                designId: selectedDesign.id,
                imageUrl: editingMatching.imageUrl,
                matchingId: editingMatching.id,
                step: 'editor'
              });
            } else {
              onEditDesign({
                designNumber: selectedDesign.design_number,
                designId: selectedDesign.id,
                imageUrl: selectedDesign.image_url,
                step: 'editor'
              });
            }
            setSelectedDesign(null);
            setEditingMatching(null);
          }}
          onDelete={() => handleDeleteDesign(selectedDesign)}
          onDeleteMatching={handleDeleteMatching}
          onEditDetails={handleEditDetails}
          onMatchesChange={onMatchesChange}
        />
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:bg-gray-50"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${
                    currentPage === page
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {deleteConfirmation && (
        <DeleteConfirmation
          {...deleteConfirmation}
          onCancel={() => setDeleteConfirmation(null)}
        />
      )}
    </div>
  );
};
