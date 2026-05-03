import { getProvider } from '@/lib/providers';
import { normalizeDetailItem } from '@/lib/providers/normalizer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, provider = 'movies' } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Parameter "id" is required' });
  }

  try {
    const p = getProvider(provider);
    const data = await p.getInfo(id);
    const detail = normalizeDetailItem(data);

    return res.status(200).json({ success: true, data: detail });
  } catch (error) {
    console.error('Proxy info error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch info' });
  }
}
