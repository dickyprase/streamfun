import { getProvider } from '@/lib/providers';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider = 'movies' } = req.query;

  try {
    const p = getProvider(provider);
    const data = await p.getFilters();

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Proxy filters error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch filters' });
  }
}
