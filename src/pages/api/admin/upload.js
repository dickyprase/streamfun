import { requireAdmin } from '@/lib/auth';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 2 * 1024 * 1024, // 2MB
    filter: ({ mimetype }) => {
      return mimetype && (mimetype.includes('image/png') || mimetype.includes('image/jpeg') || mimetype.includes('image/webp'));
    },
  });

  try {
    const [fields, files] = await form.parse(req);
    const file = files.logo?.[0];

    if (!file) {
      return res.status(400).json({ error: 'File logo harus diupload (PNG/JPG/WebP, max 2MB)' });
    }

    // Rename file to a consistent name
    const ext = path.extname(file.originalFilename || '.png');
    const newFilename = `site-logo${ext}`;
    const newPath = path.join(uploadDir, newFilename);

    // Remove old logo if exists
    const oldFiles = fs.readdirSync(uploadDir).filter(f => f.startsWith('site-logo'));
    oldFiles.forEach(f => {
      try { fs.unlinkSync(path.join(uploadDir, f)); } catch {}
    });

    fs.renameSync(file.filepath, newPath);

    const logoUrl = `/uploads/${newFilename}`;

    return res.status(200).json({
      message: 'Logo berhasil diupload',
      url: logoUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Gagal upload file' });
  }
}
