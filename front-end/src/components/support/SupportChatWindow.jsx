import React, { useState, useEffect, useRef } from 'react';

/**
 * SupportChatWindow
 * 
 * Interactive conversation panel for support representatives to chat with travelers.
 * Provides real-time message stream, sender/receiver distinction, and controlled reply input.
 */
export default function SupportChatWindow({
  traveler,
  messages = [],
  onSendMessage,
  isSending = false,
  onNavigateToTickets,
}) {
  const [content, setContent] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!traveler) {
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
          height: '100%',
        }}
      >
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>💬</div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Select a Traveler Conversation
        </h3>
        <p style={{ fontSize: '13px', maxWidth: '360px', marginTop: '6px' }}>
          Choose a traveler from the left channel to inspect support inquiry history and reply directly.
        </p>
      </div>
    );
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;
    const textToSend = content.trim();
    setContent('');
    try {
      await onSendMessage(textToSend);
    } catch {
      // Restore on failure
      setContent(textToSend);
    }
  };

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
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 0,
        background: '#fff',
      }}
    >
      {/* Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 800,
            }}
          >
            {traveler.name ? traveler.name[0] : 'T'}
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {traveler.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '12px' }}>
              <span style={{ color: 'var(--muted)' }}>
                Customer TC00{traveler.travelerId || traveler.traveler_id}
              </span>
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                ● Active Traveler
              </span>
            </div>
          </div>
        </div>

        {onNavigateToTickets && (
          <button
            type="button"
            onClick={onNavigateToTickets}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            🎫 View Tickets Queue
          </button>
        )}
      </div>

      {/* Messages Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: '#f8fafc',
          minHeight: 0,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              color: 'var(--muted)',
              padding: '30px',
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '8px' }}>👋</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              No messages logged yet
            </div>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Send a greeting or support confirmation to initiate conversation with {traveler.name}.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isSupport = m.sender === 'support';

            return (
              <div
                key={m.messageId || `${m.timestamp}-${idx}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isSupport ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                }}
              >
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: '16px',
                    borderBottomRightRadius: isSupport ? '4px' : '16px',
                    borderBottomLeftRadius: !isSupport ? '4px' : '16px',
                    background: isSupport
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : '#ffffff',
                    color: isSupport ? '#ffffff' : 'var(--text-primary)',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    border: isSupport ? 'none' : '1px solid var(--border-light, #e2e8f0)',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {m.content}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--muted)',
                    marginTop: '4px',
                    padding: '0 4px',
                    alignSelf: isSupport ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span>{isSupport ? 'Customer Support' : traveler.name}</span>
                  <span>•</span>
                  <span>{formatTime(m.timestamp)}</span>
                  {isSupport && <span style={{ color: '#10b981', fontWeight: 800 }}>✓✓</span>}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-light, #eee)',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Type support reply to ${traveler.name}...`}
          disabled={isSending}
          style={{
            flex: 1,
            padding: '12px 18px',
            borderRadius: '24px',
            border: '1.5px solid #cbd5e1',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!content.trim() || isSending}
          className="btn btn-primary"
          style={{
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            fontSize: '18px',
            color: '#fff',
            cursor: !content.trim() || isSending ? 'not-allowed' : 'pointer',
            opacity: !content.trim() || isSending ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {isSending ? '⏳' : '➤'}
        </button>
      </form>
    </div>
  );
}
