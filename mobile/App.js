import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { io } from 'socket.io-client';
import { api, setToken, clearToken, BASE_URL } from './api';

/* ========= UI helpers ========= */
const Tick = ({ deliveredAt, readAt }) => (
  <Text style={{ marginLeft: 6, color: readAt ? '#2e7d32' : deliveredAt ? '#1976d2' : '#999' }}>
    {readAt ? '✓✓' : deliveredAt ? '✓✓' : '✓'}
  </Text>
);

const Avatar = ({ uri, label, size = 40 }) => {
  const initials = (label || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#eee' }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#1976d2',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
    </View>
  );
};

/* ========= Screens ========= */
const LoginScreen = ({ onLoggedIn, goRegister }) => {
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('alice123');
  const [error, setError] = useState('');
  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Login</Text>
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
      <TouchableOpacity
        style={styles.btn}
        onPress={async () => {
          try {
            const res = await api.post('/auth/login', { username, password });
            setToken(res.data.token);
            onLoggedIn(res.data.user, res.data.token);
          } catch (e) {
            setError('Invalid credentials');
          }
        }}
      >
        <Text style={styles.btnText}>Sign in</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={goRegister}>
        <Text style={{ marginTop: 16, color: '#1976d2' }}>Create account</Text>
      </TouchableOpacity>
      <Text style={{ marginTop: 24, color: '#999' }}>Server: {BASE_URL}</Text>
    </SafeAreaView>
  );
};

