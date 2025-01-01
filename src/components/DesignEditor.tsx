import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from './Canvas';
import { ColorPalette } from './ColorPalette';
import { DefaultColorList } from './DefaultColorList';
import { LoadingSpinner } from './LoadingSpinner';
import { supabase } from '../lib/supabase';
import { replaceColor } from '../utils/imageUtils';
import { Save, Undo, ArrowLeft, RotateCcw } from 'lucide-react';
import { PoweredBy } from './PoweredBy';

interface DesignEditorProps {
  designNumber: string;
  designId: string;
  imageUrl: string;
  matchingId?: string;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onBack: () => void;
  onEditDesign?: (design: { 
    designNumber: string; 
    designId: string; 
    imageUrl: string; 
    step: 'colors' | 'editor';
    matchingId?: string;
  }) => void;
}

interface HistoryState {
  canvas: ImageData;
  colorChanges: Array<{ defaultColorId: string; selectedColorId: string }>;
  currentColors: Record<string, { hex: string; name: string }>;
}

export const DesignEditor: React.FC<DesignEditorProps> = ({
  designNumber,
  designId,
  imageUrl,
  matchingId,
  selectedColor,
  onColorSelect,
  onBack,
  onEditDesign
}) => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [workingCanvas, setWorkingCanvas] = useState<HTMLCanvasElement | null>(null);
  const [selectedDefaultColor, setSelectedDefaultColor] = useState<string | null>(null);
  const [defaultColors, setDefaultColors] = useState<Array<{ hex: string; name: string }>>([]);
  const [currentColors, setCurrentColors] = useState<Record<string, { hex: string; name: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadingColors, setIsLoadingColors] = useState(true);
  const [colorChanges, setColorChanges] = useState<Array<{ defaultColorId: string; selectedColorId: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const historyRef = useRef<HistoryState[]>([]);
  const redoStackRef = useRef<HistoryState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
        
        if (matchingId) {
          try {
            const { data: changes } = await supabase
              .from('color_changes')
              .select(`
                default_color:design_default_colors!inner(id, hex, name),
                selected_color:colors!inner(id, hex, name)
              `)
              .eq('design_match_id', matchingId);

            if (changes) {
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
            }
          } catch (error) {
            console.error('Failed to load color changes:', error);
          }
        }

        // Initialize history with current state
        historyRef.current = [{
          canvas: ctx.getImageData(0, 0, canvas.width, canvas.height),
          colorChanges: [...colorChanges],
          currentColors: { ...currentColors }
        }];
        
        setWorkingCanvas(canvas);
      }
    };
    img.src = imageUrl;
  }, [imageUrl, matchingId]);

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
      const blob = await new Promise<Blob>((resolve, reject) => {
        workingCanvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image blob'));
        }, 'image/png');
      });

      const fileName = `${designId}_${Date.now()}.png`;
      await supabase.storage.from('designs').upload(fileName, blob);

      const { data: { publicUrl: matchingImageUrl } } = supabase.storage
        .from('designs')
        .getPublicUrl(fileName);

      let currentMatchingId = matchingId;
      let matchingNumber = 1;

      if (!currentMatchingId) {
        const { data: matches } = await supabase
          .from('design_matches')
          .select('matching_number')
          .eq('original_design_id', designId)
          .order('matching_number', { ascending: false })
          .limit(1);

        if (matches && matches.length > 0) {
          matchingNumber = matches[0].matching_number + 1;
        }

        const { data: newMatching, error: matchingError } = await supabase
          .from('design_matches')
          .insert({
            original_design_id: designId,
            matching_image_url: matchingImageUrl,
            matching_number: matchingNumber
          })
          .select()
          .single();

        if (matchingError) throw matchingError;
        if (!newMatching) throw new Error('Failed to create matching');
        
        currentMatchingId = newMatching.id;
      } else {
        const { error: updateError } = await supabase
          .from('design_matches')
          .update({ matching_image_url: matchingImageUrl })
          .eq('id', currentMatchingId);

        if (updateError) throw updateError;
      }

      await supabase
        .from('color_changes')
        .delete()
        .eq('design_match_id', currentMatchingId);

      if (colorChanges.length > 0) {
        const { error: colorError } = await supabase
          .from('color_changes')
          .insert(
            colorChanges.map(change => ({
              design_match_id: currentMatchingId,
              default_color_id: change.defaultColorId,
              selected_color_id: change.selectedColorId
            }))
          );

        if (colorError) throw colorError;
      }

      setHasUnsavedChanges(false);

      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Changes saved successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      onBack();
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
    <div className="bg-white rounded-xl shadow-sm p-6">
      {isSaving && (
        <div className="fixed inset-x-0 top-0 z-50">
          <div className="bg-white shadow-md px-4 py-3 flex items-center justify-center gap-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-600">
              Saving changes...
            </span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-lg font-semibold">
            Design #{designNumber}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            title="Redo (Ctrl+Y)"
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
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
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
      <PoweredBy />
    </div>
  );
};
