import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useNotificationSocket(
  onNotification: (notification: any) => void,
  userId?: string | null,
) {
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(onNotification);
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | null | undefined>(userId);

  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    userIdRef.current = userId;
    if (userId && socketRef.current?.connected) {
      socketRef.current.emit('join', { userId });
    }
  }, [userId]);

  useEffect(() => {
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isProduction = hostname.includes('fintechcenterfsa.com') || process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD';
      if (!isProduction && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        socketUrl = `${window.location.protocol}//${hostname}:3000`;
      }
    }

    // socket.io-client automatically handles exponential backoff reconnection
    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      auth: userIdRef.current ? { userId: userIdRef.current } : undefined,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (userIdRef.current) {
        socket.emit('join', { userId: userIdRef.current });
      }
      console.log('Notification WebSocket connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log(`Notification WebSocket disconnected: ${reason}`);
    });

    socket.on('notification.created', (data) => {
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, []);

  return { isConnected };
}
