/**
 * Client-side log relay to server terminal.
 * POST { message, level } → prints to server console.
 */
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({});
  const { message, level = 'info' } = req.body || {};
  if (!message) return res.status(200).json({});

  const prefix = `[CLIENT ${level.toUpperCase()}]`;
  if (level === 'error') console.error(prefix, message);
  else if (level === 'warn') console.warn(prefix, message);
  else console.log(prefix, message);

  return res.status(200).json({ ok: true });
}
