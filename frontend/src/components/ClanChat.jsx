import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, CheckCheck } from 'lucide-react';
import { useTheme } from '../ThemeContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ClanChat({ clanId, currentUserId }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [unread, setUnread] = useState(0);
    const bottomRef = useRef(null);
    const lastMsgIdRef = useRef(null);
    const token = localStorage.getItem('token');
    const { isDark } = useTheme();

    const markAsRead = async () => {
        if (!clanId || !token) return;
        try {
            await fetch(`${API_BASE}/clans/${clanId}/messages/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch { /* ignore */ }
    };

    const fetchMessages = async (isPolling = false) => {
        if (!clanId || !token) return;
        try {
            // Always fetch latest 50 to get updated read receipts
            const url = `${API_BASE}/clans/${clanId}/messages?limit=50`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) return;
            const data = await res.json();
            const msgs = data.messages || [];

            if (isPolling) {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    let unreadCount = 0;
                    msgs.forEach(m => {
                        const idx = newMsgs.findIndex(x => x._id === m._id);
                        if (idx >= 0) {
                            newMsgs[idx] = m; // update existing (for readBy)
                        } else {
                            newMsgs.push(m);
                            unreadCount++;
                        }
                    });
                    if (!open && unreadCount > 0) setUnread(u => u + unreadCount);
                    return newMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                });
            } else {
                setMessages(msgs);
            }

            if (msgs.length > 0) lastMsgIdRef.current = msgs[msgs.length - 1]._id;
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchMessages(false);
        const interval = setInterval(() => fetchMessages(true), 4000);
        return () => clearInterval(interval);
    }, [clanId]);

    useEffect(() => {
        if (open) { 
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
            setUnread(0);
            markAsRead();
        }
    }, [messages, open]);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            const res = await fetch(`${API_BASE}/clans/${clanId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ text: text.trim() }),
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, data.message]);
                lastMsgIdRef.current = data.message._id;
                setText('');
            }
        } catch { /* ignore */ }
        setSending(false);
    };

    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const y = new Date(today - 86400000);
        if (d.toDateString() === y.toDateString()) return 'Yesterday';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Group messages by date
    const grouped = [];
    let lastDate = '';
    messages.forEach(m => {
        const date = formatDate(m.createdAt);
        if (date !== lastDate) { grouped.push({ type: 'date', date }); lastDate = date; }
        grouped.push(m);
    });

    if (!open) {
        return (
            <button onClick={() => setOpen(true)}
                style={{ position:'fixed', bottom:80, right:16, zIndex:999, width:56, height:56, borderRadius:'50%',
                    background:'linear-gradient(135deg,#23a094,#1a8a7f)', border:'none', color:'#fff', cursor:'pointer',
                    boxShadow:'0 4px 20px rgba(35,160,148,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <MessageCircle size={24} />
                {unread > 0 && (
                    <span style={{ position:'absolute', top:-2, right:-2, background:'#ef4444', color:'#fff',
                        fontSize:11, fontWeight:700, width:20, height:20, borderRadius:'50%', display:'flex',
                        alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>{unread}</span>
                )}
            </button>
        );
    }

    return (
        <div style={{ position:'fixed', bottom:64, right:0, left:0, top:0, zIndex:1000, display:'flex', flexDirection:'column',
            background: isDark ? '#0f1117' : '#f8fafc', fontFamily:'"Inter","system-ui",sans-serif' }}>
            {/* Header */}
            <div style={{ padding:'12px 16px', background:'linear-gradient(135deg,#1e293b,#0f172a)', color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <MessageCircle size={18} />
                    <span style={{ fontWeight:700, fontSize:15 }}>Clan Chat</span>
                    <span style={{ fontSize:11, opacity:0.5 }}>{messages.length} msgs</span>
                </div>
                <button onClick={() => setOpen(false)} style={{ background:'rgba(255,255,255,0.1)', border:'none',
                    borderRadius:8, padding:'6px', cursor:'pointer', color:'#fff', display:'flex' }}>
                    <X size={18} />
                </button>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:4 }}>
                {messages.length === 0 && (
                    <div style={{ textAlign:'center', padding:40, color: isDark ? '#8b8d97' : '#94a3b8', fontSize:13 }}>
                        No messages yet. Say hi! 👋
                    </div>
                )}
                {grouped.map((item, i) => {
                    if (item.type === 'date') {
                        return (
                            <div key={`d-${i}`} style={{ textAlign:'center', padding:'8px 0', fontSize:11,
                                color:'#94a3b8', fontWeight:600 }}>{item.date}</div>
                        );
                    }
                    const m = item;
                    const isMe = (m.sender?._id || m.sender) === currentUserId;
                    const isSystem = m.type === 'system';

                    if (isSystem) {
                        return (
                            <div key={m._id} style={{ textAlign:'center', padding:'4px 0', fontSize:11,
                                color:'#94a3b8', fontStyle:'italic' }}>{m.text}</div>
                        );
                    }

                    return (
                        <div key={m._id} style={{ display:'flex', flexDirection:'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom:2 }}>
                            {!isMe && (
                                <span style={{ fontSize:10, color:'#64748b', fontWeight:600, marginBottom:2, marginLeft:4 }}>
                                    {m.sender?.name || 'Unknown'}
                                </span>
                            )}
                            <div style={{
                                maxWidth:'75%', padding:'8px 12px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: isMe ? 'linear-gradient(135deg,#23a094,#1a8a7f)' : (isDark ? '#181a20' : '#fff'),
                                color: isMe ? '#fff' : (isDark ? '#e4e5ea' : '#1e293b'), fontSize:14, lineHeight:1.4, wordBreak:'break-word',
                                boxShadow: isMe ? 'none' : (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)'),
                                border: isMe ? 'none' : (isDark ? '1px solid #2a2d37' : '1px solid #e2e8f0'),
                            }}>
                                {m.text}
                            </div>
                            <div style={{ display:'flex', alignItems:'center', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop:2, padding:'0 4px', gap:4 }}>
                                <span style={{ fontSize:9, color:'#94a3b8' }}>
                                    {formatTime(m.createdAt)}
                                </span>
                                {isMe && (
                                    <CheckCheck 
                                        size={12} 
                                        color={(m.readBy && m.readBy.length > 0) ? '#3b82f6' : '#cbd5e1'} 
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding:'8px 12px', background: isDark ? '#181a20' : '#fff', borderTop: isDark ? '1px solid #2a2d37' : '1px solid #e2e8f0',
                display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    style={{ flex:1, padding:'10px 14px', borderRadius:20, border: isDark ? '1px solid #2a2d37' : '1px solid #e2e8f0',
                        fontSize:14, outline:'none', background: isDark ? '#1f2129' : '#f8fafc', fontFamily:'inherit',
                        color: isDark ? '#e4e5ea' : '#1e293b' }}
                    maxLength={1000}
                />
                <button onClick={handleSend} disabled={sending || !text.trim()}
                    style={{ width:40, height:40, borderRadius:'50%', border:'none', cursor:'pointer',
                        background: text.trim() ? 'linear-gradient(135deg,#23a094,#1a8a7f)' : '#e2e8f0',
                        color: text.trim() ? '#fff' : '#94a3b8', display:'flex', alignItems:'center',
                        justifyContent:'center', transition:'all 0.2s', flexShrink:0 }}>
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
