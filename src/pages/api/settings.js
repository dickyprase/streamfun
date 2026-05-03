import getDb from '@/lib/db';

// Public endpoint - returns site settings for frontend
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });

    return res.status(200).json({ settings });
  } catch (error) {
    console.error('Public settings error:', error);
    return res.status(200).json({
      settings: {
        site_name: 'StreamFront',
        site_logo: '',
        site_description: 'Platform streaming film dan series terlengkap',
      },
    });
  }
}
