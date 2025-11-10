import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = await User.findById(payload.sub).select('_id username name avatarUrl');
    if (!user) return res.status(401).json({ error: 'invalid token' });
    req.user = user;
    next();
  } catch (e) { return res.status(401).json({ error: 'invalid token' }); }
};

export const authSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('missing token'));
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = await User.findById(payload.sub).select('_id username name avatarUrl');
    if (!user) return next(new Error('invalid token'));
    socket.user = user;
    next();
  } catch (e) { next(new Error('invalid token')); }
};
