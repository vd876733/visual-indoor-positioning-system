import { useEffect, useMemo, useState } from 'react';
import { useLiveTracking } from '../hooks/useLiveTracking';

const initialRooms = [
  { id: 1, name: 'Living Room', x1: 20, y1: 20, x2: 220, y2: 180 },
  { id: 2, name: 'Kitchen', x1: 260, y1: 30, x2: 430, y2: 190 },
  { id: 3, name: 'Bedroom', x1: 470, y1: 40, x2: 660, y2: 220 },
];

const initialDevices = [
  { id: 1, macAddress: 'AA:BB:CC:DD:EE:FF', deviceName: 'Target_Phone', room: 'Living Room', authorized: true },
  { id: 2, macAddress: '11:22:33:44:55:66', deviceName: 'Unk Device', room: 'Kitchen', authorized: false },
];

export default function DashboardPanel() {
  const [isUploading, setIsUploading] = useState(false);
  const [rooms, setRooms] = useState(initialRooms);
  const [devices, setDevices] = useState(initialDevices);
  const [dragActive, setDragActive] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [animatedPosition, setAnimatedPosition] = useState(null);
  const [auditMode, setAuditMode] = useState(false);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState(initialDevices[0]?.macAddress ?? '');
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { position, alert, status } = useLiveTracking();

  const defaultHttpBase = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';
  const apiBaseUrl = (import.meta.env.VITE_API_URL || defaultHttpBase).replace(/\/$/, '');
  const svgWidth = 720;
  const svgHeight = 320;

  const roomRects = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        width: room.x2 - room.x1,
        height: room.y2 - room.y1,
      })),
    [rooms]
  );

  useEffect(() => {
    if (!auditMode || !selectedDeviceMac) {
      setHistoryEntries([]);
      return;
    }

    const controller = new AbortController();
    setHistoryLoading(true);

    fetch(`${apiBaseUrl}/api/analytics/history/${encodeURIComponent(selectedDeviceMac)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load history');
        }
        return response.json();
      })
      .then((data) => setHistoryEntries(Array.isArray(data) ? data : []))
      .catch(() => setHistoryEntries([]))
      .finally(() => setHistoryLoading(false));

    return () => controller.abort();
  }, [apiBaseUrl, auditMode, selectedDeviceMac]);

  useEffect(() => {
    if (!position) {
      return;
    }

    const startPosition = animatedPosition ?? position;
    const startX = startPosition.x;
    const startY = startPosition.y;
    const targetX = position.x;
    const targetY = position.y;
    const duration = 500;
    const startTime = performance.now();

    let frameId;
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedPosition({
        x: startX + (targetX - startX) * easedProgress,
        y: startY + (targetY - startY) * easedProgress,
      });

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [position]);

  const heatmapRooms = useMemo(() => {
    if (!auditMode || !historyEntries.length) {
      return [];
    }

    const durationsByRoom = historyEntries.reduce((accumulator, entry) => {
      const startTime = new Date(entry.entryTimestamp).getTime();
      const endTime = entry.exitTimestamp ? new Date(entry.exitTimestamp).getTime() : Date.now();
      const durationSeconds = Math.max(15, Math.round((endTime - startTime) / 1000));

      accumulator[entry.roomName] = (accumulator[entry.roomName] || 0) + durationSeconds;
      return accumulator;
    }, {});

    const maxDuration = Math.max(...Object.values(durationsByRoom), 1);

    return rooms
      .map((room) => ({
        ...room,
        durationSeconds: durationsByRoom[room.name] || 0,
        weight: (durationsByRoom[room.name] || 0) / maxDuration,
      }))
      .filter((room) => room.durationSeconds > 0);
  }, [auditMode, historyEntries, rooms]);

  const handleFiles = (files) => {
    if (!files?.length) return;
    setIsUploading(true);

    window.setTimeout(() => {
      setIsUploading(false);
      setRooms(initialRooms);
      setDevices(initialDevices);
    }, 1800);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <section className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-black/30">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Blueprint Generator</h2>
              <p className="text-sm text-slate-400">Upload flat photos and generate a 2D room layout.</p>
            </div>
          </div>

          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
              dragActive ? 'border-cyan-400 bg-slate-800' : 'border-slate-700 bg-slate-950/70'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />

            {isUploading ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
                <p className="text-sm font-medium text-cyan-300">Analyzing layout via AI...</p>
              </div>
            ) : (
              <>
                <div className="mb-3 rounded-full bg-cyan-500/10 p-3 text-cyan-300">📷</div>
                <p className="text-base font-medium">Drop flat layout photos here</p>
                <p className="mt-1 text-sm text-slate-400">PNG, JPG, and HEIC supported</p>
              </>
            )}
          </label>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-[320px] w-full">
              <rect x="0" y="0" width={svgWidth} height={svgHeight} rx="18" fill="#0f172a" />
              {roomRects.map((room) => {
                const connectedDevices = devices.filter((device) => device.room === room.name).length;

                return (
                  <g key={room.id}>
                    <rect
                      x={room.x1}
                      y={room.y1}
                      width={room.width}
                      height={room.height}
                      rx="12"
                      fill="#1e293b"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredRoom({ name: room.name, count: connectedDevices })}
                      onMouseLeave={() => setHoveredRoom(null)}
                    />
                    <text x={room.x1 + 12} y={room.y1 + 28} fill="#e2e8f0" fontSize="16" fontWeight="600">
                      {room.name}
                    </text>
                    {hoveredRoom?.name === room.name && (
                      <g>
                        <rect x={room.x1 + 8} y={room.y1 + 38} width="140" height="42" rx="8" fill="#0f172a" stroke="#38bdf8" />
                        <text x={room.x1 + 18} y={room.y1 + 58} fill="#f8fafc" fontSize="12" fontWeight="600">
                          {room.name}
                        </text>
                        <text x={room.x1 + 18} y={room.y1 + 74} fill="#38bdf8" fontSize="11">
                          {connectedDevices} device{connectedDevices === 1 ? '' : 's'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {auditMode && heatmapRooms.length > 0 &&
                heatmapRooms.map((room) => {
                  const centerX = (room.x1 + room.x2) / 2;
                  const centerY = (room.y1 + room.y2) / 2;
                  const radius = 18 + room.weight * 24;
                  const opacity = 0.16 + room.weight * 0.55;

                  return (
                    <g key={room.id}>
                      <circle cx={centerX} cy={centerY} r={radius} fill="#38bdf8" opacity={opacity} />
                      <circle cx={centerX} cy={centerY} r={10 + room.weight * 6} fill="#0ea5e9" opacity={0.9} />
                    </g>
                  );
                })}
              }

              {!auditMode && animatedPosition && (
                <g>
                  <circle
                    cx={animatedPosition.x}
                    cy={animatedPosition.y}
                    r="16"
                    fill="rgba(248, 113, 113, 0.25)"
                    className="transition-all duration-500"
                  />
                  <circle
                    cx={animatedPosition.x}
                    cy={animatedPosition.y}
                    r="8"
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth="2"
                    className="transition-all duration-500"
                  />
                  <text x={animatedPosition.x + 14} y={animatedPosition.y - 14} fill="#fef2f2" fontSize="12" fontWeight="600">
                    Target
                  </text>
                </g>
              )}
            </svg>
          </div>
        </section>

        <aside className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-black/30 lg:w-[420px]">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Live Status</h2>
            <p className="text-sm text-slate-400">Tracking devices and access safety in real time.</p>
          </div>

          {alert && (
            <div className="mb-4 animate-pulse rounded-2xl border border-rose-500/40 bg-rose-500/15 p-3 text-sm font-semibold text-rose-200">
              {alert.message}
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Audit Mode</p>
                <p className="text-xs text-slate-400">Switch to a room heatmap for one device.</p>
              </div>
              <button
                type="button"
                onClick={() => setAuditMode((value) => !value)}
                className={`relative h-7 w-14 rounded-full transition ${auditMode ? 'bg-cyan-500' : 'bg-slate-700'}`}
              >
                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition ${auditMode ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>

            {auditMode && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Device Timeline
                </label>
                <select
                  value={selectedDeviceMac}
                  onChange={(event) => setSelectedDeviceMac(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  {devices.map((device) => (
                    <option key={device.macAddress} value={device.macAddress}>
                      {device.deviceName}
                    </option>
                  ))}
                </select>
                {historyLoading ? (
                  <p className="mt-2 text-xs text-cyan-300">Loading audit history…</p>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    {historyEntries.length > 0
                      ? `${historyEntries.length} timeline entries loaded`
                      : 'No historical room entries found yet.'}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{device.deviceName}</p>
                    <p className="text-xs text-slate-400">{device.macAddress}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      device.authorized
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'animate-pulse bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {device.authorized ? 'Safe' : 'Unauthorized'}
                  </span>
                </div>

                <div className="mt-2 text-sm text-slate-400">
                  Tracked in <span className="font-medium text-slate-200">{device.room}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
