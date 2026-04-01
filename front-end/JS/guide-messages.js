// Guide Messages — Trip Requests & Chat
if (!Auth.isLoggedIn() || Auth.getRole() !== 'guide') window.location.href = '../login.html?role=guide';
const user = Auth.getUser();

// Build conversations from mock data — travelers assigned to this guide
const guideId = user.guide_id;
const assignedTrips = DB.trips.filter(t => t.guide_id === guideId);
const travelerIds = [...new Set(assignedTrips.map(t => t.traveler_id))];

const conversations = travelerIds.map((tid, idx) => {
  const traveler = DB.travelers.find(t => t.traveler_id === tid);
  const trips = assignedTrips.filter(t => t.traveler_id === tid);
  const latestTrip = trips[trips.length - 1];
  const emojis = {'Paris':'🗼','Tokyo':'🗾','Swiss':'🏔','New York':'🗽','Bali':'🏝','Dubai':'🏗','Goa':'🏖','Kerala':'🛶','Rajasthan':'🏰','Singapore':'🦁'};
  let emoji = '✈';
  for (const k in emojis) { if (latestTrip.destination.includes(k)) { emoji = emojis[k]; break; } }

  // Generate realistic messages per traveler
  const messages = [];

  // First: traveler sends a trip request
  messages.push({
    from: 'traveler',
    type: 'request',
    tripData: latestTrip,
    emoji: emoji,
    time: '2 days ago'
  });

  // Follow-up messages
  if (latestTrip.status === 'Confirmed') {
    messages.push({ from: 'guide', type: 'text', text: `Hi ${traveler.name.split(' ')[0]}! I've reviewed your ${latestTrip.destination} trip request. Everything looks great — I've accepted and confirmed the itinerary.`, time: '2 days ago' });
    messages.push({ from: 'traveler', type: 'text', text: `Thank you so much! Can you recommend some local restaurants near the hotel?`, time: '1 day ago' });
    messages.push({ from: 'guide', type: 'text', text: `Absolutely! I'll send you a curated list of top-rated restaurants within walking distance. Also, I recommend visiting the local market in the morning — it's a hidden gem! 🌟`, time: '1 day ago' });
    messages.push({ from: 'traveler', type: 'text', text: `That sounds amazing! Looking forward to the trip. 🙏`, time: '5 hours ago' });
  } else if (latestTrip.status === 'Pending') {
    messages.push({ from: 'guide', type: 'text', text: `Hi ${traveler.name.split(' ')[0]}! I received your trip request for ${latestTrip.destination}. Let me review the details and get back to you shortly.`, time: '1 day ago' });
    messages.push({ from: 'traveler', type: 'text', text: `Sure, take your time! Also, is it possible to add a day trip to a nearby attraction?`, time: '12 hours ago' });
    messages.push({ from: 'guide', type: 'text', text: `Yes, I can absolutely arrange that! I'll include it in the updated itinerary. What's your preferred activity — nature/adventure or cultural/historical?`, time: '10 hours ago' });
  } else if (latestTrip.status === 'Completed') {
    messages.push({ from: 'guide', type: 'text', text: `Welcome back, ${traveler.name.split(' ')[0]}! Hope you had a wonderful time in ${latestTrip.destination}. 🎉`, time: '2 weeks ago' });
    messages.push({ from: 'traveler', type: 'text', text: `It was incredible! The itinerary was perfect. Thank you for all the help! ⭐⭐⭐⭐⭐`, time: '2 weeks ago' });
    messages.push({ from: 'guide', type: 'text', text: `So glad to hear that! Feel free to reach out anytime for your next adventure. Safe travels! ✈️`, time: '2 weeks ago' });
  } else {
    messages.push({ from: 'guide', type: 'text', text: `Hi ${traveler.name.split(' ')[0]}! I see you're planning a trip to ${latestTrip.destination}. Let me know when you're ready and I'll help you build the perfect itinerary!`, time: '3 hours ago' });
  }

  return {
    id: tid,
    traveler: traveler,
    trips: trips,
    latestTrip: latestTrip,
    emoji: emoji,
    messages: messages,
    unread: latestTrip.status === 'Pending' || latestTrip.status === 'Planning'
  };
});

let activeConvId = null;

function renderConversationList() {
  const unreadCount = conversations.filter(c => c.unread).length;
  document.getElementById('unread-badge').textContent = unreadCount;

  document.getElementById('msg-list').innerHTML = conversations.map(c => {
    const lastMsg = c.messages[c.messages.length - 1];
    const snippet = lastMsg.type === 'request'
      ? `📩 New trip request — ${c.latestTrip.destination}`
      : lastMsg.text.substring(0, 45) + '...';
    return `
    <div class="msg-item ${c.unread ? 'unread' : ''} ${activeConvId === c.id ? 'active' : ''}" onclick="openConversation(${c.id})">
      <div class="msg-avatar">${c.traveler.name[0]}</div>
      <div class="msg-preview">
        <div class="msg-sender">${c.traveler.name}</div>
        <div class="msg-snippet">${snippet}</div>
        <div class="msg-time">${lastMsg.time} • ${c.latestTrip.destination}</div>
      </div>
    </div>`;
  }).join('');
}

