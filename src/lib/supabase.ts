import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Retry function
const fetchWithRetry = async (url: string, options: RequestInit) => {
  let lastError;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (i < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
      }
    }
  }
  throw lastError;
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithRetry,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper function to handle Supabase errors
const handleSupabaseError = (error: any) => {
  console.error('Supabase operation failed:', error);
  throw error;
};

// Helper functions for colors table with error handling
export const getColors = async () => {
  try {
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .order('position', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    handleSupabaseError(error);
    return []; // Return empty array as fallback
  }
};

export const addColor = async (color: {
  hex: string;
  name: string;
  categories: string[];
  position: number;
}) => {
  try {
    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color.hex)) {
      throw new Error('Invalid hex color format');
    }

    const { data, error } = await supabase
      .from('colors')
      .insert([color])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

export const updateColor = async (
  id: string,
  updates: Partial<{
    hex: string;
    name: string;
    categories: string[];
    position: number;
  }>
) => {
  try {
    const { data, error } = await supabase
      .from('colors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

export const deleteColor = async (id: string) => {
  try {
    const { error } = await supabase
      .from('colors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error);
  }
};

// Upload image to Supabase Storage
export const uploadImage = async (file: File, designNumber: string) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${designNumber}.${fileExt}`;
    const thumbnailName = `${designNumber}_thumb.${fileExt}`;
    const thumbnailSize = 300;
    
    const { data: existingFile } = await supabase.storage
      .from('designs')
      .list('', { search: fileName });

    if (existingFile && existingFile.length > 0) {
      throw new Error('A design with this number already exists');
    }

    // Create thumbnail
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

    // Set thumbnail size (max 300px width/height while maintaining aspect ratio)
    const scale = Math.min(thumbnailSize / img.width, thumbnailSize / img.height);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    
    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Convert thumbnail to blob
    const thumbnailBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.7);
    });

    if (!thumbnailBlob) {
      throw new Error('Failed to create thumbnail');
    }

    // Upload original image
    const { data, error } = await supabase.storage
      .from('designs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Upload thumbnail
    const { error: thumbError } = await supabase.storage
      .from('designs')
      .upload(thumbnailName, thumbnailBlob, {
        cacheControl: '31536000', // Cache thumbnails for 1 year
        upsert: false,
      });

    if (thumbError) throw thumbError;

    return data;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

// Save design to database
export const saveDesign = async (designNumber: string, imageUrl: string, category: string) => {
  try {
    const { data: existingDesigns } = await supabase
      .from('designs')
      .select()
      .eq('design_number', designNumber);

    if (existingDesigns && existingDesigns.length > 0) {
      throw new Error('A design with this number already exists');
    }

    const { data, error } = await supabase
      .from('designs')
      .insert([{
        design_number: designNumber,
        image_url: imageUrl,
        thumbnail_url: imageUrl.replace(designNumber, `${designNumber}_thumb`),
        category: category,
        default_colors: [],
      }])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

export const deleteDesign = async (designId: string, imageUrl: string) => {
  try {
    // First delete all matching designs
    const { data: matches } = await supabase
      .from('design_matches')
      .select('id, matching_image_url')
      .eq('original_design_id', designId);

    if (matches) {
      for (const match of matches) {
        await deleteMatching(match.id, match.matching_image_url);
      }
    }

    // Then delete the original design image
    const fileName = decodeURIComponent(imageUrl.split('/').pop() || '');
    if (fileName) {
      await supabase.storage
        .from('designs')
        .remove([fileName]);
    }

    // Finally delete the design record
    const { error } = await supabase
      .from('designs')
      .delete()
      .eq('id', designId);
    
    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Delete design error:', error);
    handleSupabaseError(error);
    return false;
  }
};

export const getRecentDesigns = async () => {
  try {
    const { data, error } = await supabase
      .from('designs')
      .select(`
        *,
        design_default_colors (
          hex,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(4);
    
    if (error) throw error;
    return data.map(design => ({
      ...design,
      default_colors: design.design_default_colors
    }));
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
};

export const saveMatching = async (
  originalDesignId: string,
  matchingImageUrl: string,
  colorChanges: Array<{ originalColor: string; newColor: string; name: string; }>
) => {
  try {
    const { data, error } = await supabase
      .from('design_matches')
      .insert([{
        original_design_id: originalDesignId,
        matching_image_url: matchingImageUrl,
        color_changes: colorChanges
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
};

export const getDesignMatches = async (designId: string) => {
  try {
    const { data, error } = await supabase
      .from('design_matches')
      .select(`
        id,
        matching_number,
        matching_image_url,
        color_changes,
        created_at
      `)
      .eq('original_design_id', designId)
      .order('matching_number', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
};

export const deleteMatching = async (matchId: string, matchingUrl: string) => {
  try {
    // Delete the matching image from storage
    const fileName = decodeURIComponent(matchingUrl.split('/').pop() || '');
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from('designs')
        .remove([fileName]);
      
      if (storageError) {
        console.error('Storage deletion error:', storageError);
        throw storageError;
      }
    }

    // Delete the matching record from the database
    const { error: dbError } = await supabase
      .from('design_matches')
      .delete()
      .eq('id', matchId);
    
    if (dbError) {
      console.error('Database deletion error:', dbError);
      throw dbError;
    }

    return true;
  } catch (error) {
    console.error('Delete matching error:', error);
    handleSupabaseError(error);
    return false;
  }
};

export const updateDesignColors = async (designId: string, colors: { hex: string; name: string }[]) => {
  try {
    // Validate inputs
    if (!designId) {
      throw new Error('Design ID is required');
    }
    if (!Array.isArray(colors)) {
      throw new Error('Colors must be an array');
    }

    // Validate each color
    colors.forEach((color, index) => {
      if (!color.hex || !color.name) {
        throw new Error(`Invalid color at index ${index}: missing hex or name`);
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(color.hex)) {
        throw new Error(`Invalid hex color format at index ${index}: ${color.hex}`);
      }
    });

    // Delete existing colors
    const { error: deleteError } = await supabase
      .from('design_default_colors')
      .delete()
      .eq('design_id', designId);
    
    if (deleteError) {
      throw new Error(`Failed to remove existing colors: ${deleteError.message}`);
    }

    // Insert new colors if any
    if (colors.length > 0) {
      const { data, error: insertError } = await supabase
        .from('design_default_colors')
        .insert(
          colors.map(color => ({
            design_id: designId,
            hex: color.hex,
            name: color.name
          }))
        )
        .select();

      if (insertError) {
        throw new Error(`Failed to save new colors: ${insertError.message}`);
      }

      return !!data;
    }

    return true;
  } catch (error) {
    const message = error instanceof Error 
      ? error.message 
      : 'Failed to update design colors';
    console.error('Update design colors error:', error);
    throw new Error(message);
  }
};
