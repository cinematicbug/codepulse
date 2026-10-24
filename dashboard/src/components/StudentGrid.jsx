export default function StudentGrid({
  students = [],
  selectedCluster = null,
  recentlyFlipped = {},
  onSelectStudent
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-400 px-1">
        <span>Classroom & Freelancer Nodes ({students.length})</span>
        <span className="text-xs text-slate-500">
          Click any tile to inspect code & effort log
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {students.map((student) => {
          const isLive = !student.isSimulated;
          const isOnline = student.online !== false;
          const isFlipped = Boolean(recentlyFlipped && recentlyFlipped[student.studentId]);
          const inSelectedCluster = Boolean(selectedCluster && student.clusterId === selectedCluster);
          const notInSelectedCluster = Boolean(selectedCluster && student.clusterId !== selectedCluster);

          // DIM-NOT-HIDE RULE:
          // Never hide tiles when a cluster is selected.
          // Tiles NOT in selectedCluster are dimmed (opacity-35), EXCEPT live tile (!student.isSimulated) which is NEVER dimmed.
          // Offline dimming: if student.online === false, dim the tile and show OFFLINE badge.
          let opacityClass = 'opacity-100';
          if (!isOnline) {
            opacityClass = 'opacity-40 grayscale';
          } else if (notInSelectedCluster && !isLive) {
            opacityClass = 'opacity-35';
          }

          // Rings and highlights
          let ringClass = 'border-slate-800 hover:border-slate-600 bg-slate-900/70';
          if (isFlipped) {
            ringClass = 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-950/30 shadow-lg shadow-emerald-500/30 animate-pulse';
          } else if (isLive) {
            ringClass = 'ring-2 ring-cyan-400 border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/60';
          } else if (inSelectedCluster) {
            ringClass = 'ring-2 ring-indigo-400 border-indigo-500/80 bg-slate-850 shadow-md shadow-indigo-950/50';
          }

          const isOptimal = student.clusterId === 'OPTIMAL_ON';
          const runtimeDisplay = student.timedOut
            ? 'TLE >1500ms'
            : `${student.runtimeMs ?? 0} ms`;

          // Visual 400ms SLA Latency Bar
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

          return (
            <div
              key={student.studentId}
              onClick={() => onSelectStudent && onSelectStudent(student.studentId)}
              className={`rounded-xl p-3.5 border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-2.5 relative select-none ${opacityClass} ${ringClass}`}
            >
              {/* Header: Name + Badges */}
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Live/Sim badge */}
                    {isLive ? (
                      <span className="text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 uppercase shadow-sm">
                        LIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                        SIM
                      </span>
                    )}

                    {!isOnline && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                        OFFLINE
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {student.studentId}
                  </span>
                </div>

                <div className="font-bold text-sm text-slate-100 truncate" title={student.name}>
                  {student.name}
                </div>
              </div>

              {/* v9 Status Chip */}
              <div>
                {isOptimal ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Pre-flight passed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Rejection risk
                  </span>
                )}
              </div>

              {/* Visual 400ms SLA Latency Bar */}
              <div
                className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden"
                title={`Runtime: ${student.runtimeMs}ms (SLA 400ms)`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${slaBarColor}`}
                  style={{ width: slaBarWidth }}
                />
              </div>

              {/* Metrics row */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className={`font-mono font-semibold ${student.timedOut ? 'text-rose-400' : 'text-slate-300'}`}>
                  {runtimeDisplay}
                </span>

                <span className="text-slate-600">·</span>

                <span className="text-slate-400 font-mono text-[11px]">
                  depth:{student.loopDepth ?? 1}
                </span>

                {student.errorStreak >= 2 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    {student.errorStreak} streak
                  </span>
                )}

                {student.highConfidenceQuadratic && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    O(N²)
                  </span>
                )}
              </div>

              {/* Proof hash pill */}
              {student.proofHash && (
                <div
                  className="font-mono text-[10px] text-slate-400 bg-slate-950/90 px-2 py-1 rounded border border-slate-800/90 truncate"
                  title={student.proofHash}
                >
                  {student.proofHash}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
