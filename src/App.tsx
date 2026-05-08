/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  logOut, 
  onAuthStateChanged,
  db, 
  StudyRoom, 
  ChatMessage, 
  UserProfile,
  handleFirestoreError,
  OperationType 
} from './firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Users, 
  MessageSquare, 
  ExternalLink, 
  LogOut, 
  BookOpen, 
  ChevronRight, 
  ShieldCheck, 
  Globe, 
  School,
  ArrowRight,
  Send,
  X,
  History,
  Info
} from 'lucide-react';

// --- Components ---

const LandingPage = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Hero Section */}
      <main className="grid grid-cols-1 lg:grid-cols-2 min-h-[90vh] relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none"></div>
        <div className="p-8 lg:p-24 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-200 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <BookOpen size={20} />
              </div>
              <span className="text-sm font-bold tracking-widest uppercase text-indigo-600">StudySphere</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-extrabold leading-[0.88] tracking-tighter mb-8 text-slate-900">
              PEER <br /> COLLAB <br /> LEARNING.
            </h1>
            
            <p className="max-w-md text-lg text-slate-500 mb-12">
              The student-driven platform for collaborative exam preparation. Connect with peers from different colleges and master your subjects together.
            </p>
            
            <button 
              onClick={onStart}
              className="group relative inline-flex items-center gap-4 bg-indigo-600 text-white rounded-full px-8 py-4 text-sm font-bold shadow-xl shadow-indigo-200 hover:scale-105 transition-all duration-300"
            >
              START COLLABORATING
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
        
        <div className="overflow-hidden bg-slate-900 relative group">
          <img 
            src="https://images.unsplash.com/photo-1523240715630-974bb1ad1932?q=80&w=2070&auto=format&fit=crop" 
            alt="Students Studying" 
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="text-white/10 select-none text-9xl font-black tracking-tighter">SPHERE</div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="py-24 px-8 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="flex flex-col gap-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Globe size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Cross-College</h3>
              <p className="text-slate-500 leading-relaxed">Interact with students studying the same subjects from colleges globally.</p>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MessageSquare size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Real-time Solving</h3>
              <p className="text-slate-500 leading-relaxed">Post your doubts and get them resolved instantly by peers in active rooms.</p>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Free & Accessible</h3>
              <p className="text-slate-500 leading-relaxed">Academic support should be universal. StudySphere is community-driven and free.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Dashboard = ({ user, onJoinRoom }: { user: any, onJoinRoom: (id: string) => void }) => {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRoom, setNewRoom] = useState({ title: '', subject: '', description: '', meetLink: '' });

  useEffect(() => {
    const q = query(
      collection(db, 'rooms'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyRoom));
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rooms');
    });

    return () => unsubscribe();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.title || !newRoom.subject) return;

    try {
      const roomData = {
        ...newRoom,
        creatorId: user.uid,
        creatorName: user.displayName || 'Anonymous',
        createdAt: new Date().toISOString(),
        status: 'active',
        participantCount: 1
      };
      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      setIsCreating(false);
      setNewRoom({ title: '', subject: '', description: '', meetLink: '' });
      onJoinRoom(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    }
  };

  const filteredRooms = rooms.filter(room => 
    room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pt-24 min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Dashboard</span>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Welcome back, {user.displayName?.split(' ')[0]}.</h2>
          <p className="text-slate-500">Pick a room and start your collaborative prep session.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:opacity-95 transition-all font-bold text-sm shadow-lg shadow-indigo-200"
        >
          <Plus size={18} />
          Create Room
        </button>
      </div>

      {/* Stats row from theme */}
      <div className="relative z-10 mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Rooms', value: '158', icon: <Users size={16} />, color: 'bg-indigo-100 text-indigo-600' },
          { label: 'Doubts Solved', value: '12.4k', icon: <MessageSquare size={16} />, color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Network', value: '14 Colleges', icon: <Globe size={16} />, color: 'bg-rose-100 text-rose-600' },
          { label: 'Streak', value: '12 Days 🔥', icon: null, color: 'bg-slate-900 text-white' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} p-4 rounded-lg border border-slate-200/50 flex items-center gap-4`}>
             {stat.icon && <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center">{stat.icon}</div>}
             <div>
                <p className="text-[10px] uppercase font-bold opacity-70">{stat.label}</p>
                <p className="text-sm font-bold">{stat.value}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative z-10 mb-12">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input 
          type="text"
          placeholder="Search subjects: Organic Chemistry, Data Structures..."
          className="block w-full bg-white border border-slate-200 rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Room Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))
        ) : filteredRooms.length > 0 ? (
          filteredRooms.map(room => (
            <motion.div 
              key={room.id}
              layoutId={room.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:border-indigo-500 transition-all cursor-pointer group flex flex-col justify-between"
              onClick={() => onJoinRoom(room.id)}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full ${
                    room.subject === 'Biology' ? 'bg-orange-50 text-orange-600' :
                    room.subject === 'Economics' ? 'bg-purple-50 text-purple-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    {room.subject}
                  </span>
                  <span className="flex items-center text-emerald-500 text-xs font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span> 
                    Live
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{room.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{room.description}</p>
              </div>
              
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Users size={14} />
                  <span className="font-medium">{room.participantCount} active</span>
                </div>
                <button className="text-sm font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Join Room <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-400 font-medium">
            No active rooms found for "{searchQuery}". Launch a new session!
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleCreateRoom}
              className="bg-white rounded-xl p-8 w-full max-w-lg shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">New Session</span>
                  <h2 className="text-2xl font-extrabold tracking-tight">Create Room</h2>
                </div>
                <button type="button" onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Topic / Title</label>
                  <input 
                    required
                    type="text"
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. Macroeconomics Exam Prep"
                    value={newRoom.title}
                    onChange={(e) => setNewRoom({...newRoom, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Subject</label>
                  <input 
                    required
                    type="text"
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. Economics"
                    value={newRoom.subject}
                    onChange={(e) => setNewRoom({...newRoom, subject: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Description</label>
                  <textarea 
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-24 resize-none"
                    placeholder="Briefly describe the session objective..."
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Resources Link (Optional)</label>
                  <input 
                    type="text"
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Google Meet, Discord, or Note link"
                    value={newRoom.meetLink}
                    onChange={(e) => setNewRoom({...newRoom, meetLink: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-4 rounded-lg mt-8 font-bold shadow-lg shadow-indigo-100 hover:opacity-95 transition-all text-sm"
              >
                Launch Study Room
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RoomPage = ({ roomId, user, onLeave }: { roomId: string, user: any, onLeave: () => void }) => {
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Room details
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoom({ id: docSnap.id, ...docSnap.data() } as StudyRoom);
      } else {
        onLeave();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
    });

    // Chat messages
    const msgsRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(msgsRef, orderBy('timestamp', 'asc'));
    const unsubMsgs = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/messages`);
    });

    // Increment participant count on entry (very simple implementation)
    const updateParticipants = async () => {
      try {
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          await updateDoc(roomRef, {
            participantCount: (snap.data()?.participantCount || 0) + 1
          });
        }
      } catch (e) {}
    };
    updateParticipants();

    return () => {
      unsubRoom();
      unsubMsgs();
    };
  }, [roomId, onLeave]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const msgData = {
        roomId,
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        content: newMessage,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'rooms', roomId, 'messages'), msgData);
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rooms/${roomId}/messages`);
    }
  };

  if (!room) return null;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 pt-16 font-sans">
      {/* Sidebar - Room Info */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 340 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="border-r border-slate-200 flex flex-col h-full bg-white overflow-hidden relative"
      >
        <div className="p-8 pb-4">
          <button 
            onClick={onLeave}
            className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest mb-10 transition-colors bg-indigo-50 px-3 py-2 rounded-lg"
          >
            <ChevronRight className="rotate-180" size={14} />
            Exit to Dashboard
          </button>
          
          <div className="space-y-4">
            <span className="px-3 py-1 bg-slate-100 text-[10px] font-bold uppercase tracking-wider rounded-lg text-slate-500">
              {room.subject}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">{room.title}</h1>
            <p className="text-sm text-slate-500 leading-relaxed">{room.description}</p>
          </div>
          
          <div className="mt-10 space-y-3">
             <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Users className="text-slate-400" size={18} />
                   <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Participants</span>
                </div>
                <span className="text-sm font-extrabold">{room.participantCount}</span>
             </div>
             <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3 text-emerald-700">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Session Live</span>
             </div>
          </div>
        </div>

        <div className="mt-auto p-8 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-8">
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${room.creatorName}`} alt="Creator" className="w-10 h-10 rounded-lg border-2 border-white shadow-sm object-cover" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Moderator</p>
              <p className="text-sm font-bold text-slate-800">{room.creatorName}</p>
            </div>
          </div>
          
          {room.meetLink && (
            <a 
              href={room.meetLink.startsWith('http') ? room.meetLink : `https://${room.meetLink}`} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-lg transition-all font-bold text-sm shadow-xl shadow-slate-200"
            >
              <ExternalLink size={18} />
              Open Call / Feed
            </a>
          )}
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none"></div>
        
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 relative z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Info size={20} />}
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <h2 className="font-extrabold text-xs uppercase tracking-widest text-slate-500">Live Peer Chat</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 relative z-10">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto">
              <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 mb-6 border border-slate-100">
                <MessageSquare size={32} />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900 mb-2">Start the Knowledge Exchange</h3>
              <p className="text-sm text-slate-400">Doubt or insight? Share it with the group here.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id} className={`flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                { (i === 0 || messages[i-1].senderId !== msg.senderId) && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 mx-1">
                    {msg.senderId === user.uid ? 'Me' : msg.senderName}
                  </span>
                )}
                <div className={`max-w-[70%] px-5 py-3.5 rounded-xl text-sm font-medium shadow-sm border ${
                  msg.senderId === user.uid 
                  ? 'bg-indigo-600 text-white border-indigo-700/50 rounded-tr-none' 
                  : 'bg-white text-slate-800 border-slate-200/50 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 pt-0 relative z-10">
          <form 
            onSubmit={handleSendMessage}
            className="bg-white border border-slate-200 rounded-xl flex items-center p-2 shadow-lg shadow-slate-200/50 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all"
          >
            <input 
              type="text"
              placeholder="Post your doubt or answer here..."
              className="flex-1 px-4 py-2.5 outline-none text-sm text-slate-700 font-medium h-12"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-indigo-600 text-white h-10 w-10 flex items-center justify-center rounded-lg disabled:opacity-20 transition-all hover:bg-indigo-700 shadow-md shadow-indigo-100"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};


export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStart = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#fdfcfb]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold tracking-widest text-[#1a1a1a] animate-pulse">STUDYSPHERE</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Global Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${currentRoomId || user ? 'bg-white border-b border-slate-200 h-20' : 'bg-transparent h-20'} flex items-center`}>
        <div className="max-w-6xl mx-auto w-full px-6 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setCurrentRoomId(null)}
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-all">
              <div className="w-5 h-5 border-2 border-white rounded-full"></div>
            </div>
            <span className="font-extrabold tracking-tighter text-2xl text-slate-900 uppercase">StudySphere</span>
          </div>

          {user && (
            <div className="flex items-center gap-8">
              <nav className="hidden lg:flex gap-8 text-sm font-bold uppercase tracking-widest text-slate-400">
                <button onClick={() => setCurrentRoomId(null)} className="hover:text-indigo-600 transition-colors">Discover</button>
                <button className="hover:text-indigo-600 transition-colors">Resources</button>
              </nav>
              
              <div className="flex items-center gap-4 border-l border-slate-100 pl-8">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-extrabold leading-none text-slate-900">{user.displayName}</span>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Student</span>
                </div>
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  className="w-10 h-10 rounded-full border-2 border-white shadow-md" 
                  alt="My Profile" 
                />
                <button 
                  onClick={() => { logOut(); setCurrentRoomId(null); }} 
                  className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all border border-slate-100"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LandingPage onStart={handleStart} />
          </motion.div>
        ) : currentRoomId ? (
          <motion.div
            key="room"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <RoomPage 
              roomId={currentRoomId} 
              user={user} 
              onLeave={() => setCurrentRoomId(null)} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard user={user} onJoinRoom={(id) => setCurrentRoomId(id)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
