import getDb from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export default function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.query;
  const userId = parseInt(id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const db = getDb();

  // PUT - Update user
  if (req.method === 'PUT') {
    const { name, email, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Semua field harus diisi' });
    }
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid' });
    }

    // Prevent admin from demoting themselves
    if (userId === admin.id && role !== 'admin') {
      return res.status(400).json({ error: 'Tidak bisa mengubah role sendiri' });
    }

    try {
      // Check if email is taken by another user
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase(), userId);
      if (existing) {
        return res.status(409).json({ error: 'Email sudah digunakan user lain' });
      }

      db.prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?').run(name, email.toLowerCase(), role, userId);

      const updatedUser = db.prepare('SELECT id, name, email, role, avatar, created_at, last_login FROM users WHERE id = ?').get(userId);

      if (!updatedUser) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }

      return res.status(200).json({ message: 'User berhasil diupdate', user: updatedUser });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // DELETE - Delete user
  if (req.method === 'DELETE') {
    // Prevent admin from deleting themselves
    if (userId === admin.id) {
      return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
    }

    try {
      const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }

      // Delete watch history first
      db.prepare('DELETE FROM watch_history WHERE user_id = ?').run(userId);
      // Delete user
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      return res.status(200).json({ message: 'User berhasil dihapus' });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
