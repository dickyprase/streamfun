import getDb from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export default function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = getDb();

  // GET - Get watch history
  if (req.method === 'GET') {
    try {
      const history = db.prepare(
        'SELECT * FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC LIMIT 50'
      ).all(user.id);

      return res.status(200).json({ history });
    } catch (error) {
      console.error('Get history error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // POST - Add to watch history
  if (req.method === 'POST') {
    const { content_id, content_title, content_poster, progress } = req.body;

    if (!content_id) {
      return res.status(400).json({ error: 'content_id is required' });
    }

    try {
      // Upsert - update if same content watched again
      const existing = db.prepare(
        'SELECT id FROM watch_history WHERE user_id = ? AND content_id = ?'
      ).get(user.id, content_id);

      if (existing) {
        db.prepare(
          'UPDATE watch_history SET watched_at = datetime(\'now\'), progress = ?, content_title = ?, content_poster = ? WHERE id = ?'
        ).run(progress || 0, content_title || '', content_poster || '', existing.id);
      } else {
        db.prepare(
          'INSERT INTO watch_history (user_id, content_id, content_title, content_poster, progress) VALUES (?, ?, ?, ?, ?)'
        ).run(user.id, content_id, content_title || '', content_poster || '', progress || 0);
      }

      return res.status(200).json({ message: 'History updated' });
    } catch (error) {
      console.error('Add history error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
