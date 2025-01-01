import { supabase } from './supabase';
import { activity } from './activity';

// Type definitions
interface Design {
  id: string;
  design_number: string;
  image_url: string;
  thumbnail_url?: string;
  category?: string;
  created_at: string;
}

interface DesignMatch {
  id: string;
  matching_number: number;
  matching_image_url: string;
  color_changes: Array<{ originalColor: string; newColor: string; name: string }>;
}

// Helper method to compress images
const compressImage = async (blob: Blob, quality: number): Promise<Blob> => {
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Define target dimensions (12 inches at 300 DPI)
  const TARGET_HEIGHT = 12 * 300; // 12 inches * 300 pixels per inch
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Calculate width to maintain aspect ratio
      const aspectRatio = img.width / img.height;
      const targetWidth = Math.round(TARGET_HEIGHT * aspectRatio);
      
      // Set canvas dimensions
      canvas.width = targetWidth;
      canvas.height = TARGET_HEIGHT;
      
      // Use better image smoothing
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, TARGET_HEIGHT);
      }
      
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/png'
      , 1.0);
      
      // Set DPI metadata
      const arrayBuffer = new ArrayBuffer(12);
      const dataView = new DataView(arrayBuffer);
      dataView.setInt32(0, 300); // Set DPI to 300
      dataView.setInt32(4, 300); // Set DPI to 300
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(blob);
  });
};

