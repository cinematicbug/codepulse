# CodePulse Contract (final)
Server: http://localhost:4000 (Socket.io v4, CORS origin '*'). Room: CU-DSA-101. Live student id: stu_live_1.
Problem: longest subarray with sum <= K on strictly positive ints. The C++ program prints PASS or FAIL.
Thresholds: SLOW_MS = 400, TIMEOUT_MS = 1500.
 
## Classification (total function, first match wins; the server is the source of truth)
1. !compileSuccess -> COMPILE_ERROR
2. timedOut -> QUADRATIC_TLE
3. !passedTests -> WRONG_ANSWER
4. runtimeMs > 400 -> QUADRATIC_TLE
5. otherwise -> OPTIMAL_ON
 
Badge only, never changes clusterId: highConfidenceQuadratic = (clusterId === 'QUADRATIC_TLE' && loopDepth >= 2).
Labels: COMPILE_ERROR 'Compile / Syntax Error'; WRONG_ANSWER 'Wrong Output / Logic Bug'; QUADRATIC_TLE 'O(N^2) Bottleneck (>400ms / TLE)'; OPTIMAL_ON 'Optimal O(N) (<=400ms)'.
 
## Measurement rule (CLI)
- runtimeMs is measured on run #1 (timeout 1500 ms) and rounded to an integer via Math.round(runtimeMs) before classification and emission. timedOut and passedTests ALWAYS describe run #1.
- If run #1 passes (passedTests === true) but runtimeMs > 400, the CLI runs the binary ONE more time with a 400 ms timeout budget; its timing replaces runtimeMs ONLY if the retry exits cleanly (!retryErr), prints PASS, and retryMs < runtimeMs.
- The CLI's local classify() copy is used only for terminal status display and instructor_hint matching; the server re-computes clusterId as the single source of truth for room_state.
 
## Socket rooms
- Students and the simulator join socket room <roomId>. Instructors join socket room instructors:<roomId>.
- room_state is sent ONLY to instructors:<roomId>. instructor_hint is sent ONLY to <roomId>.
 
## Events
join_room (client -> server): { roomId, role } where role is 'instructor' or 'student'.
 
code_update (CLI/simulator -> server): { roomId, studentId, name, isSimulated, code, compileSuccess, compilerError, runtimeMs, timedOut, passedTests, loopDepth, timestamp }. All 12 fields are ALWAYS present on every emit (including compile failures). Any clusterId sent by a client is ignored.
 
room_state (server -> instructors): { roomId, liveCount, simulatedCount, students, clusters }
  - student = all code_update fields + clusterId, errorStreak, highConfidenceQuadratic, online (boolean)
  - students includes offline records (online: false) so the dashboard can render dimmed offline tiles, sorted: isSimulated false first, then errorStreak descending, then studentId ascending
  - clusters = { COMPILE_ERROR: {count, label}, WRONG_ANSWER: {count, label}, QUADRATIC_TLE: {count, label}, OPTIMAL_ON: {count, label} }, all four keys always present
  - liveCount, simulatedCount and cluster counts include online (online: true) students only
  - room_state is emitted even for an empty room with zero records (liveCount: 0, simulatedCount: 0, students: [], and all four cluster keys at count: 0)
 
errorStreak: OPTIMAL_ON resets it to 0; otherwise +1 only if the code differs from that student's previous code (or it is their first submission).
 
send_hint (dashboard -> server): { roomId, targetClusterId, targetStudentId, hintMessage }. targetClusterId is one of the 4 cluster IDs or null. targetStudentId is a string or null. Exactly one of targetClusterId or targetStudentId is non-null.
 
instructor_hint (server -> room): same fields + sentAt (ms epoch).
 
Hint matching (CLI): show if (targetStudentId == null && targetClusterId === own cluster) || targetStudentId === own studentId.
 
Simulator: flips only simulated students and never emits for stu_live_1.
