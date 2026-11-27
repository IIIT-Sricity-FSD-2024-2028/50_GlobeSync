import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSession } from './SessionContext';
import { API_BASE_URL, getAccessToken, notificationsApi } from '../services/api';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const { user, role } = useSession();
  const socketRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Timestamp cursor for reconnect synchronization
  const lastSyncTimestampRef = useRef(new Date().toISOString());

  // Listeners registry for event subscribers: Map<eventName, Set<callback>>
  const listenersRef = useRef(new Map());

  // Fetch notifications helper (supports 'since' cursor)
  const fetchNotifications = useCallback(async (sinceCursor = null) => {
    const token = getAccessToken();
    if (!token || !user) return;

    try {
      const res = await notificationsApi.getAll(sinceCursor ? { since: sinceCursor } : {});
      if (res) {
        const fetchedList = res.notifications || [];
        setUnreadCount(res.unreadCount || 0);

        if (sinceCursor) {
          // Merge newly arrived missed notifications
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newOnes = fetchedList.filter((n) => !existingIds.has(n.id));
            return [...newOnes, ...prev];
          });
        } else {
          setNotifications(fetchedList);
        }

        lastSyncTimestampRef.current = new Date().toISOString();
      }
    } catch {
      // Quiet fail if backend is restarting
    }
  }, [user]);

  // Connect socket when user is logged in
  useEffect(() => {
    const token = getAccessToken();
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Determine WebSocket base URL
    const wsUrl = API_BASE_URL.replace(/\/api\/?$/, '');

    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setReconnecting(false);

      // On initial connect or reconnect, refetch any missed notifications
      fetchNotifications(lastSyncTimestampRef.current);
    });

    socket.on('reconnect_attempt', () => {
      setReconnecting(true);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Disconnected by server (token invalid)
        socket.connect();
      }
    });

    // Handle incoming notifications
    socket.on('notification.created', (data) => {
      if (data?.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
        setUnreadCount((prev) => (data.unreadCount !== undefined ? data.unreadCount : prev + 1));
        lastSyncTimestampRef.current = new Date().toISOString();
      }
    });

    // Generic event router to dispatch to component listeners
    const ALL_DOMAIN_EVENTS = [
      'guide_request.created',
      'guide_request.accepted',
      'guide_request.declined',
      'booking.status_changed',
      'message.created',
      'message.read_receipt',
      'chat.typing',
      'ticket.updated',
      'refund.processed',
      'agency.approved',
      'agency.rejected',
      'notification.created',
    ];

    ALL_DOMAIN_EVENTS.forEach((evtName) => {
      socket.on(evtName, (payload) => {
        lastSyncTimestampRef.current = new Date().toISOString();
        const set = listenersRef.current.get(evtName);
        if (set) {
          set.forEach((cb) => {
            try {
              cb(payload);
            } catch (err) {
              console.error(`Error in realtime handler for ${evtName}:`, err);
            }
          });
        }
      });
    });

    // Initial full fetch of notifications
    fetchNotifications();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, role, fetchNotifications]);

  // Subscribe to specific realtime events
  const on = useCallback((eventName, callback) => {
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set());
    }
    listenersRef.current.get(eventName).add(callback);

    return () => {
      const set = listenersRef.current.get(eventName);
      if (set) set.delete(callback);
    };
  }, []);

  // Join/leave booking room
  const joinBooking = useCallback((bookingId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_booking', { bookingId });
    }
  }, [isConnected]);

  const leaveBooking = useCallback((bookingId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_booking', { bookingId });
    }
  }, [isConnected]);

  // Join/leave ticket room
  const joinTicket = useCallback((ticketId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_ticket', { ticketId });
    }
  }, [isConnected]);

  const leaveTicket = useCallback((ticketId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_ticket', { ticketId });
    }
  }, [isConnected]);

  // Send typing indicator
  const sendTyping = useCallback((data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('chat.typing', data);
    }
  }, [isConnected]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      const res = await notificationsApi.markAsRead(id);
      if (res) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        );
        setUnreadCount(res.unreadCount ?? Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [unreadCount]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  const value = {
    isConnected,
    reconnecting,
    notifications,
    unreadCount,
    on,
    joinBooking,
    leaveBooking,
    joinTicket,
    leaveTicket,
    sendTyping,
    markAsRead,
    markAllAsRead,
    refetchNotifications: fetchNotifications,
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

/**
 * Convenient hook for components to subscribe to a realtime event
 * with automatic cleanup on unmount.
 */
export function useRealtimeEvent(eventName, callback) {
  const { on } = useRealtime();

  useEffect(() => {
    if (!eventName || !callback) return;
    return on(eventName, callback);
  }, [eventName, callback, on]);
}
