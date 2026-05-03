import getDb from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export default function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = getDb();

  // Ensure new columns exist (migration)
  try { db.prepare('ALTER TABLE watch_history ADD COLUMN progress_seconds INTEGER DEFAULT 0').run(); } catch {}
  try { db.prepare('ALTER TABLE watch_history ADD COLUMN duration_seconds INTEGER DEFAULT 0').run(); } catch {}
  try { db.prepare('ALTER TABLE watch_history ADD COLUMN season INTEGER DEFAULT 0').run(); } catch {}
  try { db.prepare('ALTER TABLE watch_history ADD COLUMN episode INTEGER DEFAULT 0').run(); } catch {}
  try { db.prepare('ALTER TABLE watch_history ADD COLUMN content_slug TEXT DEFAULT \'\'').run(); } catch {}

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

  // POST - Add/update watch history with progress
  if (req.method === 'POST') {
    const {
      content_id, content_slug, content_title, content_poster,
      progress_seconds, duration_seconds, season, episode
    } = req.body;

    if (!content_id) {
      return res.status(400).json({ error: 'content_id is required' });
    }

    try {
      const existing = db.prepare(
        'SELECT id FROM watch_history WHERE user_id = ? AND content_id = ?'
      ).get(user.id, content_id);

      if (existing) {
        // Update existing - only update progress if provided
        const updates = ['watched_at = datetime(\'now\')'];
        const params = [];

        if (content_title) { updates.push('content_title = ?'); params.push(content_title); }
        if (content_poster) { updates.push('content_poster = ?'); params.push(content_poster); }
        if (content_slug) { updates.push('content_slug = ?'); params.push(content_slug); }
        if (progress_seconds !== undefined) { updates.push('progress_seconds = ?'); params.push(progress_seconds); }
        if (duration_seconds !== undefined) { updates.push('duration_seconds = ?'); params.push(duration_seconds); }
        if (season !== undefined) { updates.push('season = ?'); params.push(season); }
        if (episode !== undefined) { updates.push('episode = ?'); params.push(episode); }

        params.push(existing.id);
        db.prepare(`UPDATE watch_history SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      } else {
        db.prepare(
          `INSERT INTO watch_history (user_id, content_id, content_slug, content_title, content_poster, progress_seconds, duration_seconds, season, episode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          user.id, content_id, content_slug || '', content_title || '', content_poster || '',
          progress_seconds || 0, duration_seconds || 0, season || 0, episode || 0
        );
      }

      return res.status(200).json({ message: 'History updated' });
    } catch (error) {
      console.error('Add history error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
