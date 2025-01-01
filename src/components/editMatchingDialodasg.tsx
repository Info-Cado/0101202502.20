import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Canvas } from './Canvas';
import { ColorPalette } from './ColorPalette';
import { DefaultColorList } from './DefaultColorSelector';
import { LoadingSpinner } from './LoadingSpinner';
import { supabase } from '../lib/supabase';
import { replaceColor } from '../utils/imageUtils';

interface EditMatchingDialogProps {
  designId: string;
  matchId: string;
  matchingUrl: string;
  designNumber: string;
  matchingNumber: number;
  onClose: () => void;
  onSave: () => void;
}

export const EditMatchingDialog: React.FC<EditMatchingDialogProps> = ({
  designId,
  matchId,
  matchingUrl,
  designNumber,
  matchingNumber,
  onClose,
  onSave,
}) => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [workingCanvas, setWorkingCanvas] = useState<HTMLCanvasElement | null>(null);
  const [selectedDefaultColor, setSelectedDefaultColor] = useState<string | null>(null);
  const [defaultColors, setDefaultColors] = useState<Array<{ hex: string; name: string }>>([]);
  const [currentColors, setCurrentColors] = useState<Record<string, string>>({});
  const [isLoadingColors, setIsLoadingColors] = useState(true);
  const [colorChanges, setColorChanges] = useState<Array<{ defaultColorId: string; selectedColorId: string }>>([]);
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [isSaving, setIsSaving] = useState(false);

  // Load default colors
  useEffect(() => {
    const loadDefaultColors = async () => {
      setIsLoadingColors(true);
      try {
        const { data: colors } = await supabase
          .from('design_default_colors')
          .select('id, hex, name')
          .eq('design_id', designId)
          .order('created_at', { ascending: true });
        
        if (colors) {
          setDefaultColors(colors);
        }
      } catch (error) {
        console.error('Error loading default colors:', error);
      } finally {
        setIsLoadingColors(false);
      }
    };
    
    loadDefaultColors();
  }, [designId]);

  // Load matching image and apply color changes
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      setOriginalImage(img);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setWorkingCanvas(canvas);
        
        try {
          const { data: changes } = await supabase
            .from('color_changes')
            .select(`
              default_color:design_default_colors!inner(id, hex, name),
              selected_color:colors!inner(id, hex)
            `)
            .eq('design_match_id', matchId);

          if (changes) {
            // Apply each color change
            for (const change of changes) {
              replaceColor(canvas, {
                originalColor: change.default_color.hex,
                newColor: change.selected_color.hex,
              });
              
              setCurrentColors(prev => ({
                ...prev,
                [change.default_color.hex]: change.selected_color.hex
              }));
              
              setColorChanges(prev => [...prev, {
                defaultColorId: change.default_color.id,
                selectedColorId: change.selected_color.id
              }]);
            }
            
            const newCanvas = document.createElement('canvas');
            newCanvas.width = canvas.width;
            newCanvas.height = canvas.height;
            const newCtx = newCanvas.getContext('2d');
            if (newCtx) {
              newCtx.drawImage(canvas, 0, 0);
              setWorkingCanvas(newCanvas);
            }
          }
        } catch (error) {
          console.error('Failed to load color changes:', error);
        }
      }
    };
    img.src = matchingUrl;
  }, [matchingUrl, matchId]);

  const handleColorSelect = async (newColor: string) => {
    if (!selectedDefaultColor || !workingCanvas) return;
    
    // Get the default color object by hex
    const defaultColor = defaultColors.find(color => color.hex.toLowerCase() === selectedDefaultColor.toLowerCase());
    if (!defaultColor?.id) return;
    
    try {
      // Get or create the selected color in the colors table
      const { data: existingColor } = await supabase
        .from('colors')
        .select('id')
        .eq('hex', newColor.toLowerCase())
        .single();

      let selectedColorId = existingColor?.id;

      if (!selectedColorId) {
        const { data: newColorData } = await supabase
          .from('colors')
          .insert({ hex: newColor.toLowerCase() })
          .select('id')
          .single();
      
        if (!newColorData?.id) throw new Error('Failed to create color');
        selectedColorId = newColorData.id;
      }

      // Get the color to replace (either default or current)
      const colorToReplace = currentColors[selectedDefaultColor] || selectedDefaultColor;
    
      // Replace color
      replaceColor(workingCanvas, {
        originalColor: colorToReplace,
        newColor: newColor,
      });
    
      // Update current colors map
      setCurrentColors(prev => ({
        ...prev,
        [selectedDefaultColor]: newColor
      }));

      // Update color changes array
      setColorChanges(prev => {
        // Remove any existing change for this default color
        const filtered = prev.filter(change => change.defaultColorId !== defaultColor?.id);
        // Add the new change
        return [...filtered, {
          defaultColorId: defaultColor.id,
          selectedColorId: selectedColorId
        }];
      });
    
      // Force re-render with new canvas
      const newCanvas = document.createElement('canvas');
      newCanvas.width = workingCanvas.width;
      newCanvas.height = workingCanvas.height;
      const newCtx = newCanvas.getContext('2d');
      if (newCtx) {
        newCtx.drawImage(workingCanvas, 0, 0);
        setWorkingCanvas(newCanvas);
      }
    
      setSelectedColor(newColor);
    } catch (error) {
      console.error('Failed to handle color selection:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = error instanceof Error ? error.message : 'Failed to update color';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const handleSave = async () => {
    if (!workingCanvas) return;
    setIsSaving(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        workingCanvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image blob'));
        }, 'image/png');
      });

      // Upload new image
      const fileName = `${designId}_${matchingNumber}_${Date.now()}.png`;
      await supabase.storage.from('designs').upload(fileName, blob);

      // Get public URL
      const { data: { publicUrl: matchingImageUrl } } = supabase.storage
        .from('designs')
        .getPublicUrl(fileName);

      // Update matching record
      const { error: updateError } = await supabase
        .from('design_matches')
        .update({ matching_image_url: matchingImageUrl })
        .eq('id', matchId);

      if (updateError) throw updateError;

      // Delete old color changes
      await supabase
        .from('color_changes')
        .delete()
        .eq('design_match_id', matchId);

      // Insert new color changes if any exist
      if (colorChanges.length > 0) {
        // Insert color changes one by one to avoid conflicts
        for (const change of colorChanges) {
          const { error: colorError } = await supabase
            .from('color_changes')
            .insert({
              design_match_id: matchId,
              default_color_id: change.defaultColorId,
              selected_color_id: change.selectedColorId
            });

          if (colorError) throw colorError;
        }
      }

      onSave();
    } catch (error) {
      console.error('Failed to save changes:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Failed to save changes. Please try again.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-xl w-[90%] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Edit Match #{matchingNumber} - Design #{designNumber}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-4 p-6 flex-1 min-h-0">
          <div className="w-72 flex-shrink-0">
            <DefaultColorList
              colors={defaultColors}
              selectedColor={selectedDefaultColor}
              currentColors={currentColors}
              onColorSelect={setSelectedDefaultColor}
            />
          </div>
          <div className="flex-1 flex gap-4 min-w-0 h-full overflow-hidden">
            <div className="flex-1 flex items-center justify-center">
              <Canvas 
                image={workingCanvas || originalImage}
                onPixelClick={() => {}}
                selectedPoint={null}
                showZoom={false}
                className="h-[90%] w-auto object-contain"
              />
            </div>
            <div className="w-[400px] flex-shrink-0">
              <ColorPalette
                onColorSelect={handleColorSelect}
                selectedColor={selectedColor}
                disabled={!selectedDefaultColor}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
