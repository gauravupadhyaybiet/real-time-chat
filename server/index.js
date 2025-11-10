import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import convRoutes from './routes/conversations.js';
import { authSocket } from './middleware/auth.js';
import { setUserOnline, setUserOffline, getSocketIdByUser } from './utils/presence.js';
import Message from './models/Message.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (_req, res) => res.send({ ok: true }));

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/conversations', convRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

io.use(authSocket);

io.on('connection', async (socket) => {
  const user = socket.user;
  const userId = user._id.toString();            // NOTE: force string id once
  setUserOnline(userId, socket.id);
  io.emit('presence:update', { userId, online: true });

  // Mark undelivered messages as delivered when recipient connects
  try {
    const undelivered = await Message.find({ to: user._id, deliveredAt: null }).select('_id from');
    if (undelivered.length) {
      const ids = undelivered.map(m => m._id);
      await Message.updateMany({ _id: { $in: ids } }, { $set: { deliveredAt: new Date() } });
      const bySender = new Map();
      for (const m of undelivered) {
        const k = m.from.toString();
        if (!bySender.has(k)) bySender.set(k, []);
        bySender.get(k).push(m._id.toString());
      }
      for (const [senderId, messageIds] of bySender.entries()) {
        const sSock = getSocketIdByUser(senderId);
        if (sSock) io.to(sSock).emit('message:delivered', { by: userId, messageIds });
      }
    }
  } catch (e) { console.error('deliver on connect error', e.message); }

  // --- Typing events ---
  socket.on('typing:start', ({ to }) => {
    if (!to) return;
    const toId = to.toString();                   // NOTE: normalize
    if (toId === userId) return;                  // NOTE: avoid echo to self
    const toSocket = getSocketIdByUser(toId);
    if (toSocket) {
      io.to(toSocket).emit('typing:start', { from: userId }); // NOTE: send string id
    }
  });

  socket.on('typing:stop', ({ to }) => {
    if (!to) return;
    const toId = to.toString();
    if (toId === userId) return;
    const toSocket = getSocketIdByUser(toId);
    if (toSocket) {
      io.to(toSocket).emit('typing:stop', { from: userId });  // NOTE: send string id
    }
  });

  // --- Send message ---
  socket.on('message:send', async ({ to, content, tempId }) => {
    if (!to || !content) return;
    const toId = to.toString();
    const msg = await Message.create({
      from: user._id,
      to: toId,
      content,
      deliveredAt: getSocketIdByUser(toId) ? new Date() : null
    });

    const payload = {
      _id: msg._id.toString(),
      from: msg.from.toString(),
      to: msg.to.toString(),
      content: msg.content,
      createdAt: msg.createdAt,
      deliveredAt: msg.deliveredAt,
      readAt: msg.readAt,
      tempId
    };

    const toSocket = getSocketIdByUser(toId);
    if (toSocket) io.to(toSocket).emit('message:new', payload);
    socket.emit('message:new', payload); // echo/confirm to sender (with real id)
  });

  // --- Read receipts ---
  socket.on('message:read', async ({ from, messageIds }) => {
    if (!from || !Array.isArray(messageIds) || messageIds.length === 0) return;
    try {
      await Message.updateMany(
        { _id: { $in: messageIds }, to: user._id, readAt: null },
        { $set: { readAt: new Date() } }
      );
    } catch (e) {
      console.error('message:read update error', e.message);
    }
    const fromId = from.toString();
    const fromSocket = getSocketIdByUser(fromId);
    if (fromSocket) io.to(fromSocket).emit('message:read', { by: userId, messageIds: messageIds.map(String) });
    socket.emit('message:read', { by: userId, messageIds: messageIds.map(String) });
  });

  socket.on('disconnect', () => {
    setUserOffline(userId);
    io.emit('presence:update', { userId, online: false });
  });
});

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatapp';

mongoose.connect(MONGO_URI).then(() => {
  server.listen(PORT, () => console.log('Server listening on ' + PORT));
}).catch(err => {
  console.error('MongoDB connection error:', err.message);
  process.exit(1);
});

