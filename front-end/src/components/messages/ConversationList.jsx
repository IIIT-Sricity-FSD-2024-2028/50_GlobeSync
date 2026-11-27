import React, { useState } from 'react';

/**
 * ConversationList: Renders available conversation threads (guides and support).
 * 
 * Features:
 * - Search filter by participant name
 * - Visual avatars and role badges (Travel Guide, Customer Support)
 * - Last message snippet and timestamp
 * - Active thread indicator
 */
export default function ConversationList({
  conversations = [],
  activeConvId,
  onSelectConv,
  isLoading = false,
}) {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        width: '320px',
        borderRight: '1px solid var(--border-light, #eee)',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        flexShrink: 0,
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light, #eee)',
          background: '#fafbfc',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            💬 Conversations
          </h4>
          <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
            {conversations.length} Active
          </span>
        </div>

        {/* Search input */}
        <input
          type="text"
          placeholder="Filter contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '12px',
            borderRadius: '8px',
            border: '1.5px solid var(--border)',
            outline: 'none',
          }}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
          Loading conversations...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
          {search ? 'No contacts match your search.' : 'No conversations found.'}
        </div>
      )}

      {/* List of Contacts */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!isLoading &&
          filtered.map((conv) => {
            const isActive = activeConvId === conv.id;
            const lastMsg = conv.messages && conv.messages.length > 0
              ? conv.messages[conv.messages.length - 1]
              : null;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConv(conv.id)}
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  background: isActive ? '#fff7ed' : '#ffffff',
                  borderLeft: isActive ? '4px solid var(--primary, #E8467C)' : '4px solid transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: conv.otherRole === 'support'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #E8467C 0%, #F5A623 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '16px',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  {conv.avatar}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {conv.name}
                    </span>
                    {conv.lastTime && (
                      <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {conv.lastTime}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '11px', color: conv.otherRole === 'support' ? '#059669' : '#d97706', fontWeight: 600 }}>
                    {conv.role}
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '3px',
                    }}
                  >
                    {lastMsg ? lastMsg.content : 'No messages yet. Tap to start chat.'}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
