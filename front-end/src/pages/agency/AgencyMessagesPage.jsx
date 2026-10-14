import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import { messagesApi, guidesApi } from '../../services/api';

/**
 * AgencyMessagesPage
 * 
 * Secure communication portal for travel agencies to chat with tour guides
 * and customer support desk.
 */
export default function AgencyMessagesPage() {
  const { user } = useSession();
  const agencyId = Number(user?.agencyId || user?.agency_id || user?.id || 1);

  const [rawMessages, setRawMessages] = useState([]);
  const [guides, setGuides] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [sendError, setSendError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const chatBottomRef = useRef(null);

  const loadData = async (signal) => {
    if (!agencyId) {
      setLoading(false);
      setError('No agency partner session found.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [messagesRes, guidesRes] = await Promise.allSettled([
        messagesApi.getByUser('agency', agencyId, { signal }),
        guidesApi.getAll({ signal }),
      ]);

      if (signal?.aborted) return;

      if (messagesRes.status === 'fulfilled') {
        setRawMessages(Array.isArray(messagesRes.value) ? messagesRes.value : []);
      } else if (!messagesRes.reason?.isCancelled) {
        setError(messagesRes.reason?.message || 'Failed to load messages from backend.');
      }

      if (guidesRes.status === 'fulfilled') {
        setGuides(Array.isArray(guidesRes.value) ? guidesRes.value : []);
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[AgencyMessagesPage] Error loading messages:', err);
        setError(err.message || 'Failed to load messages.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [agencyId]);

  // Build conversational roster
  const conversationsMap = {};

  // 1. Always ensure Support Desk is available
  conversationsMap['support_1'] = {
    id: 'support_1',
    otherRole: 'support',
    otherId: 1,
    name: 'GlobeSync Support Care Desk',
    role: 'Helpdesk & Care',
    messages: [],
    lastMessage: null,
  };

  // 2. Populate guides
  guides.forEach((g) => {
    const id = `guide_${g.guideId || g.guide_id}`;
    conversationsMap[id] = {
      id,
      otherRole: 'guide',
      otherId: g.guideId || g.guide_id,
      name: g.name || `Guide #${g.guideId || g.guide_id}`,
      role: `Tour Guide • ${g.languages || 'English'}`,
      messages: [],
      lastMessage: null,
    };
  });

  // 3. Populate messages into conversation buckets
  rawMessages.forEach((msg) => {
    const isSender = (msg.sender || '').toLowerCase() === 'agency' && Number(msg.senderId) === agencyId;
    const otherRole = isSender ? (msg.receiver || '').toLowerCase() : (msg.sender || '').toLowerCase();
    const otherId = isSender ? Number(msg.receiverId) : Number(msg.senderId);
    const convKey = `${otherRole}_${otherId}`;

    if (!conversationsMap[convKey]) {
      conversationsMap[convKey] = {
        id: convKey,
        otherRole,
        otherId,
        name: otherRole === 'support' ? 'Customer Support' : otherRole === 'guide' ? `Guide #${otherId}` : `${otherRole} #${otherId}`,
        role: otherRole.toUpperCase(),
        messages: [],
        lastMessage: null,
      };
    }

    conversationsMap[convKey].messages.push(msg);
  });

  // Sort messages in each conversation by timestamp/ID
  Object.values(conversationsMap).forEach((c) => {
    c.messages.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.messageDate || 0).getTime() || a.messageId || 0;
      const timeB = new Date(b.timestamp || b.messageDate || 0).getTime() || b.messageId || 0;
      return timeA - timeB;
    });
    c.lastMessage = c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
  });

  // Sort conversation list: support first or by most recent message
  const conversationList = Object.values(conversationsMap).sort((a, b) => {
    if (a.id === 'support_1') return -1;
    if (b.id === 'support_1') return 1;
    const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp || 0).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp || 0).getTime() : 0;
    return timeB - timeA;
  });

  // Select first conversation if none active
  useEffect(() => {
    if (!activeConvId && conversationList.length > 0) {
      setActiveConvId(conversationList[0].id);
    }
  }, [conversationList, activeConvId]);

  const activeConv = conversationsMap[activeConvId] || null;

  // Scroll to bottom when conversation changes or new message arrives
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConv?.messages.length, activeConvId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!draftText.trim() || !activeConv || isSending) return;

    setSendError(null);
    setIsSending(true);

    const payload = {
      sender: 'agency',
      senderId: agencyId,
      receiver: activeConv.otherRole,
      receiverId: activeConv.otherId,
      content: draftText.trim(),
    };

    try {
      const created = await messagesApi.create(payload);
      setRawMessages((prev) => [...prev, created]);
      setDraftText('');
    } catch (err) {
      console.error('[AgencyMessagesPage] Send failed:', err);
      setSendError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="agency-messages-page" style={{ maxWidth: '1200px', margin: '0 auto', height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
          Partner Communications
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
          Coordinate client trip itineraries directly with licensed tour guides and platform support.
        </p>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>💬</div>
            <p style={{ fontWeight: 600 }}>Loading conversation channels...</p>
          </div>
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#ef4444' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 600, marginBottom: '12px' }}>{error}</p>
            <button
              type="button"
              onClick={() => loadData()}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#0d9488',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            minHeight: 0,
          }}
        >
          {/* Left: Channel / Contact List */}
          <div
            style={{
              width: '320px',
              borderRight: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              background: '#f8fafc',
              flexShrink: 0,
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
              Contacts & Guides ({conversationList.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversationList.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setSendError(null);
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isActive ? '#f0fdfa' : 'transparent',
                      borderLeft: isActive ? '4px solid #0d9488' : '4px solid transparent',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: conv.otherRole === 'support' ? '#0d9488' : '#0284c7',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '15px',
                        flexShrink: 0,
                      }}
                    >
                      {conv.otherRole === 'support' ? '🎧' : '🧭'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.name}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.lastMessage?.message || conv.role}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Message Stream & Input */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0 }}>
            {activeConv ? (
              <>
                {/* Chat Topbar */}
                <div
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: activeConv.otherRole === 'support' ? '#0d9488' : '#0284c7',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}
                    >
                      {activeConv.otherRole === 'support' ? '🎧' : '🧭'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                        {activeConv.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: 600 }}>
                        {activeConv.role}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Body */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: '#fafafa',
                  }}
                >
                  {activeConv.messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>💬</div>
                      <p style={{ margin: 0, fontSize: '14px' }}>
                        No messages exchanged yet with {activeConv.name}.
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                        Type a message below to start coordinating.
                      </p>
                    </div>
                  ) : (
                    activeConv.messages.map((m, idx) => {
                      const isMe =
                        (m.sender || '').toLowerCase() === 'agency' &&
                        Number(m.senderId) === agencyId;
                      return (
                        <div
                          key={m.messageId || idx}
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '70%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <div
                            style={{
                              padding: '10px 16px',
                              borderRadius: '16px',
                              borderBottomRightRadius: isMe ? '4px' : '16px',
                              borderBottomLeftRadius: !isMe ? '4px' : '16px',
                              background: isMe ? '#0d9488' : '#fff',
                              color: isMe ? '#fff' : '#1e293b',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                              fontSize: '14px',
                              lineHeight: 1.5,
                              border: isMe ? 'none' : '1px solid #e2e8f0',
                            }}
                          >
                            {m.content || m.message}
                          </div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input Bar */}
                {sendError && (
                  <div style={{ background: '#fef2f2', borderTop: '1px solid #fecaca', padding: '8px 16px', color: '#b91c1c', fontSize: '12px' }}>
                    {sendError}
                  </div>
                )}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '14px 20px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <input
                    type="text"
                    placeholder={`Message ${activeConv.name}...`}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    disabled={isSending}
                    style={{
                      flex: 1,
                      padding: '11px 16px',
                      borderRadius: '24px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!draftText.trim() || isSending}
                    style={{
                      padding: '11px 22px',
                      borderRadius: '24px',
                      border: 'none',
                      background: draftText.trim() && !isSending ? '#0d9488' : '#94a3b8',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: draftText.trim() && !isSending ? 'pointer' : 'not-allowed',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    {isSending ? '...' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Select a contact on the left to start conversation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
