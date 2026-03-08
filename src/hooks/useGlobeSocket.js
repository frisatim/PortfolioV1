import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const UUID_KEY = 'visitor_uuid';

function getOrCreateUUID() {
  let uuid = localStorage.getItem(UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, uuid);
  }
  return uuid;
}

export default function useGlobeSocket() {
  const [markersMap, setMarkersMap] = useState({});
  const [markerCount, setMarkerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const userUUID = useRef(getOrCreateUUID()).current;

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socket.on('initial_data', ({ markers, count }) => {
      const map = {};
      markers.forEach((m) => { map[m.uuid] = m; });
      setMarkersMap(map);
      setMarkerCount(count);
    });

    socket.on('marker_added', (marker) => {
      setMarkersMap((prev) => ({ ...prev, [marker.uuid]: marker }));
    });

    socket.on('marker_updated', (marker) => {
      setMarkersMap((prev) => ({ ...prev, [marker.uuid]: marker }));
    });

    socket.on('marker_removed', ({ uuid }) => {
      setMarkersMap((prev) => {
        const next = { ...prev };
        delete next[uuid];
        return next;
      });
    });

    socket.on('count_updated', ({ count }) => {
      setMarkerCount(count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const placeMarker = useCallback((lat, lng) => {
    // Optimistic update — marker appears immediately even if backend is down
    const now = new Date().toISOString();
    setMarkersMap((prev) => ({
      ...prev,
      [userUUID]: { uuid: userUUID, lat, lng, createdAt: now, updatedAt: now },
    }));
    socketRef.current?.emit('add_marker', { uuid: userUUID, lat, lng });
  }, [userUUID]);

  const removeMarker = useCallback(() => {
    setMarkersMap((prev) => {
      const next = { ...prev };
      delete next[userUUID];
      return next;
    });
    socketRef.current?.emit('remove_marker', { uuid: userUUID });
  }, [userUUID]);

  const markersArray = Object.values(markersMap);

  return {
    markersArray,
    markerCount,
    isConnected,
    placeMarker,
    removeMarker,
    userUUID,
  };
}
