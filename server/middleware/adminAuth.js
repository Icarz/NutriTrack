module.exports = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.SUPER_ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
