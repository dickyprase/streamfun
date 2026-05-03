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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = 'SELECT id, name, email, role, avatar, created_at, last_login FROM users';
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    const params = [];

    if (search) {
      const searchClause = ' WHERE name LIKE ? OR email LIKE ?';
      query += searchClause;
      countQuery += searchClause;
      params.push(`%${search}%`, `%${search}%`);
    }

    const total = db.prepare(countQuery).get(...params).count;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const users = db.prepare(query).all(...params, limit, offset);

    return res.status(200).json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Users list error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
