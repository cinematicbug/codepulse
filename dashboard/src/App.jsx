import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ClusterBar from './components/ClusterBar';
import StudentGrid from './components/StudentGrid';
import CodeDrawer from './components/CodeDrawer';
import { getGeminiApiKey, setGeminiApiKey, askSquadCopilotWithAI } from './utils/geminiAi';

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

const COPILOT_PRESETS = [
  'Diagnose top rejection bottleneck',
  'Spot subtle logic bugs in Wrong Answer',
  'Draft an O(N) sliding-window rescue hint'
];

export default function App() {
  const [taskRateUsd, setTaskRateUsd] = useState(18.5);
  const [roomState, setRoomState] = useState(INITIAL_ROOM_STATE);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [recentlyFlipped, setRecentlyFlipped] = useState({});
  const [rescueFeed, setRescueFeed] = useState([]);
  const [connected, setConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Gemini Squad Copilot State
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState(null);

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
      const newRescues = [];
      const prevMap = prevStudentsRef.current;
      const nextMap = new Map();

      if (Array.isArray(newRoomState.students)) {
        for (const student of newRoomState.students) {
          nextMap.set(student.studentId, student.clusterId);
          const prevCluster = prevMap.get(student.studentId);
          if (prevCluster && prevCluster !== 'OPTIMAL_ON' && student.clusterId === 'OPTIMAL_ON') {
            newlyFlipped[student.studentId] = true;
            newRescues.push({
              id: Date.now() + '-' + student.studentId + '-' + Math.random(),
              time: new Date().toLocaleTimeString(),
              name: student.name,
              studentId: student.studentId,
              runtimeMs: student.runtimeMs ?? 0,
              prevCluster
            });

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
      if (newRescues.length > 0) {
        setRescueFeed((prev) => [...newRescues, ...prev].slice(0, 6));
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

  const handleAskCopilot = async (query = copilotQuestion) => {
    const q = query.trim();
    if (!q) return;
    setCopilotLoading(true);
    try {
      const res = await askSquadCopilotWithAI(q, roomState);
      setCopilotResult(res);
    } catch (err) {
      console.error('Copilot query error:', err);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleExportCsv = () => {
    const students = roomState.students || [];
    const headers = [
      'studentId',
      'name',
      'isSimulated',
      'clusterId',
      'runtimeMs',
      'loopDepth',
      'editIterations',
      'proofHash',
      'preFlightStatus'
    ];

    const rows = students.map((s) => {
      const preFlightStatus = s.clusterId === 'OPTIMAL_ON' ? 'PASSED' : 'REJECTION_RISK';
      const cleanName = (s.name || '').replace(/"/g, '""');
      return [
        s.studentId,
        `"${cleanName}"`,
        s.isSimulated ? 'true' : 'false',
        s.clusterId || '',
        s.runtimeMs ?? 0,
        s.loopDepth ?? 1,
        s.editIterations ?? 1,
        s.proofHash || '',
        preFlightStatus
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${BATCH_LABEL}-preflight-audit.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
  const passingUSD = (passingCount * taskRateUsd).toFixed(2);

  const rejectionCount =
    (clusters?.COMPILE_ERROR?.count ?? 0) +
    (clusters?.WRONG_ANSWER?.count ?? 0) +
    (clusters?.QUADRATIC_TLE?.count ?? 0);
  const rejectionUSD = (rejectionCount * taskRateUsd).toFixed(2);

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

      {/* API Key Modal */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>🔑</span> Gemini API Key Configuration
              </h3>
              <button
                type="button"
                onClick={() => setApiKeyModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Paste your Google Gemini API key below to enable live <strong>Gemini 2.5 Flash</strong> code auditing and squad intelligence.
              (Saved securely in your browser's localStorage for this session).
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setGeminiApiKey('');
                  setApiKeyInput('');
                  setApiKeyModalOpen(false);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                Clear Key
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setApiKeyModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGeminiApiKey(apiKeyInput);
                    setApiKeyModalOpen(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
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

          {/* Interactive Task Rate Switcher */}
          <div className="flex flex-wrap items-center gap-3 pt-0.5">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full px-2.5 py-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                Rate:
              </span>
              {[12.0, 18.5, 35.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setTaskRateUsd(rate)}
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                    taskRateUsd === rate
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  ${rate.toFixed(2)}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-500 italic">
              Illustrative demo rate: ${taskRateUsd.toFixed(2)} per task
            </span>
          </div>
        </div>

        {/* Right side: CSV Export + Pass Rate progress bar */}
        <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm w-full sm:w-auto justify-center"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Batch CSV
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center gap-2">
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
        </div>
      </header>

      {/* ✨ Gemini Squad Copilot Interactive Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-900/50 p-4 md:p-5 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✨</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-extrabold text-white tracking-tight">
                  Gemini Squad Copilot
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase tracking-wider">
                  2.5 FLASH TELEMETRY
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Real-time AI diagnostics & automated rescue dispatch across 25 live freelancer nodes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setApiKeyInput(getGeminiApiKey());
              setApiKeyModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <span>🔑</span>
            <span>{getGeminiApiKey() ? 'API Key (Active)' : 'API Key'}</span>
            {getGeminiApiKey() && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        </div>

        {/* Quick-Prompt Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick Prompts:
          </span>
          {COPILOT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={copilotLoading}
              onClick={() => {
                setCopilotQuestion(preset);
                handleAskCopilot(preset);
              }}
              className="text-xs px-3 py-1 rounded-full bg-slate-800/90 hover:bg-indigo-950/80 text-slate-300 hover:text-indigo-200 border border-slate-700/80 hover:border-indigo-600 transition-all cursor-pointer disabled:opacity-50"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Question Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskCopilot();
          }}
          className="flex flex-col sm:flex-row gap-2 pt-0.5"
        >
          <input
            type="text"
            value={copilotQuestion}
            onChange={(e) => setCopilotQuestion(e.target.value)}
            placeholder="Ask Gemini anything about this live 25-worker batch..."
            className="flex-1 rounded-xl bg-slate-950/90 border border-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={copilotLoading || !copilotQuestion.trim()}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-md"
          >
            {copilotLoading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              'Ask Copilot'
            )}
          </button>
        </form>

        {/* Copilot Response Display */}
        {copilotResult && (
          <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-4 space-y-3 mt-2 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Copilot Insight
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  copilotResult.mode === 'gemini-live'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                }`}
              >
                {copilotResult.mode === 'gemini-live' ? 'GEMINI 2.5 FLASH LIVE' : 'LOCAL AST ENGINE'}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans">
              {copilotResult.answer}
            </p>

            {copilotResult.suggestedBroadcastHint && copilotResult.suggestedClusterTarget && (
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                    Recommended Cluster Action (Target: {copilotResult.suggestedClusterTarget})
                  </span>
                  <p className="text-xs text-indigo-200 italic font-mono">
                    "{copilotResult.suggestedBroadcastHint}"
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSendHint({
                      targetClusterId: copilotResult.suggestedClusterTarget,
                      targetStudentId: null,
                      hintMessage: copilotResult.suggestedBroadcastHint
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>⚡ Broadcast AI Hint to Cluster</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ClusterBar Component */}
      <ClusterBar
        clusters={clusters}
        totalOnline={totalOnline}
        selectedCluster={selectedCluster}
        onSelectCluster={handleSelectCluster}
        onSendHint={handleSendHint}
      />

      {/* Live Pre-Flight Rescue Feed Strip */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Pre-Flight Activity
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {rescueFeed.length > 0 ? `${rescueFeed.length} recent rescues` : 'Monitoring transitions'}
          </span>
        </div>

        {rescueFeed.length === 0 ? (
          <div className="text-xs text-slate-500 italic py-1 px-1">
            Waiting for pre-flight state transitions...
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {rescueFeed.map((item) => (
              <div
                key={item.id}
                className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-300 font-medium shadow-sm"
              >
                <span className="text-emerald-400">⚡</span>
                <span className="text-slate-400 font-mono text-[10px]">[{item.time}]</span>
                <span className="font-bold text-white">{item.name}</span>
                <span className="text-slate-400 font-mono text-[11px]">({item.studentId})</span>
                <span className="text-emerald-300 font-semibold">passed pre-flight ({item.runtimeMs} ms)</span>
              </div>
            ))}
          </div>
        )}
      </div>

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
