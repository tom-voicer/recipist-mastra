import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client with environment variables
 */
function getSupabaseClient(): SupabaseClient {
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
 * Extract Bearer token from Authorization header
 * @param authHeader - The Authorization header value
 * @returns The extracted token or null if invalid format
 */
export function extractBearerToken(
  authHeader: string | undefined
): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Verify auth token and get user data
 * @param token - The JWT token to verify
 * @returns User data if token is valid, null otherwise
 */
export async function verifyAuthToken(token: string): Promise<User | null> {
  try {
    const supabase = getSupabaseClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.error("Auth verification error:", error.message);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Failed to verify auth token:", error);
    return null;
  }
}

/**
 * Complete authentication flow: extract token and verify user
 * @param authHeader - The Authorization header value
 * @returns User data if authentication successful, null otherwise
 */
export async function authenticateRequest(
  authHeader: string | undefined
): Promise<User | null> {
  const token = extractBearerToken(authHeader);

  if (!token) {
    return null;
  }

  return await verifyAuthToken(token);
}
