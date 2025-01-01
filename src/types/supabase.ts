// Type for JSON-compatible values in Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Database schema types for Supabase
export interface Database {
  public: {
    Tables: {
      // Designs table schema
      designs: {
        // Row type - what we get from queries
        Row: {
          id: string                // Unique identifier
          design_number: string     // User-assigned design number
          image_url: string         // URL to stored image
          created_at: string        // Creation timestamp
        }
        // Insert type - what we can insert
        Insert: {
          id?: string              // Optional on insert
          design_number: string     // Required
          image_url: string        // Required
          created_at?: string      // Optional, defaults to now()
        }
        // Update type - what we can update
        Update: {
          id?: string              // Can update ID
          design_number?: string   // Can update number
          image_url?: string      // Can update URL
          created_at?: string     // Can update timestamp
        }
      }
    }
  }
}
