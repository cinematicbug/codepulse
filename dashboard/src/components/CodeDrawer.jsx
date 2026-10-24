import { useState } from 'react';

const QUICK_FIX_PRESETS = [
  {
    label: 'Sliding Window O(N)',
    message: 'Your nested loop is over the 400 ms SLA. Use a sliding window: keep a running windowSum and advance left while windowSum > K.'
  },
  {
    label: 'Check <= K Boundary',
    message: 'Output differs from the reference. Check the boundary when shrinking the window and the length formula right - left + 1.'
  },
  {
    label: 'Fix C++17 Syntax',
    message: 'Build failed. Read the first compiler error line, check variable declarations (long long), and fix it before submitting.'
  }
];

export default function CodeDrawer({
  student,
  onClose,
  onSendHint
}) {
  const [copied, setCopied] = useState(false);
  const [directFixMessage, setDirectFixMessage] = useState('');

  if (!student) return null;

  const buildPass = Boolean(student.compileSuccess);
  const outputPass = Boolean(student.passedTests);
  const slaPass = Boolean(student.compileSuccess && !student.timedOut && student.runtimeMs <= 400);
  const effortPass = Boolean(student.proofHash);

  // Visual 400ms SLA Latency Bar calculation
  let slaBarWidth = '100%';
  let slaBarColor = 'bg-rose-500';
  if (!student.compileSuccess) {
    slaBarWidth = '100%';
    slaBarColor = 'bg-amber-500/70';
  } else if (student.runtimeMs <= 400 && !student.timedOut) {
    slaBarWidth = `${Math.max(8, Math.round(((student.runtimeMs ?? 0) / 400) * 100))}%`;
    slaBarColor = 'bg-emerald-400';
  } else {
    slaBarWidth = '100%';
    slaBarColor = 'bg-rose-500';
  }

  const handleCopyLog = async () => {
    const editIters = student.editIterations ?? 1;
    const hash = student.proofHash || 'N/A';
    const runtime = student.runtimeMs ?? 0;
    const textToCopy = [
      'CodePulse effort log (self-generated, not independently verified)',
      `Worker: ${student.name} (${student.studentId})`,
      `Code versions logged: ${editIters}`,
      `Latest log hash: ${hash}`,
      `Latest check: ${student.clusterId}, ${runtime} ms`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy effort log:', e);
    }
  };

  const handleSendFix = (e) => {
    e.preventDefault();
    if (!directFixMessage.trim()) return;

    if (onSendHint) {
      onSendHint({
        targetClusterId: null,
        targetStudentId: student.studentId,
        hintMessage: directFixMessage.trim()
      });
    }
    setDirectFixMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-xl md:max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full text-slate-100">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">
                  {student.name}
                </h2>
                {!student.isSimulated ? (
                  <span className="text-xs font-black tracking-wider px-2 py-0.5 rounded bg-cyan-400 text-slate-950 uppercase shadow-sm">
                    LIVE
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    SIM
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Node ID: {student.studentId}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* (a) Pre-flight checks: 2x2 grid */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Pre-Flight Checks
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Build */}
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                  buildPass ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-rose-950/30 border-rose-800/60'
                }`}>
                  <span className="text-xs font-semibold text-slate-300">Build</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-sm font-bold ${buildPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {buildPass ? 'Pass' : 'Fail'}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {buildPass ? 'g++ ok' : 'compile err'}
                    </span>
                  </div>
                </div>

                {/* Output matches reference */}
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                  outputPass ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-rose-950/30 border-rose-800/60'
                }`}>
                  <span className="text-xs font-semibold text-slate-300">Output matches reference</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-sm font-bold ${outputPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {outputPass ? 'Pass' : 'Fail'}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {outputPass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>

                {/* Within SLA */}
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                  slaPass ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-rose-950/30 border-rose-800/60'
                }`}>
                  <div>
                    <span className="text-xs font-semibold text-slate-300">Within SLA</span>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-sm font-bold ${slaPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {slaPass ? 'Pass' : 'Fail'}
                      </span>
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        {student.runtimeMs ?? 0} ms
                      </span>
                    </div>
                  </div>
                  {/* Visual 400ms SLA Latency Bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${slaBarColor}`}
                      style={{ width: slaBarWidth }}
                    />
                  </div>
                </div>

                {/* Effort log recorded */}
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                  effortPass ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-rose-950/30 border-rose-800/60'
                }`}>
                  <span className="text-xs font-semibold text-slate-300">Effort log recorded</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-sm font-bold ${effortPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {effortPass ? 'Pass' : 'Fail'}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {effortPass ? 'Logged' : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* (b) Effort log card */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Effort Log & Authorship
                </h3>
                <button
                  type="button"
                  onClick={handleCopyLog}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copied ? 'Copied' : 'Copy effort log'}
                </button>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="text-slate-300 flex items-center justify-between bg-slate-900 px-3 py-2 rounded border border-slate-800">
                  <span className="text-slate-500">Hash:</span>
                  <span className="text-indigo-300 font-bold">{student.proofHash || 'None'}</span>
                </div>
                <div className="text-slate-300 flex items-center justify-between bg-slate-900 px-3 py-2 rounded border border-slate-800">
                  <span className="text-slate-500">Code versions logged:</span>
                  <span className="text-emerald-400 font-bold">{student.editIterations ?? 1}</span>
                </div>
              </div>
            </div>

            {/* (c) Compiler Error if present */}
            {student.compilerError && student.compilerError.trim() && (
              <div>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  Compiler Diagnostic Output
                </h3>
                <pre className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3 text-xs text-rose-200 font-mono whitespace-pre-wrap overflow-x-auto max-h-48">
                  {student.compilerError}
                </pre>
              </div>
            )}

            {/* (d) Full student code */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Submitted Code (solution.cpp)
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  Depth: {student.loopDepth ?? 1} · Streak: {student.errorStreak ?? 0}
                </span>
              </div>
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-96 leading-relaxed">
                <code>{student.code || '// No code submitted yet'}</code>
              </pre>
            </div>

            {/* (e) 1-on-1 Direct Fix sender */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  1-on-1 Direct Fix
                </h3>
              </div>

              {/* Quick 1-on-1 Fix Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 mr-0.5">Presets:</span>
                {QUICK_FIX_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDirectFixMessage(preset.message)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700/80 hover:border-indigo-500 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendFix} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={directFixMessage}
                  onChange={(e) => setDirectFixMessage(e.target.value)}
                  placeholder={`Send direct fix to ${student.name}...`}
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!directFixMessage.trim()}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 text-sm transition-all cursor-pointer shrink-0"
                >
                  Send 1-on-1 Fix
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
