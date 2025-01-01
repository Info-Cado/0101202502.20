import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from './Canvas';
import { ColorPalette } from './ColorPalette';
import { replaceColor } from '../utils/imageUtils';
import { supabase } from '../lib/supabase';
import { Save, Undo, ArrowLeft, RotateCcw } from 'lucide-react';
import { storage } from '../lib/storage'; 
import { DefaultColorList } from './DefaultColorSelector';
import { ConfirmDialog } from './ConfirmDialog';
import { PoweredBy } from './PoweredBy';
import { LoadingSpinner } from './LoadingSpinner';

interface MatchingProps {
  designNumber: string;
  designId: string;
  imageUrl: string;
  matchingId: string;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onBack: () => void;
}

export const Matching: React.FC<MatchingProps> = ({
  designNumber,
  designId,
  imageUrl,
  matchingId,
  selectedColor,
  onColorSelect,
  onBack,
}) => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [workingCanvas, setWorkingCanvas] = useState<HTMLCanvasElement | null>(null);
  const [selectedDefaultColor, setSelectedDefaultColor] = useState<string | null>(null);
  const [defaultColors, setDefaultColors] = useState<Array<{ hex: string; name: string }>>([]);
  const [currentColors, setCurrentColors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadingColors, setIsLoadingColors] = useState(true);
  const [colorChanges, setColorChanges] = useState<Array<{ defaultColorId: string; selectedColorId: string }>>([]);
  const historyRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    action: 'back';
    title: string;
    message: string;
  } | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedColorChanges, setLoadedColorChanges] = useState<Array<{ defaultColorId: string; selectedColorId: string }>>([]);

  // Load default colors when component mounts
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

  // Load matching data and apply color changes
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
        historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
        setWorkingCanvas(canvas);
        
        try {
          const { data: changes } = await supabase
            .from('color_changes')
            .select(`
              default_color:design_default_colors!inner(id, hex, name),
              selected_color:colors!inner(id, hex)
            `)
            .eq('design_match_id', matchingId);

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
    img.src = imageUrl;
  }, [imageUrl, matchingId]);

  // Update undo/redo state whenever history changes
  useEffect(() => {
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(redoStackRef.current.length > 0);
  }, [historyRef.current.length, redoStackRef.current.length]);

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

      // Clear redo stack when making a new change
      redoStackRef.current = [];
    
      // Save current state to history
      const canvasCtx = workingCanvas.getContext('2d');
      if (!canvasCtx) return;
      historyRef.current.push(canvasCtx.getImageData(0, 0, workingCanvas.width, workingCanvas.height));
    
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
        const newChanges = [...filtered, {
          defaultColorId: defaultColor.id,
          selectedColorId: selectedColorId
        }];
        setHasUnsavedChanges(true); // Set unsaved changes flag
        return newChanges;
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
    
      onColorSelect(newColor);
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

    // Move current state to redo stack
    const currentState = historyRef.current.pop();
    if (currentState) {
      redoStackRef.current.push(currentState);
    }

    const previousState = historyRef.current[historyRef.current.length - 1];
    
    // Restore previous state
    ctx.putImageData(previousState, 0, 0);
    
    // Force re-render
    const newCanvas = document.createElement('canvas');
    newCanvas.width = workingCanvas.width;
    newCanvas.height = workingCanvas.height;
    const newCtx = newCanvas.getContext('2d');
    if (newCtx) {
      newCtx.putImageData(previousState, 0, 0);
      setWorkingCanvas(newCanvas);
    }
  };

  const handleRedo = () => {
    if (!workingCanvas || redoStackRef.current.length === 0) return;
    
    const ctx = workingCanvas.getContext('2d');
    if (!ctx) return;

    // Get the next state from redo stack
    const nextState = redoStackRef.current.pop();
    if (!nextState) return;

    // Save current state to history before applying redo
    const currentState = ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
    historyRef.current.push(currentState);

    // Apply the redo state
    ctx.putImageData(nextState, 0, 0);

    // Force re-render
    const newCanvas = document.createElement('canvas');
    newCanvas.width = workingCanvas.width;
    newCanvas.height = workingCanvas.height;
    const newCtx = newCanvas.getContext('2d');
    if (newCtx) {
      newCtx.putImageData(nextState, 0, 0);
      setWorkingCanvas(newCanvas);
    }
  };

  const handleReset = () => {
    if (!originalImage || !workingCanvas) return;
    
    const ctx = workingCanvas.getContext('2d');
    if (!ctx) return;
    
    // Save current state to history before resetting
    historyRef.current.push(ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height));
    
    // Clear redo stack
    redoStackRef.current = [];
    
    // Reset to original image
    ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
    ctx.drawImage(originalImage, 0, 0);
    
    // Reset state
    setCurrentColors({});
    setColorChanges([]);
    setHasUnsavedChanges(false);
    
    // Force re-render
    const newCanvas = document.createElement('canvas');
    newCanvas.width = workingCanvas.width;
    newCanvas.height = workingCanvas.height;
    const newCtx = newCanvas.getContext('2d');
    if (newCtx) {
      newCtx.drawImage(originalImage, 0, 0);
      setWorkingCanvas(newCanvas);
    }
  };

  const handleSaveMatching = async () => {
    if (!workingCanvas || !matchingId) return;
    
    setIsSaving(true);
    
    try {
      // Save matching
      await storage.saveMatching(designId, workingCanvas, colorChanges, matchingId);
      
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg';
      toast.textContent = 'Matching design saved successfully!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      
      // Reset unsaved changes flag after successful save
      setHasUnsavedChanges(false);
      
      // Go back to designs list
      onBack();
    } catch (error) {
      console.error('Failed to save matching:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg';
      toast.textContent = 'Failed to save matching design. Please try again.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges && !isSaving) {
      setShowConfirmDialog({
        action: 'back',
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to exit? Your changes will be lost.'
      });
    } else {
      onBack();
    }
  };

  const handleConfirmDialog = () => {
    if (!showConfirmDialog) return;
    onBack();
    setShowConfirmDialog(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {isSaving && (
        <div className="fixed inset-x-0 top-0 z-50">
          <div className="bg-white shadow-md px-4 py-3 flex items-center justify-center gap-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-600">
              Saving matching design...
            </span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-lg font-semibold">
            Match for Design #{designNumber}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleUndo()}
            disabled={!canUndo}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRedo()}
            disabled={!canRedo}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="Redo"
          >
            <Undo className="w-4 h-4 rotate-180" />
          </button>
          <button
            onClick={() => handleReset()}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
            title="Reset to Original"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSaveMatching}
            disabled={isSaving || !hasUnsavedChanges}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-72 flex-shrink-0">
          <DefaultColorList
            colors={defaultColors}
            selectedColor={selectedDefaultColor}
            currentColors={currentColors}
            onColorSelect={setSelectedDefaultColor}
          />
        </div>
        <div className="flex-1 flex gap-4 min-w-0 h-full overflow-hidden">
          <div className="flex-1 flex items-center justify-center h-[85vh]">
            <Canvas 
              image={workingCanvas || originalImage}
              onPixelClick={() => {}}
              selectedPoint={null}
              showZoom={false}
              className="h-full w-auto object-contain"
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
      {showConfirmDialog && (
        <ConfirmDialog
          title={showConfirmDialog.title}
          message={showConfirmDialog.message}
          onConfirm={handleConfirmDialog}
          onCancel={() => setShowConfirmDialog(null)}
        />
      )}
      <PoweredBy />
    </div>
  );
};
