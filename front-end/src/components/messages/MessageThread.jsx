import React, { useEffect, useRef } from 'react';

/**
 * MessageThread: Displays the chronological stream of chat messages between the traveler and recipient.
 * 
 * Features:
 * - Clear sender vs. receiver bubble styling
 * - Auto-scrolls smoothly to the latest message
 * - Displays message delivery timestamps and read checkmarks
 * - Empty state with friendly prompt to start conversation
 */
export default function MessageThread({
  activeConv,
  messages = [],
  travelerId,
}) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom whenever messages array updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!activeConv) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafbfc',
          padding: '40px',
          textAlign: 'center',
          color: 'var(--muted)',
        }}
      >
        <div style={{ fontSize: '54px', marginBottom: '14px' }}>💬</div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Select a Conversation
        </h3>
        <p style={{ fontSize: '13px', maxWidth: '340px', marginTop: '6px' }}>
          Choose an assigned tour guide or customer support representative to view and send messages.
        </p>
      </div>
    );
  }

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      {/* Thread Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-light, #eee)',
          background: '#fafbfc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: activeConv.otherRole === 'support'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #E8467C 0%, #F5A623 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '17px',
            }}
          >
            {activeConv.avatar}
          </div>

          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {activeConv.name}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                {activeConv.role}
              </span>
              <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                ● Active
              </span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--muted)', background: '#f3f4f6', padding: '4px 10px', borderRadius: '12px' }}>
          Direct Coordination Thread
        </div>
      </div>

      {/* Messages Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: '#f8fafc',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              color: 'var(--muted)',
              padding: '40px',
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>👋</div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              No messages yet
            </h4>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Say hello to {activeConv.name} to start your coordination.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender === 'traveler' && Number(m.senderId) === Number(travelerId);

            return (
              <div
                key={m.messageId || `${m.timestamp}-${m.content}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                }}
              >
                {/* Bubble */}
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: '16px',
                    borderBottomRightRadius: isMe ? '4px' : '16px',
                    borderBottomLeftRadius: !isMe ? '4px' : '16px',
                    background: isMe
                      ? 'linear-gradient(135deg, #E8467C 0%, #D8336D 100%)'
                      : '#ffffff',
                    color: isMe ? '#ffffff' : 'var(--text-primary)',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    border: isMe ? 'none' : '1px solid var(--border-light, #eee)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {m.content}
                </div>

                {/* Timestamp and Delivery checkmark */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--muted)',
                    marginTop: '4px',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    padding: '0 4px',
                  }}
                >
                  <span>{formatTime(m.timestamp)}</span>
                  {isMe && <span style={{ color: '#0ea5e9', fontWeight: 800 }}>✓✓</span>}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
