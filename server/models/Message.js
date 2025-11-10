import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const MessageSchema = new mongoose.Schema({
  from: { type: ObjectId, ref: 'User', required: true },
  to: { type: ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  deliveredAt: { type: Date, default: null },
  readAt: { type: Date, default: null }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model('Message', MessageSchema);
