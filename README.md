# React Native + Node.js Real-time Chat (MVP)

Monorepo with `/server` (Express + Socket.IO + MongoDB) and `/mobile` (React Native with Expo).

## Features
- JWT auth (register/login)
- User list with online/offline
- 1:1 real-time chat (Socket.IO)
- Message persistence in MongoDB
- Typing indicators
- Delivery and read receipts (single/double ticks)
- Last message per conversation (API: `GET /conversations/last/all`)

---

## Quick Start

### 1) Server
```bash
cd server
cp .env.example .env
npm install
npm run seed   # adds sample users: alice, bob, charlie
npm run dev    # or: npm start
```
Server runs on `http://localhost:4000` by default.

### 2) Mobile (Expo)
```bash
cd ../mobile
npm install
# Update BASE_URL in api.js if needed (e.g. your LAN IP if running on device)
npx expo start
```
Use two accounts (e.g. `alice/alice123` and `bob/bob123`) in two simulators/devices.

---

## API

- `POST /auth/register` `{ username, password, name? }`
- `POST /auth/login` `{ username, password }` -> `{ token, user }`
- `GET /users` (Bearer token) -> list of users with `online`
- `GET /conversations/:id/messages?limit=50`
- `GET /conversations/last/all` -> last message per peer

### Socket events
- `message:send` `{ to, content, tempId }`
- `message:new` (server -> clients)
- `typing:start|stop` `{ to }`
- `message:read` `{ from, messageIds }`
- `presence:update` `{ userId, online }`

same host.
- Login with seeded users: `alice/alice123`, `bob/bob123`, `charlie/charlie123`.
- Typing indicator triggers when you type; stops after 800ms idle.
- Ticks: ✓ (sent), ✓✓ blue (delivered), ✓✓ green (read).


### Web/Windows Tips
- If web shows MIME issue, run `npm run web` or `EXPO_USE_METRO_FOR_WEB=0 npx expo start --web -c`.
- Android emulator: set `BASE_URL='http://10.0.2.2:4000'`.
- If install fails, remove node_modules/locks then `npx expo install`.

- Register screen now supports optional Avatar URL.
- Typing indicator auto-hides after 2s if no stop signal.
- Duplicate messages fixed via optimistic reconciliation.
