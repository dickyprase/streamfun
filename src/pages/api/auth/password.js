import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export default function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Password lama dan baru harus diisi' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
  }

  try {
    const db = getDb();

    // Get current user with password
    const dbUser = db.prepare('SELECT password FROM users WHERE id = ?').get(user.id);
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = bcrypt.compareSync(currentPassword, dbUser.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Password lama salah' });
    }

    // Hash and update new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);

    return res.status(200).json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
