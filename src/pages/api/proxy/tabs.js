import { getProvider } from '@/lib/providers';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider = 'movies' } = req.query;

  try {
    const p = getProvider(provider);
    const data = await p.getTabs();

    // Extract and simplify tabs from the response
    const homeTabs = data.bottomTabs?.[0]?.subTabs || [];
    const tabs = homeTabs
      .filter(tab => !['H5Tab', 'CommunityTab'].includes(tab.type))
      .map(tab => ({
        id: tab.tabId,
        name: tab.name,
        code: tab.tabCode,
        type: tab.type,
      }));

    return res.status(200).json({ success: true, tabs });
  } catch (error) {
    console.error('Proxy tabs error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch tabs' });
  }
}
