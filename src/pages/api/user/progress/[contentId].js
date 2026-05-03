import getDb from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Get watch progress for a specific content.
 * Returns last watched position so player can resume.
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(200).json({ progress_seconds: 0, duration_seconds: 0 });
  }

  const { contentId } = req.query;
  if (!contentId) {
    return res.status(400).json({ error: 'contentId is required' });
  }

  try {
    const db = getDb();

    // Ensure columns exist (migration)
    try { db.prepare('ALTER TABLE watch_history ADD COLUMN progress_seconds INTEGER DEFAULT 0').run(); } catch {}
    try { db.prepare('ALTER TABLE watch_history ADD COLUMN duration_seconds INTEGER DEFAULT 0').run(); } catch {}
    try { db.prepare('ALTER TABLE watch_history ADD COLUMN season INTEGER DEFAULT 0').run(); } catch {}
    try { db.prepare('ALTER TABLE watch_history ADD COLUMN episode INTEGER DEFAULT 0').run(); } catch {}

    const row = db.prepare(
      'SELECT progress_seconds, duration_seconds, season, episode FROM watch_history WHERE user_id = ? AND content_id = ?'
    ).get(user.id, contentId);

    if (row) {
      return res.status(200).json(row);
    }

    return res.status(200).json({ progress_seconds: 0, duration_seconds: 0, season: 0, episode: 0 });
  } catch (error) {
    console.error('Get progress error:', error);
    return res.status(200).json({ progress_seconds: 0, duration_seconds: 0, season: 0, episode: 0 });
  }
}
