import { getProvider } from '@/lib/providers';
import { normalizeHomeSection } from '@/lib/providers/normalizer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tabId = 0, provider = 'movies' } = req.query;

  try {
    const p = getProvider(provider);
    const data = await p.getHome(parseInt(tabId));

    // Normalize sections
    const sections = (data.items || [])
      .map(normalizeHomeSection)
      .filter(s => s && (s.items.length > 0 || s.banners.length > 0));

    return res.status(200).json({
      success: true,
      sections,
      tabId: data.tabId,
    });
  } catch (error) {
    console.error('Proxy home error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch home data', message: error.message });
  }
}
