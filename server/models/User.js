import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  avatarUrl: { type: String, default: '' } ,
  username: { type: String, unique: true, required: true },
  name: { type: String },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
