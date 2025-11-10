import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, avatarUrl } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username & password required' });
    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ error: 'username taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash: hash, name: name || username, avatarUrl: avatarUrl || '' });
    res.status(201).json({ user: { _id: user._id, username: user.username, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, username: user.username, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
