/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  logOut, 
  onAuthStateChanged,
  db, 
  StudyRoom, 
  ChatMessage, 
  UserProfile,
  Participation,
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
  getDoc,
  setDoc,
  limit,
  deleteDoc,
  increment
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
  Info,
  FilePlus,
  Link,
  Trash2,
  Video,
  Bell,
  Calendar,
  StickyNote,
  Clock,
  Edit2,
  Check,
  RotateCcw,
  MessageCircle,
  Paperclip,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { Conversation, DirectMessage as DMType, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- Components ---

// --- DM Components ---

const DirectMessagePanel = ({ 
  user, 
  conversationId, 
  onClose 
}: { 
  user: any, 
  conversationId: string, 
  onClose: () => void 
}) => {
  const [messages, setMessages] = useState<DMType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubConv = onSnapshot(doc(db, 'conversations', conversationId), (snap) => {
      if (snap.exists()) setConversation({ id: snap.id, ...snap.data() } as Conversation);
    }, (e) => handleFirestoreError(e, OperationType.GET, `conversations/${conversationId}`));

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const unsubMsgs = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as DMType)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, `conversations/${conversationId}/messages`));

    return () => {
      unsubConv();
      unsubMsgs();
    };
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const msgData = {
        senderId: user.uid,
        content: newMessage,
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), msgData);
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: newMessage,
        updatedAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (e) {
      console.error('Send DM error:', e);
    }
  };

  if (!conversation) return (
    <div className="flex h-full items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
  
  const otherParticipantName = (Object.entries(conversation.participantNames)
    .find(([uid]) => uid !== user.uid)?.[1] as string) || 'Peer';

  return (
    <div className="flex flex-col h-full bg-white shadow-2xl">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold uppercase">
            {otherParticipantName.charAt(0)}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">{otherParticipantName}</h4>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Direct Message</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
              msg.senderId === user.uid 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50 shadow-sm'
            }`}>
              {msg.content}
              <div className={`text-[8px] mt-1 opacity-60 ${msg.senderId === user.uid ? 'text-right' : 'text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-10 opacity-30 select-none">
            <MessageCircle size={32} className="mx-auto mb-2 text-indigo-600" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Start of conversation</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex gap-2 bg-slate-50/50">
        <input 
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-inner"
        />
        <button type="submit" disabled={!newMessage.trim()} className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-indigo-100">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

const ConversationsList = ({ 
  user, 
  onSelectConversation,
  activeConversationId,
  onClose
}: { 
  user: any, 
  onSelectConversation: (id: string) => void,
  activeConversationId: string | null,
  onClose: () => void
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
      setLoading(false);
    }, (e) => {
      console.error('Fetch conversations error:', e);
      setLoading(false);
    });
  }, [user.uid]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Messages</h3>
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
          </div>
        ) : conversations.length > 0 ? (
          conversations.map(conv => {
            const otherNameArr = Object.entries(conv.participantNames)
              .find(([uid]) => uid !== user.uid);
            const otherName = (otherNameArr?.[1] as string) || 'Peer';
            const isActive = activeConversationId === conv.id;

            return (
              <button 
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full p-4 border-b border-slate-50 flex items-start gap-4 transition-all text-left group ${
                  isActive ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                  isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white'
                }`}>
                  {otherName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className={`text-[11px] font-bold truncate ${isActive ? 'text-indigo-600' : 'text-slate-900'}`}>{otherName}</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                      {new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className={`text-[10px] truncate italic ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {conv.lastMessage || 'Click to start chatting...'}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-10 text-center text-slate-400 italic text-[10px]">
            <MessageCircle size={28} className="mx-auto mb-4 opacity-20 text-indigo-600" />
            No conversations yet.<br />Connect with peers to start<br />collaborating privately.
          </div>
        )}
      </div>
    </div>
  );
};

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
            <h1 className="text-5xl md:text-8xl font-extrabold leading-[0.85] md:leading-[0.88] tracking-tighter mb-8 text-slate-900">
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
  const [history, setHistory] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'active'>('newest');
  const [isCreating, setIsCreating] = useState(false);
  const [newRoom, setNewRoom] = useState({ title: '', subject: '', description: '', meetLink: '', durationMinutes: 120, enableChat: true });

  const [reminders, setReminders] = useState<any[]>([]);

  const removeReminder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'reminders', id));
    } catch (e) {
      console.error('Remove reminder error:', e);
    }
  };

  const setReminder = async (room: StudyRoom, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const reminderDate = prompt("Set reminder time (HH:MM)? e.g. 16:30");
      if (!reminderDate) return;

      await addDoc(collection(db, 'users', user.uid, 'reminders'), {
        roomId: room.id,
        roomTitle: room.title,
        time: reminderDate,
        createdAt: new Date().toISOString()
      });
      alert(`Reminder set for ${reminderDate}! We'll notify you on your dashboard.`);
    } catch (e) {
      console.error('Set reminder error:', e);
    }
  };

  const handleEndRoom = async (roomId: string) => {
    try {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'closed' });
      alert('Room has been closed successfully.');
    } catch (error) {
      console.error('End room error:', error);
      alert('Failed to end the room.');
    }
  };

  useEffect(() => {
    // Rooms listener
    const qRooms = query(
      collection(db, 'rooms'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyRoom));
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rooms');
    });

    // Reminders listener
    const qReminders = query(collection(db, 'users', user.uid, 'reminders'));
    const unsubReminders = onSnapshot(qReminders, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/reminders`);
    });

    // History listener
    const qHistory = query(
      collection(db, 'users', user.uid, 'participation'),
      orderBy('joinedAt', 'desc'),
      limit(10)
    );

    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participation));
      setHistory(historyData);
      setHistoryLoading(false);
    }, (error) => {
      // Don't fail the whole dashboard if history fails (might be permissions or missing collection)
      console.error('History Error:', error);
      setHistoryLoading(false);
    });

    return () => {
      unsubRooms();
      unsubHistory();
      unsubReminders();
    };
  }, [user.uid]);

  // Check for reminders every minute
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      reminders.forEach(rem => {
        if (rem.time === currentHHMM) {
          // Simple browser alert since we can't reliably do push in this sandbox
          alert(`REMINDER: Your study session "${rem.roomTitle}" is starting now!`);
          // Optionally remove reminder to avoid repeat alerts
          removeReminder(rem.id);
        }
      });
    };

    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [reminders]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.title || !newRoom.subject) return;

    try {
      const roomData = {
        ...newRoom,
        durationMinutes: Number(newRoom.durationMinutes) || 120,
        creatorId: user.uid,
        creatorName: user.displayName || 'Anonymous',
        createdAt: new Date().toISOString(),
        status: 'active',
        participantCount: 1
      };
      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      setIsCreating(false);
      setNewRoom({ title: '', subject: '', description: '', meetLink: '', durationMinutes: 120, enableChat: true });
      onJoinRoom(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    }
  };

  const filteredRooms = rooms
    .filter(room => {
      const matchesSearch = room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          room.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = filterSubject === 'All' || room.subject === filterSubject;
      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => {
      if (sortBy === 'active') return b.participantCount - a.participantCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const subjects = ['All', ...Array.from(new Set(rooms.map(r => r.subject)))];
  const trendingRooms = [...rooms].sort((a, b) => b.participantCount - a.participantCount).slice(0, 3);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pt-24 md:pt-32 pb-20 lg:pb-8 min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Dashboard</span>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">
            Welcome back, {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Scholar'}.
          </h2>
          <p className="text-slate-500 font-medium">Global peer intelligence. Solving doubts since 2026.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-4 rounded-xl hover:scale-105 active:scale-95 transition-all font-bold text-sm shadow-xl shadow-indigo-100"
        >
          <Plus size={20} />
          Create Room
        </button>
      </div>

      {/* Stats row from theme */}
      <div className="relative z-10 mb-8 lg:mb-12 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Active Rooms', value: '158', icon: <Users size={14} />, color: 'bg-indigo-100 text-indigo-600' },
          { label: 'Doubts Solved', value: '12.4k', icon: <MessageSquare size={14} />, color: 'bg-emerald-100 text-emerald-600' },
          { label: 'Streak', value: '12 Days 🔥', icon: null, color: 'bg-slate-900 text-white' },
          { label: 'Sessions', value: history.length.toString(), icon: <Calendar size={14} />, color: 'bg-slate-100 text-slate-600' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} p-3 lg:p-4 rounded-lg border border-slate-200/50 flex items-center gap-3 lg:gap-4`}>
             {stat.icon && <div className="hidden sm:flex w-8 h-8 lg:w-10 lg:h-10 rounded bg-white/20 items-center justify-center shrink-0">{stat.icon}</div>}
             <div>
                <p className="text-[8px] lg:text-[10px] uppercase font-bold opacity-70 leading-none mb-1">{stat.label}</p>
                <p className="text-xs lg:text-sm font-bold leading-none">{stat.value}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="relative z-10 mb-12 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input 
              type="text"
              placeholder="Search subjects: Organic Chemistry, Data Structures..."
              className="block w-full bg-white border border-slate-200 rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider outline-none focus:border-indigo-500 transition-all"
            >
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider outline-none focus:border-indigo-500 transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="active">Most Active</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trending Section */}
      {!searchQuery && filterSubject === 'All' && trendingRooms.length > 0 && (
        <div className="relative z-10 mb-12">
           <div className="flex items-center gap-3 mb-6">
              <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">Trending Now</h3>
              <div className="flex-1 h-px bg-slate-200"></div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trendingRooms.map(room => (
                 <motion.div 
                   key={`trending-${room.id}`}
                   whileHover={{ y: -4 }}
                   onClick={() => onJoinRoom(room.id)}
                   className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-7 text-white shadow-2xl shadow-indigo-200 cursor-pointer relative overflow-hidden group"
                 >
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                       <span className="text-[10px] font-bold uppercase bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1 rounded-lg inline-block">{room.subject}</span>
                       <button 
                         onClick={(e) => setReminder(room, e)}
                         className="p-2 hover:bg-white/20 rounded-xl transition-colors border border-white/10"
                         title="Set Reminder"
                       >
                         <Bell size={16} />
                       </button>
                    </div>
                    <h4 className="text-2xl font-black mb-1 line-clamp-1 relative z-10 tracking-tight">{room.title}</h4>
                    <div className="flex items-center gap-3 mt-6 text-[10px] font-black uppercase tracking-[0.1em] text-indigo-100 relative z-10">
                       <Users size={16} />
                       {room.participantCount} peers active
                    </div>
                 </motion.div>
              ))}
           </div>
        </div>
      )}

      {/* Room Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
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
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                        <Users size={14} className="text-slate-300" />
                        <span>{room.participantCount}</span>
                      </div>
                      <button 
                         onClick={(e) => setReminder(room, e)}
                         className="text-slate-300 hover:text-indigo-600 transition-colors"
                         title="Set Reminder"
                      >
                         <Bell size={14} />
                      </button>
                      {room.creatorId === user.uid && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to end this room? It will be removed from the discovery feed.')) {
                              handleEndRoom(room.id);
                            }
                          }}
                          className="text-rose-400 hover:text-rose-600 transition-colors p-1"
                          title="End Room"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <button className="text-sm font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Join Room <ArrowRight size={14} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-slate-400 font-medium bg-white border border-slate-200 rounded-xl border-dashed">
                No active rooms found for "{searchQuery}". Launch a new session!
              </div>
            )}
          </div>
        </div>

        {/* Study History Sidebar */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 border-l-4 border-orange-400 pl-3">Session Reminders</h3>
              <Clock size={16} className="text-slate-300" />
            </div>
            <div className="space-y-4">
               {reminders.length > 0 ? (
                 reminders.map(rem => (
                   <div key={rem.id} className="p-3 bg-orange-50/50 rounded-lg border border-orange-100 relative group">
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Today at {rem.time}</p>
                      <p className="text-xs font-extrabold text-slate-800 line-clamp-1 pr-6">{rem.roomTitle}</p>
                      <button 
                        onClick={() => removeReminder(rem.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                         <X size={12} />
                      </button>
                   </div>
                 ))
               ) : (
                 <p className="text-[10px] text-slate-400 italic text-center py-4">No scheduled reminders.</p>
               )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-900 border-l-4 border-indigo-600 pl-3">Study History</h3>
              <History size={16} className="text-slate-300" />
            </div>
            
            <div className="space-y-4">
              {historyLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />
                ))
              ) : history.length > 0 ? (
                history.map(item => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-indigo-200 transition-colors cursor-default">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.roomTitle}</p>
                    <div className="flex justify-between items-center mt-2">
                       <span className="text-[10px] font-bold text-indigo-500 uppercase">{item.roomSubject}</span>
                       <span className="text-[9px] text-slate-400">{new Date(item.joinedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                  <p className="text-xs text-slate-400 px-4">Your study journey starts here. Join your first room!</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl shadow-slate-200">
             <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">Pro Tip</h4>
             <p className="text-xs text-slate-300 leading-relaxed">Collaborative study increases retention by 40%. Join rooms with subjects you find challenging.</p>
          </div>
        </div>
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
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create Room</h2>
                <button type="button" onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-xl transition-colors">
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Duration (Minutes)</label>
                  <div className="flex gap-4 items-center">
                    <input 
                      type="range"
                      min="30"
                      max="300"
                      step="30"
                      className="flex-1 accent-indigo-600"
                      value={newRoom.durationMinutes}
                      onChange={(e) => setNewRoom({...newRoom, durationMinutes: Number(e.target.value)})}
                    />
                    <span className="text-sm font-bold text-slate-700 w-20">{Math.floor(newRoom.durationMinutes/60)}h {newRoom.durationMinutes%60}m</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${newRoom.enableChat ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <MessageSquare size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">Enable Group Chat</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Default for active sessions</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setNewRoom({...newRoom, enableChat: !newRoom.enableChat})}
                    className={`w-12 h-6 rounded-full transition-all relative ${newRoom.enableChat ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newRoom.enableChat ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Resources Link (Optional)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 border border-slate-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="Discord, Meet, or Note link"
                      value={newRoom.meetLink}
                      onChange={(e) => setNewRoom({...newRoom, meetLink: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const randomId = Math.random().toString(36).substring(7);
                        setNewRoom({...newRoom, meetLink: `https://meet.google.com/new?authuser=0&hl=en`});
                      }}
                      className="whitespace-nowrap px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                    >
                      <Video size={14} />
                      Get Meet
                    </button>
                  </div>
                </div>
              </div>

               <div className="flex gap-4 mt-8">
                <button 
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all text-sm"
                >
                  Launch Study Room
                </button>
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 bg-slate-50 text-slate-400 py-4 rounded-xl font-bold hover:bg-slate-100 transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RoomPage = ({ roomId, user, onLeave, onStartDM }: { roomId: string, user: any, onLeave: () => void, onStartDM: (peerId: string, peerName: string) => void }) => {
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newResource, setNewResource] = useState({ title: '', url: '' });
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  
  const [participants, setParticipants] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  const typingOthers = useMemo(() => {
    return participants.filter(p => p.isTyping && p.userId !== user.uid);
  }, [participants, user.uid]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (room) {
      const timer = setInterval(() => {
        const createdAt = new Date(room.createdAt).getTime();
        const durationMs = (room.durationMinutes || 120) * 60 * 1000;
        const endTime = createdAt + durationMs;
        const now = new Date().getTime();
        const diff = endTime - now;

        if (diff <= 0) {
          setTimeLeft('Session Ended');
          clearInterval(timer);
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [room]);

  useEffect(() => {
    // Room details
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const roomData = { id: docSnap.id, ...docSnap.data() } as StudyRoom;
        setRoom(roomData);
      } else {
        onLeave();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
    });

    // Chat messages
    const msgsRef = collection(db, 'rooms', roomId, 'messages');
    const qMsgs = query(msgsRef, orderBy('timestamp', 'asc'));
    const unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/messages`);
    });

    // Resources listener
    const resRef = collection(db, 'rooms', roomId, 'resources');
    const unsubRes = onSnapshot(resRef, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/resources`);
    });

    // Notes listener
    const notesRef = collection(db, 'rooms', roomId, 'notes');
    const qNotes = query(notesRef, orderBy('createdAt', 'desc'));
    const unsubNotes = onSnapshot(qNotes, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/notes`);
    });

    // Participants/Presence listener
    const presenceRef = collection(db, 'rooms', roomId, 'presence');
    const unsubPresence = onSnapshot(presenceRef, (snapshot) => {
      setParticipants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/presence`);
    });

    // Presence tracking
    const updatePresence = async (status: 'active' | 'away' | 'offline' = 'active') => {
      try {
        const userPresenceRef = doc(db, 'rooms', roomId, 'presence', user.uid);
        if (status === 'offline') {
          await deleteDoc(userPresenceRef);
          return;
        }
        await setDoc(userPresenceRef, {
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          status,
          // We don't include isTyping here to avoid stale value overwriting from heartbeat
          lastActive: new Date().toISOString()
        }, { merge: true });
      } catch (e) {}
    };

    const presenceInterval = setInterval(() => updatePresence(), 30000); // Heartbeat every 30s
    updatePresence(); // Initial presence

    // Tab visibility for 'away' status
    const handleVisibilityChange = () => {
      updatePresence(document.visibilityState === 'visible' ? 'active' : 'away');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Record participation and update count
    const recordParticipation = async (roomData: StudyRoom) => {
      try {
        const historyRef = collection(db, 'users', user.uid, 'participation');
        const q = query(historyRef, where('roomId', '==', roomId), limit(1));
        const existingHist = await getDocs(q);
        
        if (existingHist.empty) {
          await addDoc(historyRef, {
            roomId: roomId,
            roomTitle: roomData.title,
            roomSubject: roomData.subject,
            joinedAt: new Date().toISOString()
          });
        }
      } catch (e) {}
    };

    const joinSession = async () => {
      try {
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          const roomData = { id: snap.id, ...snap.data() } as StudyRoom;
          setRoom(roomData);
          // Increment participant count atomically
          await updateDoc(roomRef, {
            participantCount: increment(1)
          });
          recordParticipation(roomData);
        }
      } catch (e) {}
    };
    joinSession();

    return () => {
      updatePresence('offline');
      // Decrement participant count on leave atomically
      updateDoc(roomRef, {
        participantCount: increment(-1)
      }).catch(() => {});
      
      unsubRoom();
      unsubMsgs();
      unsubRes();
      unsubPresence();
      unsubNotes();
      clearInterval(presenceInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId, onLeave, user.uid]);

  useEffect(() => {
    const updateTypingStatus = async () => {
      try {
        const userPresenceRef = doc(db, 'rooms', roomId, 'presence', user.uid);
        await updateDoc(userPresenceRef, { isTyping });
      } catch (e) {}
    };
    if (room) updateTypingStatus();
  }, [isTyping, roomId, user.uid, room]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !isUploading) return;

    try {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setIsTyping(false);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit 5MB for demo)
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Please upload files under 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storageRef = ref(storage, `rooms/${roomId}/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const msgData = {
        roomId,
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        content: `Shared a file: ${file.name}`,
        timestamp: new Date().toISOString(),
        fileUrl: url,
        fileName: file.name,
        fileType: file.type
      };
      
      await addDoc(collection(db, 'rooms', roomId, 'messages'), msgData);
      
      // Also add to resources automatically
      await addDoc(collection(db, 'rooms', roomId, 'resources'), {
        title: file.name,
        url: url,
        addedBy: user.uid,
        addedByName: user.displayName,
        createdAt: new Date().toISOString(),
        isUpload: true
      });

    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file. Please check permissions.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await addDoc(collection(db, 'rooms', roomId, 'notes'), {
        content: newNote,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        createdAt: new Date().toISOString()
      });
      setNewNote('');
    } catch (error) {
      console.error('Add note error:', error);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResource.title || !newResource.url) return;

    try {
      await addDoc(collection(db, 'rooms', roomId, 'resources'), {
        ...newResource,
        addedBy: user.uid,
        addedByName: user.displayName,
        createdAt: new Date().toISOString()
      });
      setNewResource({ title: '', url: '' });
      setIsAddingResource(false);
    } catch (error) {
      console.error('Add resource error:', error);
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'rooms', roomId, 'resources', id));
    } catch (error) {
      console.error('Delete resource error:', error);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this study session for everyone?')) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'closed' });
      onLeave();
    } catch (error) {
      console.error('End session error:', error);
    }
  };

  const handleExtendTime = async () => {
    try {
      const newDuration = (room?.durationMinutes || 120) + 30;
      await updateDoc(doc(db, 'rooms', roomId), { durationMinutes: newDuration });
    } catch (error) {
      console.error('Extend time error:', error);
    }
  };

  const handleSetCustomTime = async () => {
    const custom = prompt('Enter new total session duration in minutes (from creation):', (room?.durationMinutes || 120).toString());
    if (custom && !isNaN(Number(custom))) {
      try {
        await updateDoc(doc(db, 'rooms', roomId), { durationMinutes: Number(custom) });
      } catch (error) {
        console.error('Custom time error:', error);
      }
    }
  };

  if (!room) return null;

  return (
    <div className={`flex h-[calc(100vh-64px)] lg:h-screen bg-slate-50 text-slate-900 pt-16 lg:pt-20 ${isMobile ? 'pb-16' : ''} font-sans overflow-hidden relative`}>
      {/* Sidebar - Room Info & Resources */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarOpen ? (typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : 340) : 0, 
          opacity: sidebarOpen ? 1 : 0,
          x: sidebarOpen ? 0 : -20
        }}
        className={`fixed lg:relative top-0 bottom-0 left-0 bg-white z-[70] lg:z-auto flex flex-col h-full overflow-hidden border-r border-slate-200 ${isMobile && !sidebarOpen ? 'pointer-events-none' : ''}`}
      >
        <div className="p-6 lg:p-8 pb-4 flex-1 overflow-y-auto">
          {isMobile ? (
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white">
                   <BookOpen size={16} />
                 </div>
                 <span className="font-extrabold text-md uppercase tracking-tighter">StudySphere</span>
               </div>
               <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" alt="Me" />
            </div>
          ) : (
            <button 
              onClick={() => isMobile && sidebarOpen ? setSidebarOpen(false) : onLeave()}
              className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest mb-6 lg:mb-10 transition-colors bg-indigo-50 px-3 py-2 rounded-lg"
            >
              <ChevronRight className="rotate-180" size={14} />
              {typeof window !== 'undefined' && window.innerWidth < 1024 ? 'Return to Room' : 'Exit to Dashboard'}
            </button>
          )}
          
          <div className="space-y-4 mb-10">
            <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-bold uppercase tracking-widest rounded text-slate-400 border border-slate-200/50">
              {room.subject}
            </span>
            <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 leading-none uppercase">{room.title}</h1>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">{room.description}</p>
          </div>
          
          <div className="space-y-3 mb-10">
             <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Users className="text-emerald-500" size={20} />
                   <div>
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Active Now</span>
                     </div>
                     <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1 inline-block">Peer Sync Active</span>
                   </div>
                </div>
                <div className="text-right">
                   <span className="text-2xl font-black text-slate-900 block leading-none">{participants.length}</span>
                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Peers</span>
                </div>
             </div>

             <div className="space-y-2 mt-4 px-1">
                {participants
                  .filter(p => {
                    const lastActive = new Date(p.lastActive).getTime();
                    return (Date.now() - lastActive) < 90000; // Filter out those inactive for > 90s
                  })
                  .map(p => (
                  <div key={p.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                       <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{p.userName}</span>
                       {p.isTyping && (
                         <span className="text-[10px] text-indigo-500 font-bold italic animate-pulse">Typing...</span>
                       )}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-100 transition-all">
                      {p.userId !== user.uid && (
                        <button 
                          onClick={() => onStartDM(p.userId, p.userName)}
                          className="p-1.5 hover:bg-white bg-slate-100 text-indigo-600 rounded-md transition-colors shadow-sm"
                          title="Message Peer"
                        >
                           <MessageCircle size={14} />
                        </button>
                      )}
                      <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Resources Internal */}
          <div className="pt-8 border-t border-slate-100 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">Resources</h3>
              <button 
                onClick={() => setIsAddingResource(!isAddingResource)}
                className="text-indigo-600 hover:text-indigo-700 p-1.5 bg-indigo-50 rounded-full"
              >
                <Plus size={16} />
              </button>
            </div>

            <AnimatePresence>
              {isAddingResource && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddResource}
                  className="mb-4 space-y-2 bg-slate-50 p-3 rounded-lg border border-indigo-100"
                >
                  <div className="flex gap-2 mb-2">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                    >
                      <Paperclip size={12} />
                      Upload File
                    </button>
                  </div>
                  <div className="text-center text-[8px] text-slate-400 uppercase font-black tracking-widest mb-2">Or add link</div>
                  <input 
                    required={!isUploading}
                    type="text"
                    placeholder="Title (e.g. Lecture Notes)"
                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none focus:border-indigo-500"
                    value={newResource.title}
                    onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                  />
                  <input 
                    required={!isUploading}
                    type="text"
                    placeholder="Link (https://...)"
                    className="w-full text-xs p-2 rounded border border-slate-200 outline-none focus:border-indigo-500"
                    value={newResource.url}
                    onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                  />
                  <button type="submit" className="w-full py-2 bg-indigo-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                    Add Resource
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              {resources.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No materials shared yet.</p>
              ) : (
                resources.map(res => (
                  <div key={res.id} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                    <a 
                      href={res.url.startsWith('http') ? res.url : `https://${res.url}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-indigo-600 flex-1 truncate"
                    >
                      <Link size={14} className="shrink-0" />
                      <span className="truncate">{res.title}</span>
                    </a>
                    {(res.addedBy === user.uid || room.creatorId === user.uid) && (
                      <button 
                        onClick={() => handleDeleteResource(res.id)}
                        className="p-1 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all text-slate-300"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={`p-6 border-t border-slate-100 bg-white ${isMobile ? 'pb-24' : ''}`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
              <img src={`https://ui-avatars.com/api/?name=${room.creatorName}&background=random`} alt="Moderator" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Moderator</p>
              <p className="text-sm font-bold text-slate-900">{room.creatorName}</p>
            </div>
          </div>
          
          {room.meetLink && (
            <div className="relative p-1 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl">
               <a 
                 href={room.meetLink.startsWith('http') ? room.meetLink : `https://${room.meetLink}`} 
                 target="_blank" 
                 rel="noreferrer"
                 className="flex items-center justify-center gap-3 w-full bg-slate-900 text-white py-4 rounded-lg transition-all font-bold text-sm border border-white/10"
               >
                 <ExternalLink size={18} className="text-indigo-400" />
                 Join Interactive Call
               </a>
            </div>
          )}
        </div>
        
        {isMobile && (
          <button 
            onClick={() => { setSidebarOpen(false); setActiveTab('chat'); }}
            className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-400 z-[60] active:scale-95 transition-all"
          >
            <MessageSquare size={24} />
          </button>
        )}
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none"></div>
        
        <header className="h-16 lg:h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 relative z-20">
          <div className="flex items-center gap-2 lg:gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 lg:p-2.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Info size={20} />}
            </button>
            <div className="hidden lg:block h-4 w-px bg-slate-200" />
            <div className={`hidden lg:flex gap-1 bg-slate-100 p-1 rounded-lg`}>
              {room.enableChat !== false && (
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-3 lg:px-4 py-1 lg:py-1.5 rounded-md text-[9px] lg:text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white hover:text-indigo-600'}`}
                >
                  <MessageSquare size={12} />
                  Room Chat
                </button>
              )}
              <button 
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 px-3 lg:px-4 py-1 lg:py-1.5 rounded-md text-[9px] lg:text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${activeTab === 'notes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white hover:text-indigo-600'}`}
              >
                <StickyNote size={12} />
                Room Notes
              </button>
            </div>
            {isMobile && activeTab === 'chat' && (
              <button 
                onClick={() => setActiveTab('notes')}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-indigo-100 shadow-sm"
              >
                <StickyNote size={12} />
                Shared Notes
              </button>
            )}
            {isMobile && activeTab === 'notes' && (
               <button 
                onClick={() => setActiveTab('chat')}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-indigo-100 shadow-sm"
              >
                <MessageSquare size={12} />
                Back to Chat
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:block">Time Remaining</span>
              <div className="flex items-center gap-1 lg:gap-2">
                <span className={`text-xs lg:text-sm font-mono font-bold ${timeLeft.includes('0h 0m') ? 'text-rose-500' : 'text-indigo-600'}`}>{timeLeft}</span>
                {room.creatorId === user.uid && (
                  <div className="flex gap-1">
                    <button 
                      onClick={handleExtendTime}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                      title="Add 30 mins"
                    >
                      <Plus size={12} />
                    </button>
                    <button 
                      onClick={handleSetCustomTime}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded transition-all"
                      title="Set Custom duration"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {room.creatorId === user.uid && (
              <button 
                onClick={handleEndSession}
                className="bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-all shadow-sm"
              >
                End Session
              </button>
            )}
          </div>
        </header>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 lg:space-y-6 relative z-10">
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
                      <div className="flex items-center gap-2 mb-1 mx-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {msg.senderId === user.uid ? 'Me' : msg.senderName}
                        </span>
                      </div>
                    )}
                    
                    <div className={`relative group flex gap-2 items-center ${msg.senderId === user.uid ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`max-w-md px-5 py-3.5 rounded-xl text-sm font-medium shadow-sm border transition-all ${
                        msg.senderId === user.uid 
                        ? 'bg-indigo-600 text-white border-indigo-700/50 rounded-tr-none' 
                        : 'bg-white text-slate-800 border-slate-200/50 rounded-tl-none'
                      }`}>
                        {msg.fileUrl ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-white/10 p-2 rounded-lg border border-white/5">
                              {msg.fileType?.startsWith('image/') ? (
                                <ImageIcon size={20} className={msg.senderId === user.uid ? 'text-indigo-200' : 'text-indigo-600'} />
                              ) : (
                                <FileText size={20} className={msg.senderId === user.uid ? 'text-indigo-200' : 'text-indigo-600'} />
                              )}
                              <span className="text-xs truncate max-w-[150px]">{msg.fileName}</span>
                            </div>
                            {msg.fileType?.startsWith('image/') && (
                              <img 
                                src={msg.fileUrl} 
                                alt={msg.fileName} 
                                className="w-full max-h-60 object-cover rounded-lg shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.fileUrl, '_blank')}
                              />
                            )}
                            <a 
                              href={msg.fileUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline ${msg.senderId === user.uid ? 'text-indigo-200' : 'text-indigo-600'}`}
                            >
                              Download <ExternalLink size={10} />
                            </a>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 lg:p-8 pt-0 lg:pt-0 pb-6 relative z-10">
              <AnimatePresence>
                {typingOthers.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center gap-2 mb-2 px-1"
                  >
                    <div className="flex gap-1">
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-500 italic">
                      {typingOthers.length === 1 
                        ? `${typingOthers[0].userName} is typing...` 
                        : `${typingOthers.length} people are typing...`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <form 
                onSubmit={handleSendMessage}
                className="bg-white border border-slate-200 rounded-xl flex items-center p-2 shadow-lg shadow-slate-200/50 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all"
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                />
                
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all relative"
                    title="Upload File"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Paperclip size={20} />
                    )}
                  </button>
                  
                  {isMobile && (
                    <button 
                      type="button"
                      onClick={() => setActiveTab('notes')}
                      className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                      title="Shared Notes"
                    >
                      <StickyNote size={20} />
                    </button>
                  )}
                </div>

                <input 
                  type="text"
                  placeholder={isUploading ? "Uploading..." : "Post your doubt..."}
                  className="flex-1 px-4 py-2.5 outline-none text-sm text-slate-700 font-medium h-12 bg-transparent"
                  value={newMessage}
                  disabled={isUploading}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setIsTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
                  }}
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || isUploading}
                  className="bg-indigo-600 text-white h-10 w-10 flex items-center justify-center rounded-lg disabled:opacity-20 transition-all hover:bg-indigo-700 shadow-md shadow-indigo-100"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 lg:space-y-6 relative z-10">
               {notes.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto">
                    <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 mb-6 border border-slate-100">
                      <StickyNote size={32} />
                    </div>
                    <h3 className="font-extrabold text-lg text-slate-900 mb-2">Room Notes</h3>
                    <p className="text-sm text-slate-400">Collaboratively capture key points and takeaways here.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {notes.map(note => (
                      <div key={note.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group">
                         <p className="text-sm text-slate-700 mb-4 whitespace-pre-wrap">{note.content}</p>
                         <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{note.authorName}</span>
                            <span className="text-[9px] text-slate-300">{new Date(note.createdAt).toLocaleTimeString()}</span>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
            
            <div className="p-4 lg:p-8 pt-0 lg:pt-0 pb-6 relative z-10">
              <form 
                onSubmit={handleAddNote}
                className="bg-white border border-slate-200 rounded-xl p-2 shadow-lg shadow-slate-200/50 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all"
              >
                <textarea 
                  placeholder="Type a new session note..."
                  className="w-full px-4 py-3 outline-none text-sm text-slate-700 font-medium h-24 resize-none"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <button 
                    type="submit"
                    disabled={!newNote.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-20 transition-all hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-2 text-xs font-bold"
                  >
                    <Plus size={16} />
                    POST NOTE
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </main>
      
      {/* Mobile Bottom Tabs */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-4 z-[80] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          {room.enableChat !== false && (
            <button 
              onClick={() => { setActiveTab('chat'); setSidebarOpen(false); }}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'chat' && !sidebarOpen ? 'text-indigo-600 border-t-2 border-indigo-600 pt-1' : 'text-slate-400 pt-1.5'}`}
            >
              <MessageSquare size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
            </button>
          )}
          <button 
            onClick={() => { setActiveTab('notes'); setSidebarOpen(false); }}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'notes' && !sidebarOpen ? 'text-indigo-600 border-t-2 border-indigo-600 pt-1' : 'text-slate-400 pt-1.5'}`}
          >
            <StickyNote size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Notes</span>
          </button>
          <button 
            onClick={() => setSidebarOpen(true)}
            className={`flex flex-col items-center gap-1 transition-all ${sidebarOpen ? 'text-indigo-600 border-t-2 border-indigo-600 pt-1' : 'text-slate-400 pt-1.5'}`}
          >
            <Info size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Info</span>
          </button>
        </div>
      )}
    </div>
  );
};


const ResourcesView = () => {
  const [allResources, setAllResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is expensive in real firestore if many rooms exist, 
    // but for the platform prototype we'll fetch all resources from active rooms
    const fetchAll = async () => {
      try {
        const roomsSnap = await getDocs(query(collection(db, 'rooms'), where('status', '==', 'active'), limit(20)));
        const promises = roomsSnap.docs.map(roomDoc => 
          getDocs(collection(db, 'rooms', roomDoc.id, 'resources'))
        );
        const results = await Promise.all(promises);
        const flattened = results.flatMap((snap, i) => snap.docs.map(d => ({
          ...d.data(), 
          id: d.id, 
          roomTitle: roomsSnap.docs[i].data().title,
          roomSubject: roomsSnap.docs[i].data().subject
        })));
        setAllResources(flattened.sort((a: any, b: any) => b.createdAt?.localeCompare(a.createdAt)));
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pt-28 md:pt-36 pb-20 min-h-screen bg-slate-50">
      <div className="relative z-10 mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Global Repository</span>
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Shared Resources</h2>
        <p className="text-slate-500">Access peer-contributed study materials from all active sessions.</p>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))
        ) : allResources.length > 0 ? (
          allResources.map(res => (
            <a 
              key={res.id} 
              href={res.url.startsWith('http') ? res.url : `https://${res.url}`}
              target="_blank"
              rel="noreferrer"
              className="bg-white border border-slate-200 p-6 rounded-xl hover:border-indigo-500 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{res.roomSubject}</span>
                  <Link size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1">{res.title}</h3>
                <p className="text-[10px] text-slate-400">Shared by {res.addedByName} in <span className="text-slate-600">{res.roomTitle}</span></p>
              </div>
            </a>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white border border-slate-200 border-dashed rounded-xl text-slate-400">
            No resources have been shared across any rooms yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [view, setView] = useState<'discover' | 'resources'>('discover');

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);

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

  const handleJoinRoom = (id: string) => {
    setCurrentRoomId(id);
  };

  const startConversation = async (peerId: string, peerName: string) => {
    if (!user) return;
    try {
      const convId = [user.uid, peerId].sort().join('_');
      const convRef = doc(db, 'conversations', convId);
      const convSnap = await getDoc(convRef);
      
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participants: [user.uid, peerId],
          participantNames: {
            [user.uid]: user.displayName || 'Anonymous',
            [peerId]: peerName
          },
          lastMessage: '',
          updatedAt: new Date().toISOString()
        });
      }
      setActiveConversationId(convId);
      setShowMessages(true);
    } catch (e) {
      console.error('Start conversation error:', e);
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
      <nav className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${currentRoomId || user ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-16 lg:h-20' : 'bg-transparent h-20'} flex items-center`}>
        <div className="max-w-6xl mx-auto w-full px-4 lg:px-6 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 lg:gap-4 cursor-pointer group"
            onClick={() => { setView('discover'); setCurrentRoomId(null); }}
          >
            <div className="w-8 h-8 lg:w-11 lg:h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100 group-hover:rotate-6 transition-all duration-300">
              <BookOpen size={22} />
            </div>
            <span className="font-black tracking-tighter text-xl lg:text-2xl text-slate-900 uppercase">StudySphere</span>
          </div>

          {user && (
            <div className="flex items-center gap-4 lg:gap-10">
              <nav className="hidden lg:flex gap-10 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                <button 
                  onClick={() => { setView('discover'); setCurrentRoomId(null); }} 
                  className={`hover:text-indigo-600 transition-colors relative py-1 ${view === 'discover' && !currentRoomId ? 'text-indigo-600' : ''}`}
                >
                  Discover
                  {view === 'discover' && !currentRoomId && <motion.div layoutId="activeNav" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                </button>
                <button 
                  onClick={() => { setView('resources'); setCurrentRoomId(null); }}
                  className={`hover:text-indigo-600 transition-colors relative py-1 ${view === 'resources' && !currentRoomId ? 'text-indigo-600' : ''}`}
                >
                  Resources
                  {view === 'resources' && !currentRoomId && <motion.div layoutId="activeNav" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                </button>
              </nav>
              
              <div className="flex items-center gap-3 lg:gap-5 border-l border-slate-200 pl-4 lg:pl-10">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[11px] font-black leading-none text-slate-900">{user.displayName?.split(' ')[0]}</span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-1">Student</span>
                </div>
                <div className="relative group">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                    className="w-9 h-9 lg:w-10 lg:h-10 rounded-full ring-2 ring-white shadow-lg cursor-pointer group-hover:scale-105 transition-all" 
                    alt="My Profile" 
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { logOut(); setCurrentRoomId(null); }} 
                    className="hidden sm:flex p-2 lg:p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all border border-slate-100"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                  
                  <button 
                    onClick={() => setShowMessages(true)}
                    className="hidden sm:flex p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-100 relative group transition-all"
                    title="Messages"
                  >
                    <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
                
                {!currentRoomId && (
                  <button 
                    onClick={() => setView(view === 'discover' ? 'resources' : 'discover')}
                    className="lg:hidden p-2 bg-indigo-50 text-indigo-600 rounded-lg"
                  >
                    {view === 'discover' ? <BookOpen size={20} /> : <Globe size={20} />}
                  </button>
                )}
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
              onStartDM={startConversation}
            />
          </motion.div>
        ) : view === 'resources' ? (
          <motion.div
            key="resources"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResourcesView />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard user={user} onJoinRoom={handleJoinRoom} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Mobile Bottom Navigation (Dashboard/Explore context) */}
      {user && isMobile && !currentRoomId && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-4 z-[55] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
           <button 
            onClick={() => { setView('discover'); }}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'discover' ? 'text-indigo-600 border-t-2 border-indigo-600 pt-1' : 'text-slate-400 pt-1.5'}`}
          >
            <Globe size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[8px]">Explore</span>
          </button>
          
          <button 
            onClick={() => { setView('resources'); }}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'resources' ? 'text-indigo-600 border-t-2 border-indigo-600 pt-1' : 'text-slate-400 pt-1.5'}`}
          >
            <BookOpen size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[8px]">Library</span>
          </button>
          
          <button 
            onClick={() => setShowMessages(true)}
            className={`flex flex-col items-center gap-1 transition-all ${showMessages ? 'text-indigo-600 border-t-2 border-indigo-600 pt-1' : 'text-slate-400 pt-1.5'}`}
          >
            <div className="relative">
              <MessageCircle size={20} />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white shadow-sm"></div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[8px]">Chat</span>
          </button>
        </div>
      )}

      {/* Direct Message Drawer/Overlay */}
      <AnimatePresence>
        {showMessages && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMessages(false)}
              className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[70]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-[80] shadow-2xl flex border-l border-slate-200"
            >
              <div className="flex h-full w-full">
                {(!activeConversationId || !isMobile) && (
                  <div className={`w-full ${activeConversationId ? 'sm:w-32 lg:w-48' : ''}`}>
                    <ConversationsList 
                      user={user} 
                      onSelectConversation={(id) => setActiveConversationId(id)}
                      activeConversationId={activeConversationId}
                      onClose={() => setShowMessages(false)}
                    />
                  </div>
                )}
                {activeConversationId && (
                  <div className="flex-1">
                    <DirectMessagePanel 
                      user={user} 
                      conversationId={activeConversationId} 
                      onClose={() => isMobile ? setActiveConversationId(null) : setShowMessages(false)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Message trigger if not already open */}
      {user && !showMessages && (
        <button 
          onClick={() => setShowMessages(true)}
          className="fixed right-6 bottom-20 z-[55] w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group overflow-hidden"
        >
           <MessageCircle className="relative z-10" />
           <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
        </button>
      )}

      {/* Footer from theme - fixed at bottom */}
      <footer className="h-12 bg-white border-t border-slate-200 px-6 sm:px-10 flex items-center justify-between shrink-0 fixed bottom-0 left-0 right-0 z-40">
        <div className="flex gap-4 sm:gap-8 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 158 Active Rooms</div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 12.4k Doubts Solved</div>
        </div>
        <div className="text-[9px] sm:text-[11px] font-medium text-slate-400 tracking-tight hidden sm:block">StudySphere P2P Platform • Building Community Knowledge</div>
      </footer>
    </div>
  );
}
