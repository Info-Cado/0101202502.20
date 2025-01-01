import React, { useState, useEffect, useRef } from 'react';
import { X, Undo, RotateCcw } from 'lucide-react';
import { Canvas } from './Canvas';
import { ColorPalette } from './ColorPalette';
import { DefaultColorList } from './DefaultColorList';
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

interface HistoryState {
  canvas: ImageData;
  colorChanges: Array<{ defaultColorId: string; selectedColorId: string }>;
  currentColors: Record<string, { hex: string; name: string }>;
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
  const [currentColors, setCurrentColors] = useState<Record<string, { hex: string; name: string }>>({});
  const [isLoadingColors, setIsLoadingColors] = useState(true);
  const [colorChanges, setColorChanges] = useState<Array<{ defaultColorId: string; selectedColorId: string }>>([]);
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [isSaving, setIsSaving] = useState(false);
  const historyRef = useRef<HistoryState[]>([]);
  const redoStackRef = useRef<HistoryState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
              selected_color:colors!inner(id, hex, name)
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
                [change.default_color.hex]: {
                  hex: change.selected_color.hex,
                  name: change.selected_color.name
                }
              }));
              
              setColorChanges(prev => [...prev, {
                defaultColorId: change.default_color.id,
                selectedColorId: change.selected_color.id
              }]);
            }
            
            // Initialize history with current state
            historyRef.current = [{
              canvas: ctx.getImageData(0, 0, canvas.width, canvas.height),
              colorChanges: [...colorChanges],
              currentColors: { ...currentColors }
            }];
            
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
    
    const defaultColor = defaultColors.find(color => color.hex.toLowerCase() === selectedDefaultColor.toLowerCase());
    if (!defaultColor?.id) return;
    
    try {
      const { data: selectedColorData } = await supabase
        .from('colors')
        .select('id, name')
        .eq('hex', newColor.toLowerCase())
        .single();

      if (!selectedColorData) throw new Error('Selected color not found');

      const ctx = workingCanvas.getContext('2d');
      if (!ctx) return;

      // Save current state to history before making changes
      historyRef.current.push({
        canvas: ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height),
        colorChanges: [...colorChanges],
        currentColors: { ...currentColors }
      });

      // Clear redo stack when making a new change
      redoStackRef.current = [];

      // Get the color to replace (either current or default)
      const colorToReplace = currentColors[selectedDefaultColor]?.hex || selectedDefaultColor;

      // Replace color
      replaceColor(workingCanvas, {
        originalColor: colorToReplace,
        newColor: newColor,
      });
    
      // Update current colors map
      setCurrentColors(prev => ({
        ...prev,
        [selectedDefaultColor]: {
          hex: newColor,
          name: selectedColorData.name
        }
      }));

      // Update color changes array
      setColorChanges(prev => {
        const filtered = prev.filter(change => change.defaultColorId !== defaultColor.id);
        return [...filtered, {
          defaultColorId: defaultColor.id,
          selectedColorId: selectedColorData.id
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

      setHasUnsavedChanges(true);
      setCanUndo(true);
      setCanRedo(false);
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

  const handleUndo = () => {
    if (!workingCanvas || historyRef.current.length <= 1) return;
    
    const ctx = workingCanvas.getContext('2d');
    if (!ctx) return;

    // Save current state to redo stack
    redoStackRef.current.push({
      canvas: ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height),
      colorChanges: [...colorChanges],
      currentColors: { ...currentColors }
    });

    // Get previous state
    const previousState = historyRef.current.pop()!;
    
    // Apply previous state
    ctx.putImageData(previousState.canvas, 0, 0);
    setColorChanges(previousState.colorChanges);
    setCurrentColors(previousState.currentColors);
    
    // Force re-render
    const newCanvas = document.createElement('canvas');
    newCanvas.width = workingCanvas.width;
    newCanvas.height = workingCanvas.height;
    const newCtx = newCanvas.getContext('2d');
    if (newCtx) {
      newCtx.putImageData(previousState.canvas, 0, 0);
      setWorkingCanvas(newCanvas);
    }

    setCanUndo(historyRef.current.length > 1);
    setCanRedo(true);
    setHasUnsavedChanges(true);
  };

  const handleRedo = () => {
    if (!workingCanvas || redoStackRef.current.length === 0) return;
    
    const ctx = workingCanvas.getContext('2d');
    if (!ctx) return;

    // Get next state from redo stack
    const nextState = redoStackRef.current.pop()!;

    // Save current state to history
    historyRef.current.push({
      canvas: ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height),
      colorChanges: [...colorChanges],
      currentColors: { ...currentColors }
    });
    
    // Apply redo state
    ctx.putImageData(nextState.canvas, 0, 0);
    setColorChanges(nextState.colorChanges);
    setCurrentColors(nextState.currentColors);
    
    // Force re-render
    const newCanvas = document.createElement('canvas');
    newCanvas.width = workingCanvas.width;
    newCanvas.height = workingCanvas.height;
    const newCtx = newCanvas.getContext('2d');
    if (newCtx) {
      newCtx.putImageData(nextState.canvas, 0, 0);
      setWorkingCanvas(newCanvas);
    }

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    setHasUnsavedChanges(true);
  };

  const handleReset = () => {
    if (!originalImage || !workingCanvas) return;
    
    const ctx = workingCanvas.getContext('2d');
    if (!ctx) return;

    // Save current state to history before resetting
    historyRef.current.push({
      canvas: ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height),
      colorChanges: [...colorChanges],
      currentColors: { ...currentColors }
    });
    
    // Clear redo stack
    redoStackRef.current = [];
    
    // Reset to original image
    ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
    ctx.drawImage(originalImage, 0, 0);
    
    // Reset state
    setCurrentColors({});
    setColorChanges([]);
    
    // Force re-render
    const newCanvas = document.createElement('canvas');
    newCanvas.width = workingCanvas.width;
    newCanvas.height = workingCanvas.height;
    const newCtx = newCanvas.getContext('2d');
    if (newCtx) {
      newCtx.drawImage(originalImage, 0, 0);
      setWorkingCanvas(newCanvas);
    }

    setHasUnsavedChanges(true);
    setCanUndo(true);
    setCanRedo(false);
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

      // Create array of all color changes (including unchanged colors)
      const allColorChanges = defaultColors.map(defaultColor => {
        const currentColor = currentColors[defaultColor.hex];
        return {
          defaultColorId: defaultColor.id,
          selectedColorId: colorChanges.find(change => change.defaultColorId === defaultColor.id)?.selectedColorId
        };
      }).filter(change => change.selectedColorId); // Only include changes with a selected color

      // Insert all color changes
      if (allColorChanges.length > 0) {
        for (const change of allColorChanges) {
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

      setHasUnsavedChanges(false);
      onSave();
      onClose();
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
      <div className="bg-white rounded-xl w-[90%] h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Edit Match #{matchingNumber} - Design #{designNumber}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              title="Redo"
            >
              <Undo className="w-4 h-4 rotate-180" />
              Redo
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
              title="Reset to Original"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
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
              <div className="h-full w-full flex items-center justify-center">
                <Canvas 
                  image={workingCanvas || originalImage}
                  onPixelClick={() => {}}
                  selectedPoint={null}
                  showZoom={false}
                  className="max-h-full w-auto object-contain"
                />
              </div>
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
