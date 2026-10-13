import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { messagesApi, tripsApi, travelersApi, agenciesApi } from '../../services/api';
import GuideConversationList from '../../components/guide/GuideConversationList';
import GuideConversationThread from '../../components/guide/GuideConversationThread';
import GuideMessageInput from '../../components/guide/GuideMessageInput';
import './guide.css';

// ---------------------------------------------------------------------------
// Helper – build a stable, canonical conversation key.
// The key is sorted so "guide:1|traveler:2" is the same regardless of who
// initiated the conversation.
// ---------------------------------------------------------------------------
function makeConvKey(typeA, idA, typeB, idB) {
  const parts = [`${typeA}:${idA}`, `${typeB}:${idB}`];
  parts.sort();
  return parts.join('|');
}

/**
 * GuideMessagesPage
 * Route: /guide/messages
 *
 * Data flow:
 *  1. On mount: fetch GET /messages/user/guide/:guideId  (all guide messages)
 *               fetch GET /trips/guide/:guideId          (assigned trips)
 *  2. Build contact list by merging:
 *       a) contacts extracted from actual messages (traveler/agency/support)
 *       b) contacts built from assigned trip travelers/agencies
 *     Dedup by "${type}-${id}" key. Support contacts only appear if they
 *     exist in real messages — never hardcoded.
 *  3. Selecting a conversation loads GET /messages/conversation with the
 *     correct senderType/senderId/receiverType/receiverId query.
 *  4. Drafts are stored per convKey in a plain object. Draft is cleared only
 *     on a successful POST /messages. An in-flight response for an old
 *     conversation cannot clear the current conversation's draft (checked
 *     by capturing activeSendKey at send-start and comparing on response).
 *  5. Manual refresh button reloads conversations + current thread.
 */
