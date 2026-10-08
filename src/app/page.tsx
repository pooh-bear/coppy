import Home from '@/components/Home';
import { DEFAULT_TTL, MAX_TTL } from '@/lib/ttl';

// Read the token per request so it isn't baked in at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <Home apiToken={process.env.COPPY_API_TOKEN || null} defaultTtl={DEFAULT_TTL} maxTtl={MAX_TTL} />;
}
