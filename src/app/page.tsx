import Home from '@/components/Home';

// Read the token per request so it isn't baked in at build time.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <Home apiToken={process.env.COPPY_API_TOKEN || null} />;
}
