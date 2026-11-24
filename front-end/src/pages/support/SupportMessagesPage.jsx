import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { messagesApi, travelersApi, agenciesApi, guidesApi } from '../../services/api';
import { useRealtimeEvent } from '../../context/RealtimeContext';
import SupportChatWindow from '../../components/support/SupportChatWindow';

/**
 * SupportMessagesPage
 * 
 * Direct customer support coordination center.
 * Enables customer support specialists to inspect incoming inquiries across
 * Travelers, Agencies, and Guides, and post verified support replies.
 */
export default function SupportMessagesPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTravelerId = searchParams.get('travelerId');

  const careId = user?.careId || user?.care_id || user?.id || 1;

  const [travelers, setTravelers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [guides, setGuides] = useState([]);
  const [allMessages, setAllMessages] = useState([]);

  const [filterTab, setFilterTab] = useState('All');
  const [activeContactKey, setActiveContactKey] = useState(
    queryTravelerId ? `traveler-${queryTravelerId}` : null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  // Subscribe to live incoming messages
  useRealtimeEvent('message.created', (event) => {
    const newMsg = event?.message || event?.data || event;
    if (newMsg && (newMsg.sender === 'support' || newMsg.receiver === 'support')) {
      setAllMessages((prev) => {
        const id = newMsg.messageId || newMsg.id;
        if (id && prev.some((m) => (m.messageId || m.id) === id)) return prev;
        return [...prev, newMsg];
      });
    }
  });

  const loadData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [travelersRes, agenciesRes, guidesRes, messagesRes] = await Promise.allSettled([
        travelersApi.getAll({ signal }),
        agenciesApi.getAll({ signal }),
        guidesApi.getAll({ signal }),
        messagesApi.getAll({ signal }),
      ]);

      if (signal?.aborted) return;

      if (travelersRes.status === 'fulfilled') {
        const val = travelersRes.value;
        const list = Array.isArray(val) ? val : val?.data || val?.value || [];
        setTravelers(list);
      }
      if (agenciesRes.status === 'fulfilled') {
        const val = agenciesRes.value;
        const list = Array.isArray(val) ? val : val?.data || val?.value || [];
        setAgencies(list);
      }
      if (guidesRes.status === 'fulfilled') {
        const val = guidesRes.value;
        const list = Array.isArray(val) ? val : val?.data || val?.value || [];
        setGuides(list);
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
      setActiveContactKey(`traveler-${queryTravelerId}`);
    }
  }, [queryTravelerId]);

  // Unified contacts list
  const allContacts = useMemo(() => {
    const list = [];
    travelers.forEach((t) => {
      const id = Number(t.travelerId || t.traveler_id || t.id);
      list.push({
        type: 'traveler',
        id,
        key: `traveler-${id}`,
        name: t.name || `Traveler #${id}`,
        email: t.email,
        phone: t.phone,
        badge: `TC00${id}`,
        roleLabel: 'Traveler',
        icon: '🧳',
        raw: t,
      });
    });
    agencies.forEach((a) => {
      const id = Number(a.agencyId || a.agency_id || a.id);
      list.push({
        type: 'agency',
        id,
        key: `agency-${id}`,
        name: a.businessName || a.name || a.agencyName || `Agency #${id}`,
        email: a.contactEmail || a.email,
        phone: a.contactPhone || a.phone,
        badge: `AG00${id}`,
        roleLabel: 'Agency',
        icon: '🏢',
        raw: a,
      });
    });
    guides.forEach((g) => {
      const id = Number(g.guideId || g.guide_id || g.id);
      list.push({
        type: 'guide',
        id,
        key: `guide-${id}`,
        name: g.name || `Guide #${id}`,
        email: g.email,
        phone: g.phone,
        badge: `GD00${id}`,
        roleLabel: 'Guide',
        icon: '🧭',
        raw: g,
      });
    });

    // Also include any contact who exchanged messages with support
    allMessages.forEach((m) => {
      let otherType, otherId;
      if (m.sender === 'support') {
        otherType = m.receiver;
        otherId = Number(m.receiverId);
      } else if (m.receiver === 'support') {
        otherType = m.sender;
        otherId = Number(m.senderId);
      }
      if (otherType && otherId && otherType !== 'support') {
        const key = `${otherType}-${otherId}`;
        if (!list.some((c) => c.key === key)) {
          const badgePrefix = otherType === 'agency' ? 'AG00' : otherType === 'guide' ? 'GD00' : 'TC00';
          const roleLabel = otherType === 'agency' ? 'Agency' : otherType === 'guide' ? 'Guide' : 'Traveler';
          const icon = otherType === 'agency' ? '🏢' : otherType === 'guide' ? '🧭' : '🧳';
          list.push({
            type: otherType,
            id: otherId,
            key,
            name: `${roleLabel} #${otherId}`,
            badge: `${badgePrefix}${otherId}`,
            roleLabel,
            icon,
          });
        }
      }
    });
    return list;
  }, [travelers, agencies, guides, allMessages]);

  // Filter contacts by tab and search
  const filteredContacts = useMemo(() => {
    let res = allContacts;
    if (filterTab === 'Travelers') res = res.filter((c) => c.type === 'traveler');
    else if (filterTab === 'Agencies') res = res.filter((c) => c.type === 'agency');
    else if (filterTab === 'Guides') res = res.filter((c) => c.type === 'guide');

    const search = searchTerm.toLowerCase().trim();
    if (search) {
      res = res.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          (c.email && c.email.toLowerCase().includes(search)) ||
          String(c.id).includes(search) ||
          c.badge.toLowerCase().includes(search)
      );
    }
    return res;
  }, [allContacts, filterTab, searchTerm]);

  // Selected contact object
  const activeContact = useMemo(() => {
    if (activeContactKey) {
      const found = allContacts.find((c) => c.key === activeContactKey);
      if (found) return found;
    }
    return filteredContacts[0] || allContacts[0] || null;
  }, [allContacts, filteredContacts, activeContactKey]);

  // Messages between support and activeContact
  const conversationMessages = useMemo(() => {
    if (!activeContact) return [];
    return allMessages.filter(
      (m) =>
        (m.receiver === activeContact.type && Number(m.receiverId) === Number(activeContact.id)) ||
        (m.sender === activeContact.type && Number(m.senderId) === Number(activeContact.id))
    );
  }, [allMessages, activeContact]);

  // Send reply
  const handleSendMessage = async (text) => {
    if (!activeContact || isSending) return;
    setIsSending(true);

    try {
      const payload = {
        sender: 'support',
        senderId: Number(careId),
        receiver: activeContact.type,
        receiverId: Number(activeContact.id),
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

  const tabs = ['All', 'Travelers', 'Agencies', 'Guides'];

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
            Cross-Actor Support Messaging 💬
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
            Coordinate inquiries across travelers, agency partners, and local tour guides with verified incident support.
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
        {/* Left Sidebar: Contacts List */}
        <div
          style={{
            width: '340px',
            borderRight: '1px solid var(--border-light, #eee)',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          {/* Header & Filter Tabs */}
          <div
            style={{
              padding: '16px 16px 12px 16px',
              borderBottom: '1px solid var(--border-light, #eee)',
              background: '#fafafa',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Inquiries Directory ({allContacts.length})
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              {tabs.map((tab) => {
                const isActive = filterTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: isActive ? '1px solid #10b981' : '1px solid #e2e8f0',
                      background: isActive ? '#ecfdf5' : '#fff',
                      color: isActive ? '#059669' : '#64748b',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search inquiries..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                Loading conversations...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                No contacts match search
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isSelected = activeContact && activeContact.key === c.key;

                // Find last message
                const msgs = allMessages.filter(
                  (m) =>
                    (m.receiver === c.type && Number(m.receiverId) === c.id) ||
                    (m.sender === c.type && Number(m.senderId) === c.id)
                );
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

                return (
                  <div
                    key={c.key}
                    onClick={() => setActiveContactKey(c.key)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid var(--border-light, #f1f5f9)',
                      cursor: 'pointer',
                      background: isSelected ? '#ecfdf5' : '#ffffff',
                      borderLeft: isSelected ? '4px solid #10b981' : '4px solid transparent',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background:
                          c.type === 'agency'
                            ? 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)'
                            : c.type === 'guide'
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '15px',
                        flexShrink: 0,
                      }}
                    >
                      {c.name ? c.name[0] : c.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px' }}>
                          {c.badge}
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
                        {lastMsg ? (lastMsg.content || lastMsg.message) : `New ${c.roleLabel} inquiry`}
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
            traveler={activeContact ? { ...activeContact, travelerId: activeContact.id } : null}
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