function openConversation(tid) {
  activeConvId = tid;
  const conv = conversations.find(c => c.id === tid);
  conv.unread = false;
  renderConversationList();

  const detail = document.getElementById('msg-detail');
  const tripCount = conv.trips.length;

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
      ${conv.messages.map(m => renderMessage(m, conv)).join('')}
    </div>
    <div class="msg-input-bar">
      <input type="text" id="reply-input-${tid}" placeholder="Type a message to ${conv.traveler.name.split(' ')[0]}..." onkeydown="if(event.key==='Enter') sendReply(${tid})">
      <button onclick="sendReply(${tid})">Send ➤</button>
    </div>
  `;

  // Scroll to bottom
  setTimeout(() => {
    const body = document.getElementById('chat-body-' + tid);
    if (body) body.scrollTop = body.scrollHeight;
  }, 50);
}

function renderMessage(m, conv) {
  if (m.type === 'request') {
    const t = m.tripData;
    const guide = DB.travelGuides.find(g => g.guide_id === guideId);
    return `
    <div class="msg-bubble incoming" style="max-width:85%">
      <div style="font-weight:600;margin-bottom:8px">📩 Trip Assistance Request</div>
      <div class="trip-request-card">
        <div class="req-badge">⏳ Guide Request</div>
        <div class="req-title">${m.emoji} ${t.destination}</div>
        <div class="req-row"><span>Traveler ID</span><strong>#${conv.traveler.traveler_id} — ${conv.traveler.name}</strong></div>
        <div class="req-row"><span>Trip ID</span><strong>#${t.trip_id}</strong></div>
        <div class="req-row"><span>Dates</span><strong>${formatDate(t.start_date)} → ${formatDate(t.end_date)}</strong></div>
        <div class="req-row"><span>Budget</span><strong>${formatCurrency(t.budget)}</strong></div>
        <div class="req-row"><span>Status</span><strong>${t.status}</strong></div>
        <div class="req-row"><span>Package</span><strong>${t.package_id ? DB.packageTrips.find(p => p.package_id === t.package_id)?.name || 'Custom' : 'Custom Trip'}</strong></div>
        <div class="req-row"><span>Assigned Guide</span><strong>${guide ? guide.name : 'You'}</strong></div>
        ${t.status === 'Pending' || t.status === 'Planning' ? `
        <div class="req-actions">
          <button class="btn-accept" onclick="acceptRequest(${t.trip_id})">✓ Accept Request</button>
          <button class="btn-decline" onclick="declineRequest(${t.trip_id})">✕ Decline</button>
        </div>` : `
        <div style="margin-top:10px;font-size:12px;color:#059669;font-weight:600">✓ Request ${t.status === 'Completed' ? 'Completed' : 'Accepted'}</div>`}
      </div>
      <div class="bubble-time">🕐 ${m.time}</div>
    </div>`;
  }

  const cls = m.from === 'guide' ? 'outgoing' : 'incoming';
  return `
    <div class="msg-bubble ${cls}">
      ${m.text}
      <div class="bubble-time">🕐 ${m.time}</div>
    </div>`;
}

function sendReply(tid) {
  const input = document.getElementById('reply-input-' + tid);
  const text = input.value.trim();
  if (!text) return;

  const conv = conversations.find(c => c.id === tid);
  conv.messages.push({ from: 'guide', type: 'text', text: text, time: 'Just now' });
  input.value = '';
  openConversation(tid);
  showToast('Message sent ✓');
}

function acceptRequest(tripId) {
  const trip = DB.trips.find(t => t.trip_id === tripId);
  if (trip) {
    trip.status = 'Confirmed';
    const conv = conversations.find(c => c.latestTrip.trip_id === tripId);
    if (conv) {
      conv.messages.push({ from: 'guide', type: 'text', text: `I've accepted your trip request for ${trip.destination}! Your trip is now confirmed. I'll start preparing your detailed itinerary. 🎉`, time: 'Just now' });
    }
    openConversation(conv ? conv.id : activeConvId);
    showToast(`Trip #${tripId} to ${trip.destination} accepted! ✓`);
  }
}

function declineRequest(tripId) {
  if (!confirm('Are you sure you want to decline this trip request?')) return;
  const trip = DB.trips.find(t => t.trip_id === tripId);
  if (trip) {
    trip.status = 'Cancelled';
    const conv = conversations.find(c => c.latestTrip.trip_id === tripId);
    if (conv) {
      conv.messages.push({ from: 'guide', type: 'text', text: `I'm sorry, I'm unable to take on the ${trip.destination} trip at this time. I recommend requesting another available guide. Apologies for the inconvenience.`, time: 'Just now' });
    }
    openConversation(conv ? conv.id : activeConvId);
    showToast(`Trip #${tripId} declined`, 'error');
  }
}

// Init
renderConversationList();

// Auto-open first conversation if any exist
if (conversations.length > 0) {
  openConversation(conversations[0].id);
}
