import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSession } from '../../context/SessionContext';
import { travelerMessagesActions } from '../../store/travelerMessages/travelerMessages-slice';
import {
  fetchTravelerMessages,
  retryFetchGuides,
  sendTravelerMessage,
} from '../../store/travelerMessages/travelerMessages-actions';
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
  // 1. Session / Dispatch
  const { user } = useSession();
  const dispatch = useDispatch();
  const travelerId = Number(user?.travelerId || user?.traveler_id || user?.id);

  // 2. Redux Selectors
  const { messages: rawMessages, guides, activeConvId, loading, isSending, error, guidesWarning } = useSelector(
    (state) => state.travelerMessages
  );

  // 3. Local UI State
  const [drafts, setDrafts] = useState({});
  const [sendErrors, setSendErrors] = useState({});

  // 4. Data Fetching
  useEffect(() => {
    if (travelerId) {
      dispatch(fetchTravelerMessages(travelerId));
    }
    dispatch(retryFetchGuides());
  }, [dispatch, travelerId]);

  // 5. Event Handlers
  const retryGuides = async () => {
    await dispatch(retryFetchGuides());
  };

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
      dispatch(travelerMessagesActions.setActiveConvId(withMsgs ? withMsgs.id : conversationList[0].id));
    }
  }, [dispatch, conversationList.length, activeConvId]);

  const activeConv = conversationsMap[activeConvId] || null;
  const activeMessages = activeConv ? activeConv.messages : [];

  // Handler: Send a new message
  const handleSendMessage = async (content) => {
    const targetConvId = activeConvId;
    const targetConv = conversationsMap[targetConvId];
    if (!targetConv || !content || !content.trim() || isSending) return;

    setSendErrors((prev) => ({ ...prev, [targetConvId]: null }));

    const payload = {
      sender: 'traveler',
      senderId: Number(travelerId),
      receiver: targetConv.otherRole,
      receiverId: Number(targetConv.otherId),
      content: content.trim(),
    };

    try {
      await dispatch(sendTravelerMessage(payload));

      // Clear draft ONLY for target conversation upon confirmed successful send
      setDrafts((prev) => ({ ...prev, [targetConvId]: '' }));
    } catch (err) {
      console.error('[TravelerMessagesPage] Message sending failed:', err);
      // Preserve draft on failure and show inline error
      setSendErrors((prev) => ({
        ...prev,
        [targetConvId]: err.message || 'Failed to send message. Please retry.',
      }));
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
          onClick={() => dispatch(fetchTravelerMessages(travelerId))}
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
            onClick={() => dispatch(fetchTravelerMessages(travelerId))}
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
          onSelectConv={(id) => dispatch(travelerMessagesActions.setActiveConvId(id))}
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
