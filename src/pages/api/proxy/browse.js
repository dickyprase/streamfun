import { getProvider } from '@/lib/providers';
import { normalizeContentItem } from '@/lib/providers/normalizer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider = 'movies', page = 1, ...filters } = req.query;

  try {
    const p = getProvider(provider);
    const data = await p.browse({ ...filters, page: parseInt(page) });

    // Browse response can have different structures
    const rawItems = data.items || data.subjects || [];
    const items = rawItems
      .map(item => {
        try {
          return normalizeContentItem(item.subject || item);
        } catch { return null; }
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      items,
      hasMore: data.pager?.hasMore || false,
      nextPage: data.pager?.nextPage || null,
      total: data.pager?.totalCount || items.length,
    });
  } catch (error) {
    console.error('Proxy browse error:', error.message);
    return res.status(500).json({ error: 'Failed to browse' });
  }
}
