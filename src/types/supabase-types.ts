// Type for the workflow result data
export interface WorkflowData {
  result: string;
  recipeData?: string;
  imageUrl?: string;
  isUrl: boolean;
  isRecipe: boolean;
  isSocial?: boolean;
  provider?: string;
  originalUrl?: string;
  recipeName?: string;
  timeMinutes?: number;
  servesPeople?: number;
  makesItems?: string;
  languageCode?: string;
  units?: {
    length?: string;
    liquid?: string;
    weight?: string;
    temperature?: string;
  };
}

// Type for the recipe data to be inserted into database
export interface RecipeData {
  user_id: string;
  recipe_data: string | null;
  image_url: string | null;
  is_url: boolean;
  is_recipe: boolean;
  is_social: boolean | null;
  provider: string | null;
  original_url: string | null;
  recipe_name: string | null;
  time_minutes: number | null;
  serves_people: number | null;
  makes_items: string | null;
  language_code: string | null;
  units: string | null;
}

// Type for the saved recipe returned from database
export interface SavedRecipe {
  id: string;
  user_id: string;
  recipe_data: string | null;
  image_url: string | null;
  is_url: boolean;
  is_recipe: boolean;
  is_social: boolean | null;
  provider: string | null;
  original_url: string | null;
  recipe_name: string | null;
  time_minutes: number | null;
  serves_people: number | null;
  makes_items: string | null;
  language_code: string | null;
  units: string | null;
  created_at: string;
  updated_at: string;
}
