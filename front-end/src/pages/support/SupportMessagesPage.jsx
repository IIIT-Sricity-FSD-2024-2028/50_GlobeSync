import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { messagesApi, travelersApi } from '../../services/api';
import SupportChatWindow from '../../components/support/SupportChatWindow';

/**
 * SupportMessagesPage
 * 
 * Direct traveler support coordination center.
 * Enables customer support specialists to inspect incoming traveler inquiries
 * and post verified support replies.
 */
export default function SupportMessagesPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTravelerId = searchParams.get('travelerId');

  const careId = user?.careId || user?.care_id || user?.id || 1;

  const [travelers, setTravelers] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [activeTravelerId, setActiveTravelerId] = useState(
    queryTravelerId ? Number(queryTravelerId) : null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [travelersRes, messagesRes] = await Promise.allSettled([
        travelersApi.getAll({ signal }),
        messagesApi.getAll({ signal }),
      ]);

      if (signal?.aborted) return;

      if (travelersRes.status === 'fulfilled' && Array.isArray(travelersRes.value)) {
        setTravelers(travelersRes.value);
        // Default to first traveler if none selected
        if (!activeTravelerId && travelersRes.value.length > 0) {
          setActiveTravelerId(
            Number(travelersRes.value[0].travelerId || travelersRes.value[0].traveler_id)
          );
        }
      }

      if (messagesRes.status === 'fulfilled' && Array.isArray(messagesRes.value)) {
        setAllMessages(messagesRes.value);
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.message || 'Failed to load conversations.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, []);

  // Sync query param if provided
  useEffect(() => {
    if (queryTravelerId) {
      setActiveTravelerId(Number(queryTravelerId));
    }
  }, [queryTravelerId]);

  // Selected traveler object
  const activeTraveler = useMemo(() => {
    if (!activeTravelerId) return null;
    return travelers.find(
      (t) => Number(t.travelerId || t.traveler_id) === Number(activeTravelerId)
    );
  }, [travelers, activeTravelerId]);

  // Messages between support and this traveler
  const conversationMessages = useMemo(() => {
    if (!activeTravelerId) return [];
    return allMessages.filter(
      (m) =>
        (m.receiver === 'traveler' && Number(m.receiverId) === Number(activeTravelerId)) ||
        (m.sender === 'traveler' && Number(m.senderId) === Number(activeTravelerId))
    );
  }, [allMessages, activeTravelerId]);

  // Filter traveler list by search
  const filteredTravelers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return travelers;
    return travelers.filter(
      (t) =>
        t.name.toLowerCase().includes(search) ||
        (t.email && t.email.toLowerCase().includes(search)) ||
        String(t.travelerId || t.traveler_id).includes(search)
    );
  }, [travelers, searchTerm]);

  // Send reply
  const handleSendMessage = async (text) => {
    if (!activeTravelerId || isSending) return;
    setIsSending(true);

    try {
      const payload = {
        sender: 'support',
        senderId: Number(careId),
        receiver: 'traveler',
        receiverId: Number(activeTravelerId),
        content: text,
      };

      const newMsg = await messagesApi.create(payload);

      // Optimistically append or refresh
      if (newMsg) {
        setAllMessages((prev) => [...prev, newMsg]);
      } else {
        const refreshed = await messagesApi.getAll();
        if (refreshed) setAllMessages(refreshed);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      {/* Top Welcome */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          borderRadius: '16px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Traveler Direct Messaging 💬
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
            Coordinate support inquiries, answer traveler questions, and provide immediate incident assistance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/support/tickets')}
          className="btn btn-secondary btn-sm"
        >
          🎫 View Tickets Queue
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Two-Pane Chat Container */}
      <div
        className="card"
        style={{
          padding: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          height: 'calc(100vh - 240px)',
          minHeight: '520px',
          border: '1px solid var(--border)',
        }}
      >
        {/* Left Sidebar: Travelers List */}
        <div
          style={{
            width: '320px',
            borderRight: '1px solid var(--border-light, #eee)',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          {/* Header & Search */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border-light, #eee)',
              background: '#fafafa',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Traveler Inquiries ({travelers.length})
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search travelers..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                Loading travelers...
              </div>
            ) : filteredTravelers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                No travelers match search
              </div>
            ) : (
              filteredTravelers.map((t) => {
                const tId = Number(t.travelerId || t.traveler_id);
                const isSelected = tId === Number(activeTravelerId);

                // Find last message
                const msgs = allMessages.filter(
                  (m) =>
                    (m.receiver === 'traveler' && Number(m.receiverId) === tId) ||
                    (m.sender === 'traveler' && Number(m.senderId) === tId)
                );
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

                return (
                  <div
                    key={tId}
                    onClick={() => setActiveTravelerId(tId)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border-light, #f1f5f9)',
                      cursor: 'pointer',
                      background: isSelected ? '#ecfdf5' : '#ffffff',
                      borderLeft: isSelected ? '4px solid #10b981' : '4px solid transparent',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      {t.name ? t.name[0] : 'T'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          TC00{tId}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '2px',
                        }}
                      >
                        {lastMsg ? lastMsg.content : 'No messages logged'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Chat Thread & Input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <SupportChatWindow
            traveler={activeTraveler}
            messages={conversationMessages}
            onSendMessage={handleSendMessage}
            isSending={isSending}
            onNavigateToTickets={() => navigate('/support/tickets')}
          />
        </div>
      </div>
    </div>
  );
}
