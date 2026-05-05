let activeConvId = null;
let _myTrips = [], _allTravelers = [], _allMessages = [];
let user = null, guideId = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn() || Auth.getRole() !== 'guide') {
    console.warn('[guide-messages] Not authenticated as guide. Redirecting...');
    window.location.href = '../login.html?role=guide';
    return;
  }
  user = Auth.getUser();
  guideId = getUserId();
  console.log('[guide-messages] Logged-in guide:', user);
  console.log('[guide-messages] guideId:', guideId);

  loadData();
  if (typeof injectNotifBell === 'function') injectNotifBell('guide');
});

async function loadData() {
  try {
    console.log('[guide-messages] Loading data for guideId:', guideId);
    [_myTrips, _allTravelers, _allMessages] = await Promise.all([
      apiGetSnake(`/trips/guide/${guideId}`),
      apiGetSnake('/travelers'),
      apiGetSnake(`/messages/user/guide/${guideId}`).then(res => Array.isArray(res) ? res : (res.value || []))
    ]);
    console.log('[guide-messages] trips:', _myTrips.length, 'travelers:', _allTravelers.length, 'messages:', _allMessages.length);
    renderConversationList();
    if (activeConvId) {
      openConversation(activeConvId);
    } else {
      const convs = getConversations();
      if (convs.length > 0) openConversation(convs[0].id);
    }
  } catch (e) { console.error('[guide-messages] Failed to load messages:', e); }
}

function getConversations() {
  const convs = {};

  // Include travelers from assigned trips
  _myTrips.forEach(t => {
    if (!convs[t.traveler_id]) {
      const traveler = _allTravelers.find(tr => tr.traveler_id === t.traveler_id);
      if (traveler) {
        convs[t.traveler_id] = {
          id: t.traveler_id,
          traveler: traveler,
          latestTrip: t,
          messages: [],
          unread: t.status === 'Pending' || t.status === 'Planning'
        };
      }
    }
  });

  // Add messages
  _allMessages.forEach(m => {
    const isMeSender = (m.sender === 'guide' && m.sender_id == guideId);
    const otherId = isMeSender ? m.receiver_id : m.sender_id;
    
    if (!convs[otherId]) {
      const traveler = _allTravelers.find(tr => tr.traveler_id === otherId);
      if (traveler) {
        convs[otherId] = {
          id: otherId,
          traveler: traveler,
          latestTrip: _myTrips.find(t => t.traveler_id === otherId) || { status: 'None', destination: 'N/A' },
          messages: [],
          unread: false
        };
      }
    }
    
    if (convs[otherId]) {
      convs[otherId].messages.push({
        from: isMeSender ? 'guide' : 'traveler',
        type: 'text',
        text: m.content,
        time: formatMsgTime(m.timestamp)
      });
    }
  });

  return Object.values(convs);
}

function renderConversationList() {
  const conversations = getConversations();
  const unreadCount = conversations.filter(c => c.unread).length;
  document.getElementById('unread-badge').textContent = unreadCount;

  document.getElementById('msg-list').innerHTML = conversations.map(c => {
    const lastMsg = c.messages[c.messages.length - 1];
    const snippet = lastMsg ? lastMsg.text.substring(0, 45) + '...' : `📩 Assigned trip — ${c.latestTrip.destination}`;
    return `
    <div class="msg-item ${c.unread ? 'unread' : ''} ${activeConvId === c.id ? 'active' : ''}" onclick="openConversation(${c.id})">
      <div class="msg-avatar">${c.traveler.name[0]}</div>
      <div class="msg-preview">
        <div class="msg-sender">${c.traveler.name}</div>
        <div class="msg-snippet">${snippet}</div>
        <div class="msg-time">Today • ${c.latestTrip.destination}</div>
      </div>
    </div>`;
  }).join('');
}