const RegisterScreen = ({ goLogin }) => {
  const [username, setUsername] = useState('newuser');
  const [name, setName] = useState('New User');
  const [password, setPassword] = useState('pass1234');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Register</Text>
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={styles.input} />
      <TextInput placeholder="Name (optional)" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <TextInput placeholder="Avatar URL (optional)" value={avatarUrl} onChangeText={setAvatarUrl} style={styles.input} />
      {msg ? <Text>{msg}</Text> : null}
      <TouchableOpacity
        style={styles.btn}
        onPress={async () => {
          try {
            await api.post('/auth/register', { username, password, name, avatarUrl });
            setMsg('Registered. Please login.');
          } catch (e) {
            setMsg('Username may be taken.');
          }
        }}
      >
        <Text style={styles.btnText}>Create</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={goLogin}>
        <Text style={{ marginTop: 16, color: '#1976d2' }}>Back to login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const HomeScreen = ({ user, openChat, socket, onLogout }) => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await api.get('/users');
      setUsers(res.data);
    })();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onPresence = (p) => setUsers((prev) => prev.map((u) => (u._id === p.userId ? { ...u, online: p.online } : u)));
    socket.on('presence:update', onPresence);
    return () => {
      socket.off('presence:update', onPresence);
    };
  }, [socket]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Welcome, {user.name || user.username}</Text>
        <TouchableOpacity onPress={onLogout} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#eee' }}>
          <Text style={{ fontWeight: '700' }}>Logout</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openChat(item)}
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: '#fff',
              marginVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar uri={item.avatarUrl} label={item.name || item.username} />
              <View>
                <Text style={{ fontSize: 18, fontWeight: '600' }}>{item.name || item.username}</Text>
                <Text style={{ color: '#666' }}>{item.username}</Text>
              </View>
            </View>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.online ? '#2e7d32' : '#999' }} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const ChatScreen = ({ me, peer, socket, goBack }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const flatlistRef = useRef(null);

  // typing helpers/refs
  const typingStopTimerRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const remoteAutoHideTimerRef = useRef(null);

  const TYPING_DEBOUNCE_MS = 800;
  const TYPING_THROTTLE_MS = 400;
  const REMOTE_AUTOHIDE_MS = 3000;

  const sendTypingStart = () => {
    const now = Date.now();
    if (!socket) return;
    if (now - lastTypingSentRef.current >= TYPING_THROTTLE_MS) {
      socket.emit('typing:start', { to: peer._id });
      lastTypingSentRef.current = now;
    }
  };
  const scheduleTypingStop = () => {
    if (!socket) return;
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => socket.emit('typing:stop', { to: peer._id }), TYPING_DEBOUNCE_MS);
  };

  useEffect(() => {
    (async () => {
      const res = await api.get(`/conversations/${peer._id}/messages?limit=50`);
      setMessages(res.data);
      const unread = res.data.filter((m) => String(m.to) === String(me._id) && !m.readAt).map((m) => m._id);
      if (unread.length) socket.emit('message:read', { from: peer._id, messageIds: unread });
    })();
  }, [peer._id]);

  useEffect(() => {
    if (!socket) return;

    const onNew = (msg) => {
      if (!((msg.from === peer._id && msg.to === me._id) || (msg.from === me._id && msg.to === peer._id))) return;
      setMessages((prev) => {
        if (msg.tempId) {
          const idx = prev.findIndex((m) => m._id === msg.tempId);
          if (idx !== -1) {
            const copy = prev.slice();
            copy[idx] = { ...prev[idx], ...msg, _id: msg._id };
            return copy;
          }
        }
        if (prev.some((m) => String(m._id) === String(msg._id))) return prev;
        return [...prev, msg];
      });
    };

    const onTypingStart = ({ from }) => {
      if (String(from) !== String(peer._id)) return;
      setTyping(true);
      if (remoteAutoHideTimerRef.current) clearTimeout(remoteAutoHideTimerRef.current);
      remoteAutoHideTimerRef.current = setTimeout(() => setTyping(false), REMOTE_AUTOHIDE_MS);
    };
    const onTypingStop = ({ from }) => {
      if (String(from) !== String(peer._id)) return;
      setTyping(false);
      if (remoteAutoHideTimerRef.current) clearTimeout(remoteAutoHideTimerRef.current);
    };
    const onRead = ({ by, messageIds }) => {
      if (String(by) === String(peer._id)) {
        setMessages((prev) => prev.map((m) => (messageIds.includes(String(m._id)) ? { ...m, readAt: new Date().toISOString() } : m)));
      }
    };
    const onDelivered = ({ by, messageIds }) => {
      setMessages((prev) => prev.map((m) => (messageIds.includes(String(m._id)) ? { ...m, deliveredAt: new Date().toISOString() } : m)));
    };

    socket.on('message:new', onNew);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('message:read', onRead);
    socket.on('message:delivered', onDelivered);

    return () => {
      socket.off('message:new', onNew);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('message:read', onRead);
      socket.off('message:delivered', onDelivered);
    };
  }, [socket, peer._id]);

  const onChangeText = (t) => {
    setInput(t);
    sendTypingStart();
    scheduleTypingStop();
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const tempId = 'tmp_' + Date.now();
    const optimistic = { _id: tempId, from: me._id, to: peer._id, content: input, createdAt: new Date().toISOString(), tempId };
    setMessages((prev) => [...prev, optimistic]);
    socket.emit('message:send', { to: peer._id, content: input, tempId });
    setInput('');
    flatlistRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    const unread = messages.filter((m) => String(m.to) === String(me._id) && !m.readAt).map((m) => m._id);
    if (unread.length) socket.emit('message:read', { from: peer._id, messageIds: unread });
  }, [messages]);

  useEffect(() => {
    return () => {
      try {
        socket?.emit('typing:stop', { to: peer?._id });
      } catch {}
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      if (remoteAutoHideTimerRef.current) clearTimeout(remoteAutoHideTimerRef.current);
    };
  }, []);

  const renderItem = ({ item }) => {
    const mine = String(item.from) === String(me._id);
    return (
      <View
        style={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          backgroundColor: mine ? '#DCF8C6' : '#fff',
          padding: 10,
          borderRadius: 12,
          marginVertical: 4,
          maxWidth: '80%',
        }}
      >
        <Text style={{ fontSize: 16 }}>{item.content}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: '#666' }}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
          {mine ? <Tick deliveredAt={item.deliveredAt} readAt={item.readAt} /> : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          padding: 12,
          borderBottomWidth: 1,
          borderColor: '#eee',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={goBack}>
          <Text style={{ color: '#1976d2' }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar uri={peer.avatarUrl} label={peer.name || peer.username} size={28} />
          <Text style={{ fontSize: 18, fontWeight: '600' }}>{peer.name || peer.username}</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>
      {typing ? <Text style={{ paddingHorizontal: 12, paddingTop: 6, color: '#666' }}>{peer.name || peer.username} is typing…</Text> : null}
      <FlatList ref={flatlistRef} contentContainerStyle={{ padding: 12 }} data={messages} keyExtractor={(item) => String(item._id)} renderItem={renderItem} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa' }}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="Type a message"
            value={input}
            onChangeText={onChangeText}
          />
          <TouchableOpacity style={styles.btn} onPress={sendMessage}>
            <Text style={styles.btnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ========= Root ========= */
export default function App() {
  const [screen, setScreen] = useState('login'); // login | register | home | chat
  const [user, setUser] = useState(null);
  const [token, setTok] = useState(null);
  const [peer, setPeer] = useState(null);
  const socketRef = useRef(null);

  const connectSocket = (tok) => {
    socketRef.current?.disconnect();
    socketRef.current = io(BASE_URL, { auth: { token: tok } });
    socketRef.current.on('connect_error', (e) => console.log('socket error', e.message));
  };

  const onLoggedIn = (u, tok) => {
    setUser(u);
    setTok(tok);
    connectSocket(tok);
    setScreen('home');
  };

  const openChat = (p) => {
    setPeer(p);
    setScreen('chat');
  };

  const logout = () => {
    try {
      socketRef.current?.disconnect();
    } catch {}
    clearToken();
    setTok(null);
    setUser(null);
    setPeer(null);
    setScreen('login');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f2f5f7' }}>
      {screen === 'login' && <LoginScreen onLoggedIn={onLoggedIn} goRegister={() => setScreen('register')} />}
      {screen === 'register' && <RegisterScreen goLogin={() => setScreen('login')} />}
      {screen === 'home' && <HomeScreen user={user} openChat={openChat} socket={socketRef.current} onLogout={logout} />}
      {screen === 'chat' && <ChatScreen me={user} peer={peer} socket={socketRef.current} goBack={() => setScreen('home')} />}
    </SafeAreaView>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  btn: { backgroundColor: '#1976d2', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
};

