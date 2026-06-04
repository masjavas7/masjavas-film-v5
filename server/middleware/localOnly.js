/**
 * Restricts routes to loopback clients (local desktop / dev only).
 */
export function localOnly(req, res, next) {
  const ip = (req.ip || req.socket?.remoteAddress || '').replace('::ffff:', '');
  const allowed =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip === '';

  if (!allowed) {
    return res.status(403).json({ error: 'Endpoint hanya tersedia dari localhost.' });
  }
  next();
}

export default localOnly;