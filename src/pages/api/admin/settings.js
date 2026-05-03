import getDb from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export default function handler(req, res) {
  const db = getDb();

  // GET - Get settings (admin only for full settings)
  if (req.method === 'GET') {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    try {
      const rows = db.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      rows.forEach(row => { settings[row.key] = row.value; });

      return res.status(200).json({ settings });
    } catch (error) {
      console.error('Get settings error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // PUT - Update settings
  if (req.method === 'PUT') {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { site_name, site_description, site_logo } = req.body;

    try {
      const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

      if (site_name !== undefined) {
        if (!site_name.trim()) {
          return res.status(400).json({ error: 'Nama website tidak boleh kosong' });
        }
        updateSetting.run('site_name', site_name.trim());
      }
      if (site_description !== undefined) {
        updateSetting.run('site_description', site_description.trim());
      }
      if (site_logo !== undefined) {
        updateSetting.run('site_logo', site_logo);
      }

      // Return updated settings
      const rows = db.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      rows.forEach(row => { settings[row.key] = row.value; });

      return res.status(200).json({ message: 'Settings berhasil diupdate', settings });
    } catch (error) {
      console.error('Update settings error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
