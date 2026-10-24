import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ClusterBar from './components/ClusterBar';
import StudentGrid from './components/StudentGrid';
import CodeDrawer from './components/CodeDrawer';

const TASK_RATE_USD = 18.5;
const BATCH_LABEL = 'RLHF-IND-101';

const INITIAL_ROOM_STATE = {
  roomId: 'CU-DSA-101',
  liveCount: 0,
  simulatedCount: 0,
  students: [],
  clusters: {
    QUADRATIC_TLE: { count: 0, label: 'Over SLA: O(N^2) (>400ms)' },
    COMPILE_ERROR: { count: 0, label: 'Build Failure (Rejection Risk)' },
    WRONG_ANSWER: { count: 0, label: 'Output Mismatch (Rejection Risk)' },
    OPTIMAL_ON: { count: 0, label: 'Pre-Flight Passed' }
  }
};

export default function App() {
  const [roomState, setRoomState] = useState(INITIAL_ROOM_STATE);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
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

            // Auto-clear after 2500ms
            setTimeout(() => {
              setRecentlyFlipped((prev) => {
                if (!prev[student.studentId]) return prev;
                const updated = { ...prev };
                delete updated[student.studentId];
                return updated;
              });
            }, 2500);
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

  const handleSendHint = ({ targetClusterId = null, targetStudentId = null, hintMessage }) => {
    if (!hintMessage || !hintMessage.trim()) return;

    socketRef.current?.emit('send_hint', {
      roomId: 'CU-DSA-101',
      targetClusterId,
      targetStudentId,
      hintMessage: hintMessage.trim()
    });

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage('Hint sent');
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Live derivation of selected student so open drawer updates in real time
  const selectedStudent = (roomState.students || []).find(
    (s) => s.studentId === selectedStudentId
  ) || null;

  const { liveCount = 0, simulatedCount = 0, clusters } = roomState;
  const totalOnline = (liveCount + simulatedCount) || 0;
  const optimalCount = clusters?.OPTIMAL_ON?.count ?? 0;
  const pct = totalOnline > 0 ? Math.round((optimalCount / totalOnline) * 100) : 0;

  const passingCount = optimalCount;
  const passingUSD = (passingCount * TASK_RATE_USD).toFixed(2);

  const rejectionCount =
    (clusters?.COMPILE_ERROR?.count ?? 0) +
    (clusters?.WRONG_ANSWER?.count ?? 0) +
    (clusters?.QUADRATIC_TLE?.count ?? 0);
  const rejectionUSD = (rejectionCount * TASK_RATE_USD).toFixed(2);

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
      <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              CodePulse
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm font-bold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 uppercase tracking-wider">
              GIG WORKER PRE-FLIGHT
            </span>
            {/* Connection dot */}
            <div className="flex items-center gap-2 ml-1">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  connected
                    ? 'bg-emerald-400 ring-4 ring-emerald-400/20'
                    : 'bg-rose-500 ring-4 ring-rose-500/20'
                }`}
              />
              <span className="text-xs font-semibold text-slate-400">
                {connected ? 'Live Stream' : 'Connecting...'}
              </span>
            </div>
          </div>

          <p className="text-sm md:text-base text-slate-300 font-medium">
            Pre-submission checks and effort log for task-based freelancers - Batch {BATCH_LABEL}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Live / Simulated pill */}
            <div className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs md:text-sm font-medium">
              <span className="text-cyan-400 font-bold">{liveCount}</span> live IDE ·{' '}
              <span className="text-indigo-400 font-bold">{simulatedCount}</span> simulated classroom nodes
            </div>

            {/* Passing pre-flight pill */}
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs md:text-sm font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Passing pre-flight: {passingCount} tasks (${passingUSD})
            </div>

            {/* Rejection risk pill */}
            <div className="px-3.5 py-1.5 rounded-full bg-rose-950/80 border border-rose-800/60 text-rose-300 text-xs md:text-sm font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Rejection risk: {rejectionCount} tasks (${rejectionUSD})
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            Illustrative demo rate: $18.50 per task
          </p>
        </div>

        {/* Pass rate progress bar */}
        <div className="w-full lg:w-80 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider">
              Pre-Flight Pass Rate
            </span>
            <span className="text-2xl md:text-3xl font-black text-emerald-400">
              {pct}%
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </header>

      {/* ClusterBar Component */}
      <ClusterBar
        clusters={clusters}
        totalOnline={totalOnline}
        selectedCluster={selectedCluster}
        onSelectCluster={handleSelectCluster}
        onSendHint={handleSendHint}
      />

      {/* StudentGrid Component */}
      <StudentGrid
        students={roomState.students || []}
        selectedCluster={selectedCluster}
        recentlyFlipped={recentlyFlipped}
        onSelectStudent={(studentId) => setSelectedStudentId(studentId)}
      />

      {/* CodeDrawer Component */}
      <CodeDrawer
        student={selectedStudent}
        onClose={() => setSelectedStudentId(null)}
        onSendHint={handleSendHint}
      />
    </div>
  );
}
