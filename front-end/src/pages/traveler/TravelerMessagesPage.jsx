import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { messagesApi, guidesApi } from '../../services/api';
import ConversationList from '../../components/messages/ConversationList';
import MessageThread from '../../components/messages/MessageThread';
import MessageInput from '../../components/messages/MessageInput';

/**
 * TravelerMessagesPage: Direct coordination chat center for travelers.
 * 
 * Features:
 * - Loads all traveler messages via GET /messages/user/traveler/:userId
 * - Groups bidirectional conversations by contact (Tour Guides, Support)
 * - Sends messages via POST /messages
 * - Prevents empty or repeated sends with submitting states
 * - Provides manual refresh without requiring WebSockets or complex polling
 */
export default function TravelerMessagesPage() {
  const { user } = useSession();
  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  const [rawMessages, setRawMessages] = useState([]);
  const [guides, setGuides] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [sendErrors, setSendErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [guidesWarning, setGuidesWarning] = useState(null);

  const loadData = async (signal) => {
    if (!travelerId) {
      setLoading(false);
      setError('No authenticated traveler session found. Please log in.');
      return;
    }

    setLoading(true);
    setError(null);
    setGuidesWarning(null);

    try {
      const [messagesRes, guidesRes] = await Promise.allSettled([
        messagesApi.getByUser('traveler', travelerId, { signal }),
        guidesApi.getAll({ signal }),
      ]);

      if (signal?.aborted) return;

      // 1. Primary Required: Messages
      if (messagesRes.status === 'fulfilled') {
        setRawMessages(Array.isArray(messagesRes.value) ? messagesRes.value : []);
      } else if (!messagesRes.reason?.isCancelled) {
        setError(messagesRes.reason?.message || 'Failed to load messages from backend.');
      }

      // 2. Secondary Optional: Guide directory for contact names
      if (guidesRes.status === 'fulfilled') {
        setGuides(Array.isArray(guidesRes.value) ? guidesRes.value : []);
        setGuidesWarning(null);
      } else if (!guidesRes.reason?.isCancelled) {
        setGuides([]);
        if (messagesRes.status === 'fulfilled') {
          setGuidesWarning(
            'Tour guide directory is temporarily unavailable. Guide conversations will show numeric IDs instead of full names.'
          );
        }
      }
    } catch (err) {
      if (!err.isCancelled && !signal?.aborted) {
        console.error('[TravelerMessagesPage] Error loading messages:', err);
        setError(err.message || 'Failed to load messages from backend.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const retryGuides = async () => {
    try {
      const data = await guidesApi.getAll();
      setGuides(Array.isArray(data) ? data : []);
      setGuidesWarning(null);
    } catch (err) {
      console.warn('[MessagesPage] Retry guides failed:', err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [travelerId]);

  // Build conversational roster
  const conversationsMap = {};

  // 1. Always ensure Support Desk is in the roster without unsupported named assumptions
  conversationsMap['support_1'] = {
    id: 'support_1',
    otherRole: 'support',
    otherId: 1,
    name: 'Customer Support Care Desk',
    role: 'Helpdesk & Care',
    avatar: '🎧',
    messages: [],
    lastTime: null,
  };

  // 2. Add registered guides into the roster
  guides.forEach((g) => {
    const key = `guide_${g.guideId}`;
    conversationsMap[key] = {
      id: key,
      otherRole: 'guide',
      otherId: g.guideId,
      name: g.name || `Tour Guide #${g.guideId}`,
      role: 'Tour Guide',
      avatar: g.name ? g.name[0].toUpperCase() : '🧭',
      messages: [],
      lastTime: null,
    };
  });

  // 3. Bucket all messages into matching conversation
  rawMessages.forEach((m) => {
    const isMeSender = m.sender === 'traveler' && Number(m.senderId) === Number(travelerId);
    const otherRole = isMeSender ? m.receiver : m.sender;
    const otherId = isMeSender ? m.receiverId : m.senderId;
    const key = `${otherRole}_${otherId}`;

    if (!conversationsMap[key]) {
      let displayName = `${otherRole} #${otherId}`;
      let roleTitle = otherRole;
      let avatarChar = '👤';

      if (otherRole === 'guide') {
        const found = guides.find((g) => g.guideId === Number(otherId));
        if (found) {
          displayName = found.name;
          roleTitle = 'Tour Guide';
          avatarChar = found.name[0];
        } else {
          displayName = `Tour Guide #${otherId}`;
          roleTitle = 'Tour Guide';
          avatarChar = '🧭';
        }
      } else if (otherRole === 'support') {
        displayName = 'Customer Support Care Desk';
        roleTitle = 'Helpdesk';
        avatarChar = '🎧';
      }

      conversationsMap[key] = {
        id: key,
        otherRole,
        otherId: Number(otherId),
        name: displayName,
        role: roleTitle,
        avatar: avatarChar,
        messages: [],
        lastTime: null,
      };
    }

    conversationsMap[key].messages.push(m);
    if (m.timestamp) {
      try {
        const d = new Date(m.timestamp);
        conversationsMap[key].lastTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        // Ignore date parsing error
      }
    }
  });

  const conversationList = Object.values(conversationsMap);

  // Set default active conversation if not set
  useEffect(() => {
    if (!activeConvId && conversationList.length > 0) {
      // Prefer conversation with existing messages, else first
      const withMsgs = conversationList.find((c) => c.messages.length > 0);
      setActiveConvId(withMsgs ? withMsgs.id : conversationList[0].id);
    }
  }, [conversationList.length, activeConvId]);

  const activeConv = conversationsMap[activeConvId] || null;
  const activeMessages = activeConv ? activeConv.messages : [];

  // Handler: Send a new message
  const handleSendMessage = async (content) => {
    const targetConvId = activeConvId;
    const targetConv = conversationsMap[targetConvId];
    if (!targetConv || !content || !content.trim() || isSending) return;

    setIsSending(true);
    setSendErrors((prev) => ({ ...prev, [targetConvId]: null }));

    const payload = {
      sender: 'traveler',
      senderId: Number(travelerId),
      receiver: targetConv.otherRole,
      receiverId: Number(targetConv.otherId),
      content: content.trim(),
    };

    try {
      const createdMessage = await messagesApi.create(payload);

      // Immutable state update: Append message immediately
      setRawMessages((prev) => [...prev, createdMessage]);

      // Clear draft ONLY for target conversation upon confirmed successful send
      setDrafts((prev) => ({ ...prev, [targetConvId]: '' }));
    } catch (err) {
      console.error('[TravelerMessagesPage] Message sending failed:', err);
      // Preserve draft on failure and show inline error
      setSendErrors((prev) => ({
        ...prev,
        [targetConvId]: err.message || 'Failed to send message. Please retry.',
      }));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="traveler-messages-page" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            💬 Traveler Messaging Center
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px', margin: 0 }}>
            Communicate directly with your assigned travel guides and customer care desk.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '8px' }}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Messages'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 18px',
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '10px',
            color: '#991b1b',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => loadData()}
            className="btn btn-secondary"
            style={{ padding: '4px 12px', fontSize: '12px' }}
          >
            Retry ↺
          </button>
        </div>
      )}

      {guidesWarning && (
        <div
          style={{
            padding: '12px 18px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            color: '#92400e',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span>⚠️ {guidesWarning}</span>
          <button
            type="button"
            onClick={() => retryGuides()}
            style={{
              background: 'none',
              border: 'none',
              color: '#b45309',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline',
            }}
          >
            Retry Guides ↺
          </button>
        </div>
      )}

      {/* Messaging Layout Box */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
          minHeight: '480px',
        }}
      >
        {/* Left: Contact Conversations List */}
        <ConversationList
          conversations={conversationList}
          activeConvId={activeConvId}
          onSelectConv={(id) => setActiveConvId(id)}
          isLoading={loading}
        />

        {/* Right: Active Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
          <MessageThread
            activeConv={activeConv}
            messages={activeMessages}
            travelerId={travelerId}
          />

          <MessageInput
            value={drafts[activeConvId] || ''}
            onChange={(val) => {
              setDrafts((prev) => ({ ...prev, [activeConvId]: val }));
              if (sendErrors[activeConvId]) {
                setSendErrors((prev) => ({ ...prev, [activeConvId]: null }));
              }
            }}
            onSendMessage={handleSendMessage}
            sendError={sendErrors[activeConvId] || null}
            onClearError={() => setSendErrors((prev) => ({ ...prev, [activeConvId]: null }))}
            disabled={!activeConv || loading}
            isSending={isSending}
          />
        </div>
      </div>
    </div>
  );
}
