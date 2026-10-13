import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * GuideConversationThread
 * Right panel showing messages in the selected conversation.
 *
 * Props:
 *  - messages      : Array<Message>
 *  - guideId       : number
 *  - contact       : { type, id, name } | null
 *  - isLoading     : bool
 *  - loadError     : string | null
 *  - pendingTrips  : Array<Trip>
 */
export default function GuideConversationThread({
  messages,
  guideId,
  contact,
  isLoading,
  loadError,
  pendingTrips = [],
}) {
  const bottomRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function formatTimestamp(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (!contact) {
    return (
      <div className="guide-msg-thread guide-msg-thread-empty">
        <div className="guide-msg-thread-placeholder">
          <span className="guide-msg-thread-placeholder-icon">💬</span>
          <p>Select a conversation to read messages.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="guide-msg-thread guide-msg-thread-loading">
        <div className="guide-msg-spinner" aria-live="polite">Loading messages…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="guide-msg-thread guide-msg-thread-error">
        <div className="guide-msg-thread-err-box">
          <span>⚠️</span> {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="guide-msg-thread">
      {/* Thread header */}
      <div className="guide-msg-thread-header">
        <span className="guide-msg-thread-header-icon" aria-hidden="true">
          {contact.type === 'agency' ? '🏢' : contact.type === 'support' ? '🎧' : '👤'}
        </span>
        <div className="guide-msg-thread-header-info">
          <span className="guide-msg-thread-header-name">{contact.name}</span>
          <span className="guide-msg-thread-header-role">
            {contact.type === 'agency' ? 'Agency' : contact.type === 'support' ? 'Support' : 'Traveler'}
          </span>
        </div>
      </div>

      {/* Pending Request Notice if applicable (reuses GuideRequestsPage decision flow) */}
      {pendingTrips && pendingTrips.length > 0 && (
        <div className="guide-msg-pending-request-banner">
          <div className="guide-msg-pending-request-text">
            <span>📋</span>
            <span>
              <strong>Pending Trip Request:</strong> {pendingTrips[0].destination} (Trip #{pendingTrips[0].tripId})
            </span>
          </div>
          <Link to="/guide/requests" className="guide-msg-pending-request-link">
            Review Request →
          </Link>
        </div>
      )}

      {/* Messages */}
      <div className="guide-msg-thread-body">
        {messages.length === 0 && (
          <div className="guide-msg-thread-no-messages">
            No messages yet. Start the conversation below.
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender === 'guide' && msg.senderId === guideId;
          return (
            <div
              key={msg.messageId}
              className={`guide-msg-bubble-wrap${isMine ? ' mine' : ' theirs'}`}
            >
              <div className={`guide-msg-bubble${isMine ? ' mine' : ' theirs'}`}>
                <p className="guide-msg-bubble-text">{msg.content}</p>
                <span className="guide-msg-bubble-time">{formatTimestamp(msg.timestamp)}</span>
              </div>
            </div>
          );
        })}
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
