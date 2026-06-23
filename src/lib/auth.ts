/**
 * Simple API token authentication middleware.
 * If COPPY_API_TOKEN is set, all mutating endpoints require it.
 * If it's not set, the app runs in open-access mode (dev friendly).
 */
export function validateApiToken(request: Request): { valid: boolean; error?: Response } {
  const token = process.env.COPPY_API_TOKEN;

  // No token configured — open access (dev mode)
  if (!token) {
    return { valid: true };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header. Use: Bearer <token>' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      ),
    };
  }

  const providedToken = authHeader.slice('Bearer '.length).trim();
  if (providedToken !== token) {
    return {
      valid: false,
      error: new Response(
        JSON.stringify({ error: 'Invalid API token' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      ),
    };
  }

  return { valid: true };
}
