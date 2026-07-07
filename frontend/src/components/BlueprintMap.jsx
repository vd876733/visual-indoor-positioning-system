import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';

export default function BlueprintMap() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [devicePosition, setDevicePosition] = useState(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/blueprint/upload', {
          method: 'POST',
          body: new FormData(),
        });

        if (!response.ok) {
          throw new Error('Failed to load blueprint rooms');
        }

        const data = await response.json();
        setRooms(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Unable to load blueprint');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();

    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/live-tracking', (message) => {
          const payload = JSON.parse(message.body);
          if (payload.deviceName === 'Target_Phone') {
            setDevicePosition({
              x: payload.x,
              y: payload.y,
              roomName: payload.roomName,
            });
          }
        });
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  const containerStyle = {
    width: '100%',
    minHeight: '640px',
    position: 'relative',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    border: '1px solid #cbd5e1',
    borderRadius: '1rem',
    overflow: 'hidden',
  };

  return (
    <div className="w-full rounded-2xl bg-white p-4 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Blueprint Floor Plan</h2>
          <p className="text-sm text-slate-500">Interactive view of detected rooms</p>
        </div>
      </div>

      {loading && <p className="text-slate-500">Loading floor plan...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div style={containerStyle} className="p-4">
          {rooms.length === 0 ? (
            <div className="flex h-full min-h-[400px] items-center justify-center text-slate-500">
              No rooms available yet.
            </div>
          ) : (
            <div className="relative h-[600px] w-full">
              {rooms.map((room, index) => {
                const left = room.x ?? 0;
                const top = room.y ?? 0;
                const width = room.width ?? 120;
                const height = room.height ?? 120;

                return (
                  <div
                    key={room.id ?? index}
                    className="absolute rounded-xl border border-slate-400 bg-slate-100/80 shadow-sm"
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                  >
                    <div className="flex h-full items-center justify-center rounded-xl bg-white/70 px-2 text-center">
                      <span className="text-sm font-semibold text-slate-700">
                        {room.roomName || `Room ${index + 1}`}
                      </span>
                    </div>
                  </div>
                );
              })}

              {devicePosition && (
                <div
                  className="absolute z-10 text-3xl drop-shadow-lg"
                  style={{
                    left: `${devicePosition.x}px`,
                    top: `${devicePosition.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={`Target_Phone: ${devicePosition.roomName}`}
                >
                  🔴
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
