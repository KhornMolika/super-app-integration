import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useNotificationSocket(onNotification: (notification: any) => void) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // socket.io-client automatically handles exponential backoff reconnection
    const socket: Socket = io(API_URL, {
      transports: ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Notification WebSocket connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log(`Notification WebSocket disconnected: ${reason}`);
    });

    socket.on('notification.created', (data) => {
      onNotification(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [onNotification]);

  return { isConnected };
}