// Storage service
export const storage = {
  // Save design to Supabase
  async saveDesign(file: File, designNumber: string, category: string): Promise<Design> {
    // Check file size
    const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB limit
    const sanitizedDesignNumber = designNumber.trim().replace(/\s+/g, '_');

    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 300MB limit. Please choose a smaller file.');
    }

    try {
      // Check if design number already exists
      const { data: existingDesigns, error: checkError } = await supabase
        .from('designs')
        .select('design_number')
        .eq('design_number', designNumber);

      if (checkError) {
        throw new Error('Failed to check design number');
      }

      if (existingDesigns && existingDesigns.length > 0) {
        throw new Error('A design with this number already exists');
      }

      // Create thumbnail
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      // Set thumbnail size
      const thumbnailSize = 500;
      const scale = Math.min(thumbnailSize / img.width, thumbnailSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get thumbnail blob
      const thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create thumbnail'));
        }, 'image/jpeg', 0.5);
      });

      // Compress original image
      // Use original file to maintain quality
      const compressedImage = file;

      // Upload files to Supabase Storage
      const timestamp = Date.now();
      const fileName = `${sanitizedDesignNumber}_${timestamp}.png`;
      const thumbnailName = `${sanitizedDesignNumber}_${timestamp}_thumb.jpg`;

      // Check if files already exist
      const { data: existingFiles } = await supabase.storage
        .from('designs')
        .list('', { 
          search: sanitizedDesignNumber
        });

      // Delete existing files if found
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles
          .filter(f => f.name.startsWith(sanitizedDesignNumber))
          .map(f => f.name);
        
        if (filesToDelete.length > 0) {
          await supabase.storage
            .from('designs')
            .remove(filesToDelete);
        }
      }

      await supabase.storage.from('designs').upload(fileName, compressedImage);
      await supabase.storage.from('designs').upload(thumbnailName, thumbnailBlob);

      // Get public URLs
      const { data: { publicUrl: imageUrl } } = supabase.storage
        .from('designs')
        .getPublicUrl(fileName);

      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from('designs')
        .getPublicUrl(thumbnailName);

      // Save to database
      const { data, error } = await supabase
        .from('designs')
        .insert({
          design_number: designNumber,
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          category
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to save design');
      
      // Log design upload
      await activity.log('upload_design', {
        design_id: data.id,
        design_number: data.design_number
      });

      return data;
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        console.error('Failed to save design:', error.message);
        throw error;
      } else {
        console.error('Unknown error while saving design:', error);
        throw new Error('Failed to save design. Please try again.');
      }
    }
  },

  // Save matching to Supabase
  async saveMatching(
    designId: string,
    canvas: HTMLCanvasElement,
    colorChanges: Array<{ defaultColorId: string; selectedColorId: string }>,
    matchingId?: string
  ): Promise<DesignMatch> {
    try {
      // Generate unique timestamp
      const timestamp = Date.now();

      // If updating existing matching, delete old files first
      if (matchingId) {
        const { data: existingMatch } = await supabase
          .from('design_matches')
          .select('matching_image_url')
          .eq('id', matchingId)
          .single();

        if (existingMatch) {
          const fileName = existingMatch.matching_image_url.split('/').pop();
          if (fileName) {
            await supabase.storage.from('designs').remove([fileName]);
          }
        }
      }

      let matchingNumber = 1;
      // Get next matching number
      const { data: matches } = await supabase
        .from('design_matches')
        .select('matching_number')
        .eq('original_design_id', designId)
        .order('matching_number', { ascending: false })
        .limit(1);

      matchingNumber = matches && matches.length > 0 ? matches[0].matching_number + 1 : 1;

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image blob'));
        }, 'image/png');
      });

      // Compress image
      const compressedBlob = await compressImage(blob, 0.7);

      // Upload to storage
      const fileName = `${designId}_${matchingNumber}_${timestamp}.png`;
      await supabase.storage.from('designs').upload(fileName, compressedBlob);

      // Get public URL
      const { data: { publicUrl: matchingImageUrl } } = supabase.storage
        .from('designs')
        .getPublicUrl(fileName);
      
      // Create new matching
      const { data, error: insertError } = await supabase
        .from('design_matches')
        .insert({
        original_design_id: designId,
        matching_number: matchingNumber,
        matching_image_url: matchingImageUrl
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!data) throw new Error('Failed to create matching');
      
      // Log matching creation
      await activity.log('create_matching', {
        design_id: designId,
        matching_id: data.id,
        matching_number: data.matching_number
      });
      
      // Save color changes
      const { error: colorError } = await supabase
        .from('color_changes')
        .insert(
          colorChanges.map(change => ({
            design_match_id: data.id,
            default_color_id: change.defaultColorId,
            selected_color_id: change.selectedColorId
          }))
        );

      if (colorError) throw colorError;

      return data;
    } catch (error) {
      console.error('Failed to save matching:', error);
      throw new Error('Failed to save matching. Please try again.');
    }
  },

  // Delete design and its matches
  async deleteDesign(designId: string): Promise<void> {
    try {
      // Get all matches
      const { data: matches } = await supabase
        .from('design_matches')
        .select('*')
        .eq('original_design_id', designId);

      // First delete all matches
      if (matches && matches.length > 0) {
        // Delete match records first
        await supabase
          .from('design_matches')
          .delete()
          .eq('original_design_id', designId);
      }

      // Get design details after matches are deleted
      const { data: design } = await supabase
        .from('designs')
        .select('*')
        .eq('id', designId)
        .single();

      if (!design) throw new Error('Design not found');

      // Now delete the design record
      await supabase.from('designs').delete().eq('id', designId);
      
      // Log design deletion
      await activity.log('delete_design', {
        design_id: designId
      });

      // Finally delete the files from storage
      const filesToDelete = [
        design.image_url.split('/').pop(),
        design.thumbnail_url?.split('/').pop(),
        ...(matches?.map(m => m.matching_image_url.split('/').pop()) || [])
      ].filter(Boolean);

      if (filesToDelete.length > 0) {
        await supabase.storage.from('designs').remove(filesToDelete);
      }
    } catch (error) {
      console.error('Failed to delete design:', error);
      throw new Error('Failed to delete design. Please try again.');
    }
  },

  // Delete matching
  async deleteMatching(matchId: string): Promise<void> {
    try {
      // Get matching details
      const { data: match } = await supabase
        .from('design_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (!match) throw new Error('Matching not found');

      // Delete file from storage
      const fileName = match.matching_image_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('designs').remove([fileName]);
      }

      // Delete from database
      await supabase.from('design_matches').delete().eq('id', matchId);
      
      // Log matching deletion
      await activity.log('delete_matching', {
        matching_id: matchId
      });
    } catch (error) {
      console.error('Failed to delete matching:', error);
      throw new Error('Failed to delete matching. Please try again.');
    }
  }
};
