import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = express.Router();

router.get('/:id/messages', requireAuth, async (req, res) => {
  const otherId = req.params.id;
  const me = req.user._id;
  const limit = Math.min(parseInt(req.query.limit || '50'), 200);
  const msgs = await Message.find({
    $or: [
      { from: me, to: otherId },
      { from: otherId, to: me }
    ]
  }).sort({ createdAt: -1 }).limit(limit);
  res.json(msgs.reverse());
});

router.get('/last/all', requireAuth, async (req, res) => {
  const me = req.user._id;
  const agg = await Message.aggregate([
    { $match: { $or: [ { from: me }, { to: me } ] } },
    { $project: {
      other: { $cond: [ { $eq: ['$from', me] }, '$to', '$from' ] },
      from: 1, to: 1, content: 1, createdAt: 1, deliveredAt: 1, readAt: 1
    }},
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$other', last: { $first: '$$ROOT' } } }
  ]);
  res.json(agg);
});

export default router;
