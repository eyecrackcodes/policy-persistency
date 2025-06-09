import { createClient } from "@supabase/supabase-js";

// Supabase configuration - REQUIRES environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Only log in development
if (process.env.NODE_ENV === 'development') {
  console.log("🔧 Supabase Configuration:");
  console.log("URL present:", !!supabaseUrl);
  console.log("Key present:", !!supabaseAnonKey);
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env file."
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database helper functions
export const DatabaseService = {
  // Insert policies data
  async insertPolicies(policies) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log("🔄 Attempting to insert policies to Supabase...");
      }
      const { data, error } = await supabase
        .from("policies")
        .insert(policies)
        .select();

      if (error) {
        console.error("Error inserting policies:", error);
        throw new Error(`Database insert failed: ${error.message}`);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log("✅ Successfully inserted policies to Supabase");
      }
      return data;
    } catch (err) {
      console.error("Supabase insert error:", err);
      throw new Error(`Failed to insert policies: ${err.message}`);
    }
  },

  // Get all policies
  async getAllPolicies() {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log("🔄 Fetching policies from Supabase...");
      }
      const { data, error } = await supabase
        .from("policies")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching policies:", error);
        throw new Error(`Database fetch failed: ${error.message}`);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `✅ Successfully fetched ${data?.length || 0} policies from Supabase`
        );
      }
      return data || [];
    } catch (err) {
      console.error("Supabase fetch error:", err);
      throw new Error(`Failed to fetch policies: ${err.message}`);
    }
  },

  // Get policies by source type
  async getPoliciesBySource(source) {
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("source", source)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching policies by source:", error);
      throw error;
    }

    return data || [];
  },

  // Delete all policies (for fresh uploads)
  async clearAllPolicies() {
    const { error } = await supabase
      .from("policies")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

    if (error) {
      console.error("Error clearing policies:", error);
      throw error;
    }

    return true;
  },

  // Record file upload
  async recordFileUpload(uploadData) {
    const { data, error } = await supabase
      .from("file_uploads")
      .insert(uploadData)
      .select()
      .single();

    if (error) {
      console.error("Error recording file upload:", error);
      throw error;
    }

    return data;
  },

  // Update file upload status
  async updateFileUploadStatus(uploadId, status, additionalData = {}) {
    const { data, error } = await supabase
      .from("file_uploads")
      .update({
        upload_status: status,
        processed_at: new Date().toISOString(),
        ...additionalData,
      })
      .eq("id", uploadId)
      .select()
      .single();

    if (error) {
      console.error("Error updating file upload status:", error);
      throw error;
    }

    return data;
  },

  // Get recent file uploads
  async getRecentUploads(limit = 10) {
    const { data, error } = await supabase
      .from("file_uploads")
      .select("*")
      .order("uploaded_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent uploads:", error);
      throw error;
    }

    return data || [];
  },
};
