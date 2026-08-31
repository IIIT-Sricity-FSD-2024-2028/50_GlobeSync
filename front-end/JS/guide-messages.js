let activeConvId = null;
let _myTrips = [], _allTravelers = [], _allAgencies = [], _allMessages = [];
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
    [_myTrips, _allTravelers, _allAgencies, _allMessages] = await Promise.all([
      apiGetSnake(`/trips/guide/${guideId}`),
      apiGetSnake('/travelers'),
      apiGetSnake('/agencies/lookup').catch(() => []),
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

  // Include assigned trips
  _myTrips.forEach(t => {
    const pType = t.agency_id ? 'agency' : 'traveler';
    const pId = t.agency_id || t.traveler_id;
    const convKey = `${pType}_${pId}`;
    
    if (!convs[convKey]) {
      const partner = pType === 'agency' ? _allAgencies.find(a => a.agency_id === pId) : _allTravelers.find(tr => tr.traveler_id === pId);
      const name = partner ? (pType === 'agency' ? partner.business_name : partner.name) : (pType === 'agency' ? 'Agency #' + pId : 'Traveler #' + pId);
      
      convs[convKey] = {
        id: convKey,
        userType: pType,
        userId: pId,
        partnerName: name,
        partnerEmail: partner ? partner.email : 'Unknown Email',
        latestTrip: t,
        messages: [],
        unread: t.status === 'Pending' || t.status === 'Planning'
      };
    } else {
      if (t.status === 'Pending' || t.status === 'Planning') {
        convs[convKey].latestTrip = t;
        convs[convKey].unread = true;
      } else if (t.trip_id > convs[convKey].latestTrip.trip_id && convs[convKey].latestTrip.status !== 'Pending' && convs[convKey].latestTrip.status !== 'Planning') {
        convs[convKey].latestTrip = t;
      }
    }
  });

  // Add messages
  _allMessages.forEach(m => {
    const isMeSender = (m.sender === 'guide' && m.sender_id == guideId);
    const otherType = isMeSender ? m.receiver : m.sender;
    const otherId = isMeSender ? m.receiver_id : m.sender_id;
    const convKey = `${otherType}_${otherId}`;
    
    if (!convs[convKey]) {
      const partner = otherType === 'agency' ? _allAgencies.find(a => a.agency_id === otherId) : _allTravelers.find(tr => tr.traveler_id === otherId);
      const latestTrip = _myTrips.find(t => (otherType === 'agency' ? t.agency_id === otherId : t.traveler_id === otherId)) || { status: 'None', destination: 'N/A' };
      
      convs[convKey] = {
        id: convKey,
        userType: otherType,
        userId: otherId,
        partnerName: partner ? partner.name : (otherType === 'agency' ? 'Agency ' + otherId : 'Traveler ' + otherId),
        partnerEmail: partner ? partner.email : 'Unknown Email',
        latestTrip: latestTrip,
        messages: [],
        unread: false
      };
    }
    
    convs[convKey].messages.push({
      from: isMeSender ? 'guide' : otherType,
      type: 'text',
      text: m.content,
      time: formatMsgTime(m.timestamp)
    });
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
    <div class="msg-item ${c.unread ? 'unread' : ''} ${activeConvId === c.id ? 'active' : ''}" onclick="openConversation('${c.id}')">
      <div class="msg-avatar">${c.partnerName[0]}</div>
      <div class="msg-preview">
        <div class="msg-sender">${c.partnerName}</div>
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

  const tripCount = _myTrips.filter(t => (conv.userType === 'agency' ? t.agency_id === conv.userId : t.traveler_id === conv.userId)).length;

  const detail = document.getElementById('msg-detail');
  detail.innerHTML = `
    <div class="msg-detail-header">
      <div class="msg-avatar">${conv.partnerName[0]}</div>
      <div class="msg-meta">
        <h3>${conv.partnerName}</h3>
        <p>${conv.userType === 'agency' ? 'Agency' : 'Traveler'} ID: ${conv.userId} • ${tripCount} trip${tripCount > 1 ? 's' : ''} assigned • ${conv.partnerEmail}</p>
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
      <input type="text" id="reply-input-${tid}" placeholder="Type a message to ${conv.partnerName.split(' ')[0]}..." onkeydown="if(event.key==='Enter') sendReply('${tid}')">
      <button onclick="sendReply('${tid}')">Send ➤</button>
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
      <div class="req-row"><span>${conv.userType === 'agency' ? 'Agency' : 'Traveler'}</span><strong>${conv.partnerName}</strong></div>
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
  const conv = getConversations().find(c => c.id === tid);
  if (!conv) return;
  const input = document.getElementById('reply-input-' + tid);
  const text = input.value.trim();
  if (!text) return;

  try {
    await apiPost('/messages', {
      sender: 'guide', senderId: guideId,
      receiver: conv.userType, receiverId: conv.userId,
      content: text
    });
    input.value = '';
    showToast('Reply sent ✓');
    await loadData();
  } catch (e) { console.error('Failed to send reply:', e); }
}

async function acceptRequest(tripId) {
  try {
    await apiPatchSnake(`/trips/${tripId}/status`, { status: 'Confirmed' });
    const trip = _myTrips.find(t => t.trip_id === tripId);
    if (trip) {
      await apiPost('/messages', {
        sender: 'guide', senderId: guideId,
        receiver: trip.agency_id ? 'agency' : 'traveler', receiverId: trip.agency_id || trip.traveler_id,
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
    const trip = _myTrips.find(t => t.trip_id === tripId);
    if (!trip) return;

    const tripDataForUpdate = {
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      budget: trip.budget,
      traveler_id: trip.traveler_id,
      agency_id: trip.agency_id || null,
      guide_id: null,
      package_id: trip.package_id || null,
      status: 'Planning'
    };
    await apiPutSnake(`/trips/${tripId}`, tripDataForUpdate);
    
    if (trip) {
      await apiPost('/messages', {
        sender: 'guide', senderId: guideId,
        receiver: trip.agency_id ? 'agency' : 'traveler', receiverId: trip.agency_id || trip.traveler_id,
        content: `I'm sorry, but I won't be able to guide your trip to ${trip.destination} on those dates. Please feel free to select another guide. 🙏`
      });
    }
    showToast(`Trip #${tripId} declined.`, 'error');
    await loadData();
  } catch (e) { console.error('Failed to decline trip:', e); }
}

// Init logic is now at the top in DOMContentLoaded
