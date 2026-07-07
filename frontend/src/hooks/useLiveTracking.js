import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';

export function useLiveTracking() {
  const [position, setPosition] = useState(null);
  const [alert, setAlert] = useState(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    const defaultHttpBase =
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
    const apiBaseUrl = (import.meta.env.VITE_API_URL || defaultHttpBase).replace(/\/$/, '');
    const wsBaseUrl =
      import.meta.env.VITE_WS_URL ||
      apiBaseUrl.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
    const brokerURL = wsBaseUrl.endsWith('/ws') ? wsBaseUrl : `${wsBaseUrl}/ws`;

    const client = new Client({
      brokerURL,
      reconnectDelay: 3000,
      onConnect: () => {
        setStatus('connected');
        client.subscribe('/topic/live-tracking', (message) => {
          const payload = JSON.parse(message.body);
          setPosition({
            x: payload.x,
            y: payload.y,
            currentRoom: payload.currentRoom,
            isAuthorized: payload.isAuthorized,
            macAddress: payload.macAddress,
          });
        });

        client.subscribe('/topic/alerts', (message) => {
          const payload = JSON.parse(message.body);
          setAlert(payload);
        });
      },
      onDisconnect: () => setStatus('disconnected'),
      onStompError: () => setStatus('error'),
    });

    client.activate();

    return () => client.deactivate();
  }, []);

  return { position, alert, status };
}
