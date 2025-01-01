import React, { useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { auth, User } from './lib/auth';
import { storage } from './lib/storage';
import { usePersistedState } from './hooks/usePersistedState';
import logo from '/M_LOGO.png';
import { UploadSection } from './components/UploadSection';
import { DesignEditor } from './components/DesignEditor';
import { RecentDesigns } from './components/RecentDesigns';
import { DesignInputDialog } from './components/DesignInputDialog';
import { DefaultColorSelector } from './components/DefaultColorSelector';
import { updateDesignColors } from './lib/supabase';
import { PoweredBy } from './components/PoweredBy';
import { LoadingSpinner } from './components/LoadingSpinner';
import { LoginForm } from './components/LoginForm';

/**
 * Main application component that manages the overall state and layout
 * Handles design upload, editing, and displaying recent designs
 */
export default function App() {
  // State management
  const [user, setUser] = usePersistedState<User | null>('user', null);
  const [designs, setDesigns] = usePersistedState<any[]>('designs', []);
  const [isLoading, setIsLoading] = usePersistedState<boolean>('isLoading', true);
  const [isUploading, setIsUploading] = usePersistedState<boolean>('isUploading', false);
  const [error, setError] = usePersistedState<string | null>('error', null);
  const [pendingFile, setPendingFile] = usePersistedState<File | null>('pendingFile', null);
  const [showDesignInput, setShowDesignInput] = usePersistedState<boolean>('showDesignInput', false);
  const [uploadedDesign, setUploadedDesign] = usePersistedState<{
    step: 'colors' | 'editor';
    designNumber: string;
    designId: string;
    imageUrl: string;
    defaultColors?: Array<{ hex: string; name: string }>;
    matchingId: string | undefined;
  } | null>('uploadedDesign', null);
  const [selectedColor, setSelectedColor] = usePersistedState<string>('selectedColor', '#000000');
  
  useEffect(() => {
    // Check for current user
    auth.getCurrentUser().then(user => {
      setUser(user);
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange(setUser);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const loadRecentDesigns = async () => {
      setError(null);
      try {
        const { data: designs, error } = await supabase
          .from('designs')
          .select(`
            *,
            design_default_colors (
              hex,
              name
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDesigns(designs || []);
      } catch (err) {
        console.error('Failed to load recent designs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load designs');
        setDesigns([]);
      }
    };
    
    loadRecentDesigns();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('designs_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'designs'
        },
        () => {
          loadRecentDesigns();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const handleDesignDeleted = (designId: string) => {
    setDesigns(prev => prev.filter(design => design.id !== designId));
  };
  
  const handleDesignUpdated = (updatedDesign: Design) => {
    setDesigns(prev => 
      prev.map(design => design.id === updatedDesign.id ? updatedDesign : design)
    );
  };

  /**
   * Handles the upload of a new design image
   * @param file The image file to upload
   */
  const handleImageUpload = (file: File) => {
    setPendingFile(file);
    setShowDesignInput(true);
  };

  const handleDesignSubmit = async (designNumber: string, category: string) => {
    if (!pendingFile) return;

    setIsUploading(true);
    setError(null);
    setShowDesignInput(false);

    try {
      // Save design and wait for the response
      const design = await storage.saveDesign(pendingFile, designNumber, category);
      
      if (!design) {
        throw new Error('Failed to save design');
      }
      
      setUploadedDesign({
        designNumber,
        step: 'colors',
        designId: design.id,
        imageUrl: design.image_url,
        matchingId: undefined
      });
      
      // Update designs list
      setDesigns(prev => [design, ...prev]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload design');
      setUploadedDesign(null);

      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = err instanceof Error ? err.message : 'Failed to upload design';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  const handleDefaultColorsSave = async (colors: { hex: string; name: string }[]) => {
    if (!uploadedDesign || uploadedDesign.designId === 'pending') {
      setError('Please wait for the design to finish uploading');
      return;
    }

    try {
      const success = await updateDesignColors(uploadedDesign.designId, colors);
      if (success) {
        // Update the uploadedDesign state with the same values but change the step
        setUploadedDesign(prev => prev ? {
          ...prev,
          step: 'editor'
        } : null);
      } else {
        throw new Error('Failed to save colors');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save default colors');
      console.error('Error saving colors:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <button 
        onClick={() => {
          setUploadedDesign(null);
          setShowDesignInput(false);
          setPendingFile(null);
        }}
        className="absolute top-4 left-4 hover:opacity-80 transition-opacity"
      >
        <img src="https://i.imghippo.com/files/tGSN2137vjU.png" alt="Matching Master Logo" className="h-12 w-auto" />
      </button>
      <div className="w-[80%] h-screen">
        {showDesignInput && (
          <DesignInputDialog
            onSubmit={handleDesignSubmit}
            onClose={() => {
              setShowDesignInput(false);
              setPendingFile(null);
            }}
          />
        )}
        {!showDesignInput && uploadedDesign && (
          // Show design editor or color selector based on step
          uploadedDesign.step === 'colors' ? (
            <DefaultColorSelector
              designNumber={uploadedDesign.designNumber}
              imageUrl={uploadedDesign.imageUrl}
              defaultColors={uploadedDesign.defaultColors}
              onSave={handleDefaultColorsSave}
              onBack={() => setUploadedDesign(null)}
            />
          ) : (
            <DesignEditor
              designNumber={uploadedDesign.designNumber}
              designId={uploadedDesign.designId}
              imageUrl={uploadedDesign.imageUrl}
              matchingId={uploadedDesign.matchingId}
              onEditDesign={setUploadedDesign}
              selectedColor={selectedColor}
              onColorSelect={setSelectedColor}
              onBack={() => setUploadedDesign(null)}
            />
          )
        )}
        {!showDesignInput && !uploadedDesign && (
          <div className="max-w-2xl mx-auto">
            <UploadSection
              onImageUpload={handleImageUpload}
              isUploading={isUploading}
              error={error}
            />
          </div>
        )}
        {designs.length > 0 && !uploadedDesign && (
          <div className="mt-12">
            <RecentDesigns 
              designs={designs}
              onEditDesign={setUploadedDesign}
              onDesignDeleted={handleDesignDeleted}
              onDesignUpdated={handleDesignUpdated}
            />
          </div>
        )}
        <PoweredBy />
      </div>
    </div>
  );
}
