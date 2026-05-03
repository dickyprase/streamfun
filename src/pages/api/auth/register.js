import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { generateToken, setAuthCookie } from '@/lib/auth';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Semua field harus diisi' });
  }
  if (name.length < 2) {
    return res.status(400).json({ error: 'Nama minimal 2 karakter' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Format email tidak valid' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter' });
  }

  try {
    const db = getDb();

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email sudah terdaftar' });
    }

    // Hash password and create user
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password, role, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))'
    ).run(name, email.toLowerCase(), hashedPassword, 'user');

    const user = {
      id: result.lastInsertRowid,
      name,
      email: email.toLowerCase(),
      role: 'user',
    };

    // Generate token and set cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      message: 'Registrasi berhasil',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
