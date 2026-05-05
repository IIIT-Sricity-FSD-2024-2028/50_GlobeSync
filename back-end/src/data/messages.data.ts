/**
 * Messages seed data
 * Source: front-end/JS/mockData.js → DB.messages
 *
 * Relationships:
 *   - senderId   → ID from sender's entity (traveler/guide/support)
 *   - receiverId → ID from receiver's entity (traveler/guide/support)
 */
export interface Message {
  messageId: number;
  sender: 'traveler' | 'guide' | 'support';
  senderId: number;
  receiver: 'traveler' | 'guide' | 'support';
  receiverId: number;
  content: string;
  timestamp: string;
}

export const messages: Message[] = [
  { messageId: 1, sender: 'support', senderId: 1, receiver: 'traveler', receiverId: 1, content: 'Hello Arjun, we are looking into your hotel booking issue.', timestamp: '2026-03-31T10:00:00' },
  { messageId: 2, sender: 'traveler', senderId: 1, receiver: 'support', receiverId: 1, content: 'Thank you Aisha. I appreciate the help.', timestamp: '2026-03-31T10:05:00' },
  { messageId: 3, sender: 'traveler', senderId: 1, receiver: 'guide', receiverId: 1, content: 'Hi Devansh! I\'m excited about the Paris trip. Can you suggest some local restaurants near the hotel?', timestamp: '2026-03-28T09:00:00' },
  { messageId: 4, sender: 'guide', senderId: 1, receiver: 'traveler', receiverId: 1, content: 'Hi Arjun! Absolutely — I recommend Le Petit Bistro and Café de Flore. Both are walking distance from Hotel Lumiere.', timestamp: '2026-03-28T09:15:00' },
  { messageId: 5, sender: 'traveler', senderId: 1, receiver: 'guide', receiverId: 1, content: 'Perfect! Also, is it possible to add a visit to Montmartre on Day 3?', timestamp: '2026-03-28T10:00:00' },
  { messageId: 6, sender: 'guide', senderId: 1, receiver: 'traveler', receiverId: 1, content: 'Yes, I\'ve updated the itinerary. Montmartre is added for Day 3 morning.', timestamp: '2026-03-28T10:20:00' },
  { messageId: 7, sender: 'traveler', senderId: 2, receiver: 'guide', receiverId: 1, content: 'Hello! I have a question about the Swiss Alps trek difficulty. Is it suitable for beginners?', timestamp: '2026-03-29T14:00:00' },
  { messageId: 8, sender: 'guide', senderId: 1, receiver: 'traveler', receiverId: 2, content: 'Hi Kavya! The trails I\'ve selected are moderate — perfect for beginners with basic fitness.', timestamp: '2026-03-29T14:30:00' },
  { messageId: 9, sender: 'traveler', senderId: 1, receiver: 'guide', receiverId: 2, content: 'Hi Mateo! Looking forward to the Tokyo trip. Any must-try street food spots?', timestamp: '2026-03-30T11:00:00' },
  { messageId: 10, sender: 'guide', senderId: 2, receiver: 'traveler', receiverId: 1, content: 'Hey Arjun! You MUST try takoyaki at Dotonbori street and the ramen at Ichiran.', timestamp: '2026-03-30T11:30:00' },
  { messageId: 11, sender: 'traveler', senderId: 3, receiver: 'guide', receiverId: 2, content: 'Hi Mateo, is the New York itinerary finalized? I\'d love to add a Broadway show.', timestamp: '2026-03-31T08:00:00' },
  { messageId: 12, sender: 'guide', senderId: 2, receiver: 'traveler', receiverId: 3, content: 'Hi Rohan! I\'ve reserved tickets for Hamilton on Day 3 evening.', timestamp: '2026-03-31T08:45:00' },
  { messageId: 13, sender: 'traveler', senderId: 4, receiver: 'guide', receiverId: 1, content: 'Hi Devansh! The Goa trip was amazing. Thank you so much for the Dudhsagar Falls recommendation!', timestamp: '2026-02-20T16:00:00' },
  { messageId: 14, sender: 'guide', senderId: 1, receiver: 'traveler', receiverId: 4, content: 'So glad you enjoyed it, Nitin! Goa is always magical. Let me know when you\'re planning your next adventure!', timestamp: '2026-02-20T16:30:00' },
  { messageId: 15, sender: 'traveler', senderId: 4, receiver: 'guide', receiverId: 2, content: 'Hi Mateo! For the Dubai trip, can we add a dinner at the Burj Al Arab?', timestamp: '2026-03-18T09:00:00' },
  { messageId: 16, sender: 'guide', senderId: 2, receiver: 'traveler', receiverId: 4, content: 'Great choice Nitin! I\'ll book the Al Muntaha restaurant — 27th floor with stunning views.', timestamp: '2026-03-18T09:45:00' },
  { messageId: 17, sender: 'traveler', senderId: 1, receiver: 'guide', receiverId: 1, content: 'The Rome trip was breathtaking! Thank you for the incredible historical tour.', timestamp: '2025-12-15T10:00:00' },
  { messageId: 18, sender: 'guide', senderId: 1, receiver: 'traveler', receiverId: 1, content: 'You\'re very welcome, Arjun! Rome has so many stories to tell.', timestamp: '2025-12-15T11:00:00' },
  { messageId: 19, sender: 'traveler', senderId: 2, receiver: 'guide', receiverId: 1, content: 'Sydney was amazing! The opera house tour was a highlight. Cheers, Devansh!', timestamp: '2026-01-25T14:30:00' },
  { messageId: 20, sender: 'guide', senderId: 1, receiver: 'traveler', receiverId: 2, content: 'So glad you liked Sydney, Kavya! Australia\'s charm is hard to beat.', timestamp: '2026-01-25T15:00:00' },
  { messageId: 21, sender: 'traveler', senderId: 3, receiver: 'guide', receiverId: 1, content: 'Cape Town was fantastic! The Table Mountain hike was tough but worth it.', timestamp: '2025-11-25T09:00:00' },
  { messageId: 22, sender: 'guide', senderId: 1, receiver: 'traveler', receiverId: 3, content: 'Powerful sights in Cape Town, Rohan! Glad you enjoyed the hike.', timestamp: '2025-11-25T10:00:00' },
  { messageId: 23, sender: 'traveler', senderId: 1, receiver: 'guide', receiverId: 2, content: 'Kyoto was magical. The bamboo forest was so peaceful. Thanks, Mateo!', timestamp: '2025-04-15T12:00:00' },
  { messageId: 24, sender: 'guide', senderId: 2, receiver: 'traveler', receiverId: 1, content: 'Traditional Kyoto is always a soul-stirring experience, Arjun.', timestamp: '2025-04-15T13:00:00' },
  { messageId: 25, sender: 'traveler', senderId: 4, receiver: 'guide', receiverId: 2, content: 'Iceland was out of this world! The northern lights were better than I imagined.', timestamp: '2025-01-20T22:00:00' },
  { messageId: 26, sender: 'guide', senderId: 2, receiver: 'traveler', receiverId: 4, content: 'Indeed, Nitin! We were lucky with the clear skies. Nature\'s light show at its best!', timestamp: '2025-01-21T09:00:00' },
];
