import getDb from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export default function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nama dan email harus diisi' });
  }
  if (name.length < 2) {
    return res.status(400).json({ error: 'Nama minimal 2 karakter' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Format email tidak valid' });
  }

  try {
    const db = getDb();

    // Check if email is taken by another user
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase(), user.id);
    if (existing) {
      return res.status(409).json({ error: 'Email sudah digunakan user lain' });
    }

    db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email.toLowerCase(), user.id);

    const updatedUser = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?').get(user.id);

    return res.status(200).json({ message: 'Profil berhasil diupdate', user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
