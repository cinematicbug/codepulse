import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ClusterBar from './components/ClusterBar';

const INITIAL_ROOM_STATE = {
  roomId: 'CU-DSA-101',
  liveCount: 0,
  simulatedCount: 0,
  students: [],
  clusters: {
    QUADRATIC_TLE: { count: 0, label: 'O(N^2) Bottleneck (>400ms / TLE)' },
    COMPILE_ERROR: { count: 0, label: 'Compile / Syntax Error' },
    WRONG_ANSWER: { count: 0, label: 'Wrong Output / Logic Bug' },
    OPTIMAL_ON: { count: 0, label: 'Optimal O(N) (<=400ms)' }
  }
};

export default function App() {
  const [roomState, setRoomState] = useState(INITIAL_ROOM_STATE);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [recentlyFlipped, setRecentlyFlipped] = useState({});
  const [connected, setConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const socketRef = useRef(null);
  const prevStudentsRef = useRef(new Map());
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    const socket = io('http://localhost:4000');
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', { roomId: 'CU-DSA-101', role: 'instructor' });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room_state', (newRoomState) => {
      if (!newRoomState) return;

      const newlyFlipped = {};
      const prevMap = prevStudentsRef.current;
      const nextMap = new Map();

      if (Array.isArray(newRoomState.students)) {
        for (const student of newRoomState.students) {
          nextMap.set(student.studentId, student.clusterId);
          const prevCluster = prevMap.get(student.studentId);
          if (prevCluster && prevCluster !== 'OPTIMAL_ON' && student.clusterId === 'OPTIMAL_ON') {
            newlyFlipped[student.studentId] = true;
          }
        }
      }
      prevStudentsRef.current = nextMap;

      if (Object.keys(newlyFlipped).length > 0) {
        setRecentlyFlipped((prev) => ({ ...prev, ...newlyFlipped }));
      }

      setRoomState(newRoomState);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSelectCluster = (clusterId) => {
    setSelectedCluster(clusterId);
    setRecentlyFlipped({});
  };

  const handleSendHint = (hintMessage) => {
    if (!hintMessage || !selectedCluster) return;

    socketRef.current?.emit('send_hint', {
      roomId: 'CU-DSA-101',
      targetClusterId: selectedCluster,
      targetStudentId: null,
      hintMessage
    });

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage('Hint sent');
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const { liveCount = 0, simulatedCount = 0, clusters } = roomState;
  const totalOnline = (liveCount + simulatedCount) || 0;
  const optimalCount = clusters?.OPTIMAL_ON?.count ?? 0;
  const pct = totalOnline > 0 ? Math.round((optimalCount / totalOnline) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 text-slate-950 font-bold px-5 py-3.5 rounded-xl shadow-2xl border border-emerald-400 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-base">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              CodePulse · Real-Time Lab Telemetry
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
              CU-DSA-101 · Sliding Window Lab
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Connection dot */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-3 h-3 rounded-full ${
                  connected
                    ? 'bg-emerald-400 ring-4 ring-emerald-400/20'
                    : 'bg-rose-500 ring-4 ring-rose-500/20'
                }`}
              />
              <span className="text-xs md:text-sm font-semibold text-slate-400">
                {connected ? 'Socket Connected' : 'Connecting to port 4000...'}
              </span>
            </div>
            <span className="text-slate-600">|</span>
            {/* Honest pill */}
            <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs md:text-sm font-medium">
              <span className="text-emerald-400 font-bold">{liveCount}</span> live IDE ·{' '}
              <span className="text-indigo-400 font-bold">{simulatedCount}</span> simulated classroom nodes
            </div>
          </div>
        </div>

        {/* % Optimal O(N) Progress Bar */}
        <div className="w-full lg:w-96 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm md:text-base font-bold text-slate-300">
              % Optimal O(N)
            </span>
            <span className="text-2xl md:text-3xl font-black text-emerald-400">
              {pct}%
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden border border-slate-800/90">
            <div
              className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      {/* ClusterBar component */}
      <ClusterBar
        clusters={clusters}
        totalOnline={totalOnline}
        selectedCluster={selectedCluster}
        onSelectCluster={handleSelectCluster}
        onSendHint={handleSendHint}
      />

      {/* Slot for student grid for the next prompt */}
      <div id="student-grid-slot"></div>
    </div>
  );
}
