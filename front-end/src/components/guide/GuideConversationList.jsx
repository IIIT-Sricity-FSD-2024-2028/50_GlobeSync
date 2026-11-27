import React, { useMemo } from 'react';

/**
 * GuideConversationList
 * Left sidebar listing all known conversations.
 *
 * Props:
 *  - contacts        : Array<{ type, id, name, lastMessage, lastTimestamp }>
 *  - selectedConvKey : string | null  — currently selected conversation key
 *  - onSelect        : (convKey, contact) => void
 *  - searchQuery     : string
 *  - onSearchChange  : (query) => void
 *  - onRefresh       : () => void
 *  - isLoading       : bool
 */
export default function GuideConversationList({
  contacts,
  selectedConvKey,
  onSelect,
  searchQuery,
  onSearchChange,
  onRefresh,
  isLoading,
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q)),
    );
  }, [contacts, searchQuery]);

  function formatTimestamp(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function roleIcon(type) {
    if (type === 'agency') return '🏢';
    if (type === 'support') return '🎧';
    return '👤';
  }

  return (
    <div className="guide-msg-conv-list">
      {/* Header */}
      <div className="guide-msg-conv-header">
        <h3 className="guide-msg-conv-title">Messages</h3>
        <button
          className="guide-msg-refresh-btn"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh conversations"
          aria-label="Refresh conversations"
        >
          {isLoading ? '⟳ Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Search */}
      <div className="guide-msg-search-wrap">
        <input
          type="text"
          className="guide-msg-search-input"
          placeholder="Search conversations…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search conversations"
        />
      </div>

      {/* List */}
      <div className="guide-msg-conv-items">
        {isLoading && contacts.length === 0 && (
          <div className="guide-msg-conv-loading">Loading conversations…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="guide-msg-conv-empty">
            {searchQuery ? 'No conversations match your search.' : 'No conversations yet.'}
          </div>
        )}
        {filtered.map((contact) => {
          const isActive = contact.convKey === selectedConvKey;
          return (
            <button
              key={contact.convKey}
              className={`guide-msg-conv-item${isActive ? ' active' : ''}`}
              onClick={() => onSelect(contact.convKey, contact)}
              aria-pressed={isActive}
            >
              <span className="guide-msg-conv-avatar" aria-hidden="true">
                {roleIcon(contact.type)}
              </span>
              <div className="guide-msg-conv-info">
                <div className="guide-msg-conv-name-row">
                  <span className="guide-msg-conv-name">{contact.name}</span>
                  {contact.lastTimestamp && (
                    <span className="guide-msg-conv-time">
                      {formatTimestamp(contact.lastTimestamp)}
                    </span>
                  )}
                </div>
                <div className="guide-msg-conv-role">
                  {contact.type === 'agency'
                    ? 'Agency'
                    : contact.type === 'support'
                    ? 'Support'
                    : 'Traveler'}
                </div>
                {contact.lastMessage && (
                  <div className="guide-msg-conv-preview">{contact.lastMessage}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
