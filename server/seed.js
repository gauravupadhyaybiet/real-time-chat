import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatapp';

await mongoose.connect(MONGO_URI);

const users = [
  { username: 'alice', name: 'Alice', password: 'alice123' },
  { username: 'bob', name: 'Bob', password: 'bob123' },
  { username: 'charlie', name: 'Charlie', password: 'charlie123' }
];

for (const u of users) {
  const exists = await User.findOne({ username: u.username });
  if (!exists) {
    const hash = await bcrypt.hash(u.password, 10);
    await User.create({ username: u.username, name: u.name, passwordHash: hash });
    console.log('Created', u.username);
  }
}

await mongoose.disconnect();
console.log('Seed complete');
process.exit(0);
