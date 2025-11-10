import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import { isUserOnline } from '../utils/presence.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const me = req.user._id.toString();
  const users = await User.find({ _id: { $ne: me } }).select('_id username name avatarUrl').lean();
  const withPresence = users.map(u => ({ ...u, online: isUserOnline(u._id.toString()) }));
  res.json(withPresence);
});

export default router;
