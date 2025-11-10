const onlineUsers = new Map(); // userId -> socketId

export const setUserOnline = (userId, socketId) => onlineUsers.set(userId, socketId);
export const setUserOffline = (userId) => onlineUsers.delete(userId);
export const isUserOnline = (userId) => onlineUsers.has(userId);
export const getSocketIdByUser = (userId) => onlineUsers.get(userId);
export { onlineUsers };
