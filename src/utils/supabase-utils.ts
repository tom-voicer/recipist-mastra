import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { WorkflowData, RecipeData, SavedRecipe } from "../types/supabase-types";

let supabaseClient: SupabaseClient | null = null;

/**
 * Get Supabase client for database operations
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required Supabase environment variables");
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }

  return supabaseClient;
}

/**
 * Convert workflow data to recipe data format for database insertion
 */
export function mapWorkflowDataToRecipeData(
  workflowData: WorkflowData,
  userId: string
): RecipeData {
  return {
    user_id: userId,
    recipe_data: workflowData.recipeData || null,
    image_url: workflowData.imageUrl || null,
    is_url: workflowData.isUrl,
    is_recipe: workflowData.isRecipe,
    is_social: workflowData.isSocial || null,
    provider: workflowData.provider || null,
    original_url: workflowData.originalUrl || null,
    recipe_name: workflowData.recipeName || null,
    time_minutes: workflowData.timeMinutes || null,
    serves_people: workflowData.servesPeople || null,
    makes_items: workflowData.makesItems || null,
    language_code: workflowData.languageCode || null,
    units: workflowData.units ? JSON.stringify(workflowData.units) : null,
  };
}

/**
 * Save recipe data to Supabase database
 */
export async function saveRecipeToDatabase(
  workflowData: WorkflowData,
  userId: string
): Promise<{
  success: boolean;
  data?: SavedRecipe;
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    const recipeData = mapWorkflowDataToRecipeData(workflowData, userId);

    const { data: savedRecipe, error: dbError } = await supabase
      .from("recipes")
      .insert(recipeData)
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return {
        success: false,
        error: `Database error: ${dbError.message}`,
      };
    }

    console.log(`Recipe saved to database with ID: ${savedRecipe.id}`);
    return {
      success: true,
      data: savedRecipe,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Database save error:", error);
    return {
      success: false,
      error: `Failed to save recipe: ${errorMessage}`,
    };
  }
}
