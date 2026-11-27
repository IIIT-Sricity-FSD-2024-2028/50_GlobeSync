import React from 'react';

/**
 * MessageInput: Controlled message composition component.
 * 
 * Features:
 * - Controlled input state driven by parent conversation draft dictionary
 * - Strict validation: prevents empty or whitespace-only message submissions
 * - Disables input and submit button during active sending to prevent duplicate sends
 * - Displays inline error banner when message transmission fails, preserving draft
 * - Supports keyboard submission via Enter key
 */
export default function MessageInput({
  value = '',
  onChange,
  onSendMessage,
  sendError = null,
  onClearError,
  disabled = false,
  isSending = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled || isSending) return;

    const trimmed = (value || '').trim();
    // Prevent empty or whitespace-only message sends
    if (!trimmed) return;

    // Dispatches message to parent; parent clears draft ONLY upon successful backend persistence
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isInvalid = !(value || '').trim();

  return (
    <div style={{ borderTop: '1px solid var(--border-light, #eee)', background: '#ffffff', flexShrink: 0 }}>
      {/* Inline Error Banner on Failure - Draft is preserved */}
      {sendError && (
        <div
          style={{
            padding: '8px 20px',
            background: '#fef2f2',
            borderBottom: '1px solid #fee2e2',
            color: '#dc2626',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>⚠️ {sendError} (Your typed draft has been preserved)</span>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <input
          type="text"
          placeholder={disabled ? 'Select a conversation to reply...' : 'Type a message (Press Enter to send)...'}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          style={{
            flex: 1,
            padding: '12px 18px',
            borderRadius: '24px',
            border: `1.5px solid ${sendError ? '#ef4444' : 'var(--border)'}`,
            outline: 'none',
            fontSize: '14px',
            fontFamily: 'inherit',
            background: disabled ? '#f9fafb' : '#ffffff',
          }}
        />

        <button
          type="submit"
          disabled={disabled || isSending || isInvalid}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: disabled || isSending || isInvalid
              ? '#e5e7eb'
              : 'var(--gradient, linear-gradient(135deg, #E8467C 0%, #F5A623 100%))',
            color: disabled || isSending || isInvalid ? '#9ca3af' : '#ffffff',
            border: 'none',
            cursor: disabled || isSending || isInvalid ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '17px',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            boxShadow: disabled || isSending || isInvalid ? 'none' : '0 4px 10px rgba(232, 70, 124, 0.3)',
          }}
          title={isSending ? 'Sending...' : 'Send Message'}
        >
          {isSending ? '⏳' : '➤'}
        </button>
      </form>
    </div>
  );
}
