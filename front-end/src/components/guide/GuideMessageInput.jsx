import React from 'react';

/**
 * GuideMessageInput
 * Controlled textarea + send button at the bottom of the messaging pane.
 *
 * Requirements met:
 * - Whitespace validation: draft.trim() === '' disables send
 * - Duplicate-send prevention: isSending flag disables the button
 * - Draft is NOT cleared here — parent clears it only after successful send
 * - Inline send error shown below the input
 * - Draft changes are reported to parent via onDraftChange
 *
 * Props:
 *  - draft         : string  — controlled value
 *  - onDraftChange : (value) => void
 *  - onSend        : () => void
 *  - isSending     : bool
 *  - sendError     : string | null
 *  - disabled      : bool   — true when no conversation is selected
 */
export default function GuideMessageInput({
  draft,
  onDraftChange,
  onSend,
  isSending,
  sendError,
  disabled,
}) {
  const canSend = !disabled && !isSending && draft.trim() !== '';

  function handleKeyDown(e) {
    // Ctrl+Enter or Cmd+Enter sends; plain Enter adds newline
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div className="guide-msg-input-area">
      {sendError && (
        <div className="guide-msg-send-error" role="alert">
          ⚠️ {sendError}
        </div>
      )}
      <div className="guide-msg-input-row">
        <textarea
          className="guide-msg-textarea"
          placeholder={disabled ? 'Select a conversation to send a message…' : 'Type a message… (Ctrl+Enter to send)'}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          rows={3}
          aria-label="Message text"
        />
        <button
          className="guide-msg-send-btn"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          {isSending ? '⟳' : '➤ Send'}
        </button>
      </div>
    </div>
  );
}