function openConversation(tid) {
  activeConvId = tid;
  const conversations = getConversations();
  const conv = conversations.find(c => c.id === tid);
  if (!conv) return;
  conv.unread = false;
  renderConversationList();

  const tripCount = _myTrips.filter(t => t.traveler_id === tid).length;

  const detail = document.getElementById('msg-detail');
  detail.innerHTML = `
    <div class="msg-detail-header">
      <div class="msg-avatar">${conv.traveler.name[0]}</div>
      <div class="msg-meta">
        <h3>${conv.traveler.name}</h3>
        <p>Traveler ID: ${conv.traveler.traveler_id} • ${tripCount} trip${tripCount > 1 ? 's' : ''} assigned • ${conv.traveler.email}</p>
      </div>
      <div>
        ${statusBadge(conv.latestTrip.status)}
      </div>
    </div>
    <div class="msg-body" id="chat-body-${tid}">
      ${(conv.latestTrip.status === 'Pending' || conv.latestTrip.status === 'Planning') ? renderRequestCard(conv.latestTrip, conv) : ''}
      ${conv.messages.map(m => renderMessage(m)).join('')}
    </div>
    <div class="msg-input-bar">
      <input type="text" id="reply-input-${tid}" placeholder="Type a message to ${conv.traveler.name.split(' ')[0]}..." onkeydown="if(event.key==='Enter') sendReply(${tid})">
      <button onclick="sendReply(${tid})">Send ➤</button>
    </div>
  `;

  const body = document.getElementById('chat-body-' + tid);
  if (body) body.scrollTop = body.scrollHeight;
}

function renderRequestCard(t, conv) {
  const emojis = {'Paris':'🗼','Tokyo':'🗾','Swiss':'🏔','New York':'🗽','Bali':'🏝','Dubai':'🏗','Goa':'🏖','Kerala':'🛶','Rajasthan':'🏰','Singapore':'🦁'};
  let emoji = '💼';
  for (const k in emojis) { if (t.destination && t.destination.includes(k)) { emoji = emojis[k]; break; } }

  return `
    <div class="trip-request-card">
      <div class="req-badge">⏳ Action Required</div>
      <div class="req-title">${emoji} ${t.destination}</div>
      <div class="req-row"><span>Traveler</span><strong>${conv.traveler.name}</strong></div>
      <div class="req-row"><span>Dates</span><strong>${formatDate(t.start_date)} → ${formatDate(t.end_date)}</strong></div>
      <div class="req-row"><span>Budget</span><strong>${formatCurrency(t.budget)}</strong></div>
      <div class="req-actions">
        <button class="btn-accept" onclick="acceptRequest(${t.trip_id})">✓ Accept Trip</button>
        <button class="btn-decline" onclick="declineRequest(${t.trip_id})">✕ Decline</button>
      </div>
    </div>`;
}

function renderMessage(m) {
  const cls = m.from === 'guide' ? 'outgoing' : 'incoming';
  return `
    <div class="msg-bubble ${cls}">
      ${m.text}
      <div class="bubble-time">🕐 ${m.time}</div>
    </div>`;
}

async function sendReply(tid) {
  const input = document.getElementById('reply-input-' + tid);
  const text = input.value.trim();
  if (!text) return;

  try {
    await apiPost('/messages', {
      sender: 'guide', senderId: guideId,
      receiver: 'traveler', receiverId: tid,
      content: text
    });
    input.value = '';
    showToast('Reply sent ✓');
    await loadData();
  } catch (e) { console.error('Failed to send reply:', e); }
}

async function acceptRequest(tripId) {
  try {
    await apiPatch(`/trips/${tripId}/status`, { status: 'Confirmed' });
    const trip = _myTrips.find(t => t.trip_id === tripId);
    if (trip) {
      await apiPost('/messages', {
        sender: 'guide', senderId: guideId,
        receiver: 'traveler', receiverId: trip.traveler_id,
        content: `I've accepted your trip request for ${trip.destination}! Your trip is now confirmed. I'll start preparing your detailed itinerary. 🎉`
      });
    }
    showToast(`Trip #${tripId} accepted! ✓`);
    await loadData();
  } catch (e) { console.error('Failed to accept trip:', e); }
}

async function declineRequest(tripId) {
  if (!confirm('Decline this trip request?')) return;
  try {
    await apiPatch(`/trips/${tripId}/status`, { status: 'Planning' });
    const trip = _myTrips.find(t => t.trip_id === tripId);
    if (trip) {
      await apiPost('/messages', {
        sender: 'guide', senderId: guideId,
        receiver: 'traveler', receiverId: trip.traveler_id,
        content: `I'm sorry, but I won't be able to guide your trip to ${trip.destination} on those dates. Please feel free to select another guide. 🙏`
      });
    }
    showToast(`Trip #${tripId} declined.`, 'error');
    await loadData();
  } catch (e) { console.error('Failed to decline trip:', e); }
}

// Init logic is now at the top in DOMContentLoaded
