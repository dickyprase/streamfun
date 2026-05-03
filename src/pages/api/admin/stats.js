import getDb from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const db = getDb();

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalAdmins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    const totalRegularUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;
    const todayLogins = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE date(last_login) = date('now')"
    ).get().count;
    const weekLogins = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE last_login >= datetime('now', '-7 days')"
    ).get().count;
    const totalWatchHistory = db.prepare('SELECT COUNT(*) as count FROM watch_history').get().count;

    // Recent registrations (last 7 days)
    const recentRegistrations = db.prepare(
      "SELECT date(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days') GROUP BY date(created_at) ORDER BY date DESC"
    ).all();

    // Login activity (last 7 days)
    const loginActivity = db.prepare(
      "SELECT date(last_login) as date, COUNT(*) as count FROM users WHERE last_login >= datetime('now', '-7 days') AND last_login IS NOT NULL GROUP BY date(last_login) ORDER BY date DESC"
    ).all();

    // Recent users
    const recentUsers = db.prepare(
      'SELECT id, name, email, role, created_at, last_login FROM users ORDER BY created_at DESC LIMIT 5'
    ).all();

    return res.status(200).json({
      stats: {
        totalUsers,
        totalAdmins,
        totalRegularUsers,
        todayLogins,
        weekLogins,
        totalWatchHistory,
        recentRegistrations,
        loginActivity,
        recentUsers,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
