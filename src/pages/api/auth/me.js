import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role, avatar, created_at, last_login FROM users WHERE id = ?').get(tokenUser.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