export default function GuideMessagesPage() {
  const { user } = useSession();
  const guideId = user?.guideId ?? user?.id;

  // ------------------------------------------------------------------
  // Primary data state
  // ------------------------------------------------------------------
  const [guideTrips, setGuideTrips] = useState([]);

  // ------------------------------------------------------------------
  // Conversation list state
  // ------------------------------------------------------------------
  const [contacts, setContacts] = useState([]);         // enriched contact objects
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ------------------------------------------------------------------
  // Selected conversation state
  // ------------------------------------------------------------------
  const [selectedConvKey, setSelectedConvKey] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  // ------------------------------------------------------------------
  // Thread (messages in selected conversation)
  // ------------------------------------------------------------------
  const [threadMessages, setThreadMessages] = useState([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState(null);

  // ------------------------------------------------------------------
  // Draft & send state (per convKey)
  // ------------------------------------------------------------------
  const [drafts, setDrafts] = useState({});         // { [convKey]: string }
  const [sendErrors, setSendErrors] = useState({});  // { [convKey]: string }
  const [isSending, setIsSending] = useState(false);

  // ------------------------------------------------------------------
  // Traveler name cache: { [id]: name }
  // ------------------------------------------------------------------
  const travelerNamesRef = useRef({});
  const agencyNamesRef = useRef({});

  // ------------------------------------------------------------------
  // Abort controllers
  // ------------------------------------------------------------------
  const contactsAbortRef = useRef(null);
  const threadAbortRef = useRef(null);

  // ====================================================================
  // STEP 1: Load all messages + trips, build contact list
  // ====================================================================
  const loadContacts = useCallback(async () => {
    if (!guideId) {
      setIsLoadingContacts(false);
      setContactsError('No active guide session. Please log in again.');
      return;
    }

    // Cancel previous in-flight request
    if (contactsAbortRef.current) contactsAbortRef.current.abort();
    const controller = new AbortController();
    contactsAbortRef.current = controller;

    setIsLoadingContacts(true);
    setContactsError(null);

    try {
      // Parallel: all guide messages + guide trips
      const [allMessages, trips] = await Promise.all([
        messagesApi.getByUser('guide', guideId, { signal: controller.signal }),
        tripsApi.getByGuide(guideId, { signal: controller.signal }).catch(() => []),
      ]);

      if (controller.signal.aborted) return;

      setGuideTrips(trips);

      // ------------------------------------------------------------------
      // Collect unique other-party (type, id) pairs from actual messages
      // ------------------------------------------------------------------
      const seenKeys = new Set();
      const rawContacts = []; // { type, id, lastMessage, lastTimestamp }

      for (const msg of allMessages) {
        let otherType, otherId;
        if (msg.sender === 'guide' && msg.senderId === guideId) {
          otherType = msg.receiver;
          otherId = msg.receiverId;
        } else if (msg.receiver === 'guide' && msg.receiverId === guideId) {
          otherType = msg.sender;
          otherId = msg.senderId;
        } else {
          continue; // not our message
        }
        const dedupeKey = `${otherType}-${otherId}`;
        if (seenKeys.has(dedupeKey)) {
          // Update last message if newer
          const existing = rawContacts.find((c) => c.dedupeKey === dedupeKey);
          if (existing && msg.timestamp > existing.lastTimestamp) {
            existing.lastMessage = msg.content;
            existing.lastTimestamp = msg.timestamp;
          }
          continue;
        }
        seenKeys.add(dedupeKey);
        rawContacts.push({
          dedupeKey,
          type: otherType,
          id: otherId,
          lastMessage: msg.content,
          lastTimestamp: msg.timestamp,
        });
      }

      // ------------------------------------------------------------------
      // Also add trip-based contacts (traveler or agency) even if no
      // message has been exchanged yet. Support is NEVER synthesised.
      // ------------------------------------------------------------------
      for (const trip of trips) {
        if (trip.travelerId) {
          const dedupeKey = `traveler-${trip.travelerId}`;
          if (!seenKeys.has(dedupeKey)) {
            seenKeys.add(dedupeKey);
            rawContacts.push({
              dedupeKey,
              type: 'traveler',
              id: trip.travelerId,
              lastMessage: null,
              lastTimestamp: null,
            });
          }
        }
        if (trip.agencyId) {
          const dedupeKey = `agency-${trip.agencyId}`;
          if (!seenKeys.has(dedupeKey)) {
            seenKeys.add(dedupeKey);
            rawContacts.push({
              dedupeKey,
              type: 'agency',
              id: trip.agencyId,
              lastMessage: null,
              lastTimestamp: null,
            });
          }
        }
      }

      // ------------------------------------------------------------------
      // Resolve display names
      // ------------------------------------------------------------------
      const travelerIds = rawContacts
        .filter((c) => c.type === 'traveler' && !travelerNamesRef.current[c.id])
        .map((c) => c.id);

      const agencyIds = rawContacts
        .filter((c) => c.type === 'agency' && !agencyNamesRef.current[c.id])
        .map((c) => c.id);

      // Fetch travelers if needed
      if (travelerIds.length > 0) {
        try {
          const travelers = await travelersApi.getAll({ signal: controller.signal });
          if (!controller.signal.aborted) {
            for (const t of travelers) {
              travelerNamesRef.current[t.travelerId ?? t.id] =
                [t.firstName, t.lastName].filter(Boolean).join(' ') || `Traveler #${t.travelerId ?? t.id}`;
            }
          }
        } catch {
          // non-critical — fallback names used below
        }
      }

      // Fetch agencies if needed
      if (agencyIds.length > 0) {
        try {
          const agencies = await agenciesApi.getLookup({ signal: controller.signal });
          if (!controller.signal.aborted) {
            for (const a of agencies) {
              agencyNamesRef.current[a.agencyId ?? a.id] = a.name || `Agency #${a.agencyId ?? a.id}`;
            }
          }
        } catch {
          // non-critical
        }
      }

      if (controller.signal.aborted) return;

      // ------------------------------------------------------------------
      // Build final enriched contacts
      // ------------------------------------------------------------------
      const enriched = rawContacts.map((c) => {
        let name;
        if (c.type === 'traveler') {
          name = travelerNamesRef.current[c.id] || `Traveler #${c.id}`;
        } else if (c.type === 'agency') {
          name = agencyNamesRef.current[c.id] || `Agency #${c.id}`;
        } else if (c.type === 'support') {
          name = `Support #${c.id}`;
        } else {
          name = `${c.type} #${c.id}`;
        }

        return {
          ...c,
          name,
          convKey: makeConvKey('guide', guideId, c.type, c.id),
        };
      });

      // Sort: contacts with recent messages first, then alphabetical
      enriched.sort((a, b) => {
        if (a.lastTimestamp && b.lastTimestamp) {
          return b.lastTimestamp.localeCompare(a.lastTimestamp);
        }
        if (a.lastTimestamp) return -1;
        if (b.lastTimestamp) return 1;
        return a.name.localeCompare(b.name);
      });

      setContacts(enriched);
    } catch (err) {
      if (err.isCancelled || controller.signal.aborted) return;
      setContactsError(err.message || 'Failed to load conversations.');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingContacts(false);
      }
    }
  }, [guideId]);

  useEffect(() => {
    loadContacts();
    return () => {
      if (contactsAbortRef.current) contactsAbortRef.current.abort();
    };
  }, [loadContacts]);

  // ====================================================================
  // STEP 2: Load thread when a conversation is selected
  // ====================================================================
  const loadThread = useCallback(
    async (contact) => {
      if (!contact || !guideId) return;

      if (threadAbortRef.current) threadAbortRef.current.abort();
      const controller = new AbortController();
      threadAbortRef.current = controller;

      setIsLoadingThread(true);
      setThreadError(null);
      setThreadMessages([]);

      try {
        // The conversation endpoint is bidirectional — either participant
        // can be listed as sender/receiver; the service handles both directions.
        const msgs = await messagesApi.getConversation(
          'guide',
          guideId,
          contact.type,
          contact.id,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        // Sort chronologically (seed data timestamps may vary)
        const sorted = [...msgs].sort((a, b) =>
          (a.timestamp || '').localeCompare(b.timestamp || ''),
        );
        setThreadMessages(sorted);
      } catch (err) {
        if (err.isCancelled || controller.signal.aborted) return;
        setThreadError(err.message || 'Failed to load messages.');
      } finally {
        if (!controller.signal.aborted) setIsLoadingThread(false);
      }
    },
    [guideId],
  );

  // ====================================================================
  // Conversation selection
  // ====================================================================
  function handleSelectConversation(convKey, contact) {
    setSelectedConvKey(convKey);
    setSelectedContact(contact);
    loadThread(contact);
    // Clear send error for newly selected conversation
    setSendErrors((prev) => ({ ...prev, [convKey]: null }));
  }

  // ====================================================================
  // Draft management
  // ====================================================================
  function handleDraftChange(value) {
    if (!selectedConvKey) return;
    setDrafts((prev) => ({ ...prev, [selectedConvKey]: value }));
  }

  // ====================================================================
  // STEP 3: Send a message
  // Core rule: capture activeSendKey at send-start.
  // Only clear draft if activeSendKey === selectedConvKey after response.
  // This prevents an earlier response clearing a draft in a different convo.
  // ====================================================================
  async function handleSend() {
    if (!selectedConvKey || !selectedContact || !guideId) return;

    const draft = drafts[selectedConvKey] || '';
    if (draft.trim() === '') return;      // whitespace guard
    if (isSending) return;                // duplicate-send guard

    // Capture at send-time
    const activeSendKey = selectedConvKey;
    const activeContact = selectedContact;

    setIsSending(true);
    setSendErrors((prev) => ({ ...prev, [activeSendKey]: null }));

    try {
      const payload = {
        sender: 'guide',
        senderId: guideId,
        receiver: activeContact.type,
        receiverId: activeContact.id,
        content: draft.trim(),
      };

      const sent = await messagesApi.create(payload);

      // Only clear draft if we are still in the same conversation
      if (activeSendKey === selectedConvKey) {
        setDrafts((prev) => ({ ...prev, [activeSendKey]: '' }));
        setSendErrors((prev) => ({ ...prev, [activeSendKey]: null }));

        // Append the sent message optimistically to the thread
        setThreadMessages((prev) =>
          [...prev, sent].sort((a, b) =>
            (a.timestamp || '').localeCompare(b.timestamp || ''),
          ),
        );

        // Refresh conversation list to update lastMessage preview
        loadContacts();
      }
    } catch (err) {
      if (err.isCancelled) return;
      // Preserve draft, show inline error
      if (activeSendKey === selectedConvKey) {
        setSendErrors((prev) => ({
          ...prev,
          [activeSendKey]: err.message || 'Failed to send. Please try again.',
        }));
      }
      // Draft intentionally NOT cleared on error
    } finally {
      setIsSending(false);
    }
  }

  // ====================================================================
  // Manual refresh: reload contacts + current thread
  // ====================================================================
  function handleRefresh() {
    loadContacts();
    if (selectedContact) loadThread(selectedContact);
  }

  // ====================================================================
  // Derived values
  // ====================================================================
  const currentDraft = drafts[selectedConvKey] || '';
  const currentSendError = sendErrors[selectedConvKey] || null;

  // Pending trip requests for current contact (reuses GuideRequestsPage flow)
  const pendingTripsForSelected = useMemo(() => {
    if (!selectedContact) return [];
    return guideTrips.filter((t) => {
      const match = selectedContact.type === 'agency'
        ? Number(t.agencyId) === Number(selectedContact.id)
        : Number(t.travelerId) === Number(selectedContact.id);
      return match && (t.guideStatus === 'Pending' || t.status === 'Pending');
    });
  }, [guideTrips, selectedContact]);

  // ====================================================================
  // Render
  // ====================================================================
  return (
    <div className="guide-container">
      {/* Page title bar */}
      <div className="guide-welcome-card">
        <div>
          <h1 className="guide-welcome-title">💬 Messages</h1>
          <p className="guide-welcome-subtitle">
            Communicate with your assigned travelers, agencies, and support.
          </p>
        </div>

        <div className="guide-header-actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="guide-refresh-btn"
            disabled={isLoadingContacts || isLoadingThread}
            title="Refresh messages and conversations from backend"
          >
            <span>🔄</span>
            <span>{isLoadingContacts || isLoadingThread ? 'Loading...' : 'Refresh Messages'}</span>
          </button>
        </div>
      </div>

      {/* Error loading contacts */}
      {contactsError && (
        <div className="guide-msg-contacts-error" role="alert">
          ⚠️ {contactsError}
          <button className="guide-msg-retry-link" onClick={loadContacts}>
            Retry
          </button>
        </div>
      )}

      {/* Two-pane layout */}
      <div className="guide-msg-layout">
        {/* LEFT: Conversation list */}
        <GuideConversationList
          contacts={contacts}
          selectedConvKey={selectedConvKey}
          onSelect={handleSelectConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          isLoading={isLoadingContacts}
        />

        {/* RIGHT: Thread + input */}
        <div className="guide-msg-right-panel">
          <GuideConversationThread
            messages={threadMessages}
            guideId={guideId}
            contact={selectedContact}
            isLoading={isLoadingThread}
            loadError={threadError}
            pendingTrips={pendingTripsForSelected}
          />
          <GuideMessageInput
            draft={currentDraft}
            onDraftChange={handleDraftChange}
            onSend={handleSend}
            isSending={isSending}
            sendError={currentSendError}
            disabled={!selectedConvKey}
          />
        </div>
      </div>
    </div>
  );
}
