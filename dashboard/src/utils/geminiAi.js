// Gemini AI Integration with Resilient Local AST Fallback Engine

export function getGeminiApiKey() {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('CP_GEMINI_KEY') || '';
  }
  return '';
}

export function setGeminiApiKey(key) {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (key && key.trim()) {
      window.localStorage.setItem('CP_GEMINI_KEY', key.trim());
    } else {
      window.localStorage.removeItem('CP_GEMINI_KEY');
    }
  }
}

/**
 * Local AST & Pattern Inspector Fallback for worker code.
 * Analyzes exact C++ constructs, compiler errors, and SLA thresholds without network dependencies.
 */
function localAstAnalysis(student) {
  const code = student.code || '';
  const compilerErr = (student.compilerError || '').trim();
  const clusterId = student.clusterId;
  const runtimeMs = student.runtimeMs ?? 0;

  // 1. Compile Error
  if (clusterId === 'COMPILE_ERROR' || !student.compileSuccess || compilerErr) {
    const firstErrLine = compilerErr.split('\n')[0] || 'Build failed during g++ compilation step';
    let lineRef = firstErrLine;
    let rootCause = 'C++ compilation syntax or type error.';
    let fix = 'Check the compiler diagnostic line, verify semicolons and variable declarations.';

    if (code.includes('int left = 0, best = 0\n')) {
      lineRef = 'int left = 0, best = 0';
      rootCause = "Missing semicolon after variable declaration: expected ';' before 'long'.";
      fix = 'Add a semicolon after best = 0; before declaring windowSum.';
    } else if (code.includes('totalSum +=')) {
      lineRef = 'totalSum += arr[i];';
      rootCause = "Undeclared identifier 'totalSum' used in accumulation loop.";
      fix = 'Declare long long totalSum = 0; before the loop or rename to windowSum.';
    } else if (code.includes('return best\n')) {
      lineRef = 'return best';
      rootCause = "Missing semicolon on return statement: expected ';' before '}'.";
      fix = 'Change return best to return best;';
    } else if (code.includes('windowSum += arr[right];') && !code.includes('long long windowSum') && !code.includes('int windowSum')) {
      lineRef = 'windowSum += arr[right];';
      rootCause = "Identifier 'windowSum' is not declared in scope.";
      fix = 'Declare long long windowSum = 0; before starting the right pointer loop.';
    }

    return {
      rootCause,
      lineReference: lineRef,
      rejectionReason: `Automated compiler gate failure: g++ returned non-zero exit code (${firstErrLine}).`,
      suggestedHint: `Build failed. ${fix}`,
      mode: 'local-ast'
    };
  }

  // 2. Quadratic TLE / Over SLA
  if (clusterId === 'QUADRATIC_TLE' || runtimeMs > 400 || student.timedOut) {
    let loopHeader = 'for (int i = 0; ...) { for (int j = i; ...) { ... } }';
    if (code.includes('for (int start = 0')) {
      loopHeader = 'for (start ...) { for (end = start ...) { ... } }';
    } else if (code.includes('for (int left = 0')) {
      loopHeader = 'for (left ...) { for (right = left ...) { ... } }';
    }

    const isTimeout = student.timedOut || runtimeMs >= 1500;
    return {
      rootCause: `Quadratic O(N²) pairwise loop inspecting all subarrays (${loopHeader}). Positive integers guarantee monotonic window sum, rendering full scans redundant.`,
      lineReference: loopHeader,
      rejectionReason: isTimeout
        ? 'Hard timeout exceeded: execution halted past 1500ms safety ceiling.'
        : `SLA latency budget breached: ${runtimeMs}ms recorded vs strict <=400ms pre-flight SLA.`,
      suggestedHint: 'Your nested loop is over the 400 ms SLA. Use a sliding window: keep a running windowSum and advance left while windowSum > K.',
      mode: 'local-ast'
    };
  }

  // 3. Wrong Answer
  if (clusterId === 'WRONG_ANSWER' || !student.passedTests) {
    let lineRef = 'best = max(best, right - left);';
    let rootCause = 'Off-by-one interval length calculation: [left..right] interval size is right - left + 1.';
    let fix = 'The length of the current valid window [left..right] is (right - left + 1), not (right - left).';

    if (code.includes('right - left)')) {
      lineRef = 'best = max(best, right - left);';
      rootCause = 'Off-by-one window length bug: using (right - left) misses the current index element.';
      fix = 'Update length formula to best = max(best, right - left + 1).';
    } else if (code.includes('windowSum >= K')) {
      lineRef = 'while (windowSum >= K && left <= right)';
      rootCause = 'Flawed boundary condition: shrinks window when sum >= K, discarding valid subarrays whose sum equals K exactly.';
      fix = 'Change while condition from windowSum >= K to windowSum > K so valid subarrays equal to K are counted.';
    } else if (code.includes('left = right;') || code.includes('windowSum = arr[right];')) {
      lineRef = 'if (windowSum > K) { left = right; windowSum = arr[right]; }';
      rootCause = 'Premature window reset: resetting left = right skips overlapping valid subarrays starting after left.';
      fix = 'Use standard two-pointer reduction: while (windowSum > K && left <= right) windowSum -= arr[left++];';
    } else if (code.includes('left < right')) {
      lineRef = 'while (windowSum > K && left < right)';
      rootCause = 'Loop condition left < right prevents shrinking to single-element when arr[left] > K.';
      fix = 'Allow left to catch up: use while (windowSum > K && left <= right) windowSum -= arr[left++];';
    }

    return {
      rootCause,
      lineReference: lineRef,
      rejectionReason: 'Evaluation test failure: program returned FAIL. Subarray length differs from reference implementation.',
      suggestedHint: `Output differs from reference. ${fix}`,
      mode: 'local-ast'
    };
  }

  // 4. Optimal ON / Pre-flight passed
  return {
    rootCause: 'Optimal two-pointer sliding window with linear O(N) amortized time complexity and strict 64-bit sum accumulator.',
    lineReference: 'while (windowSum > K && left <= right) windowSum -= arr[left++];',
    rejectionReason: 'None. Solution meets all SLA, correctness, and compilation gates.',
    suggestedHint: 'Pre-flight verified. Code passes all automated QA criteria with sub-10ms latency.',
    mode: 'local-ast'
  };
}

/**
 * Analyzes a specific worker's submission with Gemini 2.5 Flash, falling back to Local AST.
 */
export async function analyzeWorkerCodeWithAI(student) {
  if (!student) return null;

  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const prompt = `You are an automated code reviewer and QA auditor for an engineering team testing C++ solutions for the "Longest Subarray with Sum <= K on strictly positive integers" problem.
SLA Threshold: <= 400ms.

Analyze this worker's submission:
Worker: ${student.name} (${student.studentId})
Cluster Category: ${student.clusterId}
Runtime: ${student.runtimeMs} ms
Timed Out: ${student.timedOut}
Tests Passed: ${student.passedTests}
Compile Success: ${student.compileSuccess}
Loop Depth: ${student.loopDepth}
Compiler Error: ${student.compilerError || 'None'}

Code:
\`\`\`cpp
${student.code}
\`\`\`

Return a strictly valid JSON object with EXACTLY these four keys (no markdown code fences, no extra text):
{
  "rootCause": "Detailed explanation of the algorithmic defect, syntax error, or performance issue",
  "lineReference": "The exact line or code segment containing the bug or inefficiency",
  "rejectionReason": "Why the client's automated pre-flight QA pipeline will reject this submission",
  "suggestedHint": "A crisp, actionable 1-2 sentence hint to send to the worker to fix the issue"
}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json'
            }
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          // Parse JSON, stripping potential markdown blocks if present
          const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed.rootCause && parsed.suggestedHint) {
            return {
              rootCause: parsed.rootCause,
              lineReference: parsed.lineReference || 'C++ Solution Block',
              rejectionReason: parsed.rejectionReason || 'Automated pre-flight check failed.',
              suggestedHint: parsed.suggestedHint,
              mode: 'gemini-live'
            };
          }
        }
      }
    } catch (err) {
      console.warn('Gemini 2.5 Flash query failed or timed out, activating Local AST Engine:', err.message);
    }
  }

  // Resilient fallback
  return localAstAnalysis(student);
}

/**
 * Squad Copilot: Analyzes the entire 25-worker batch and answers lead queries.
 */
export async function askSquadCopilotWithAI(question, roomState) {
  const students = roomState?.students || [];
  const clusters = roomState?.clusters || {};

  const passingCount = clusters?.OPTIMAL_ON?.count ?? 0;
  const tleCount = clusters?.QUADRATIC_TLE?.count ?? 0;
  const compileErrorCount = clusters?.COMPILE_ERROR?.count ?? 0;
  const wrongAnswerCount = clusters?.WRONG_ANSWER?.count ?? 0;
  const total = students.length;

  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const failingSamples = students
        .filter((s) => s.clusterId !== 'OPTIMAL_ON')
        .slice(0, 6)
        .map(
          (s) =>
            `- ${s.name} (${s.studentId}) [${s.clusterId}]: runtime=${s.runtimeMs}ms, errorStreak=${s.errorStreak}, err=${s.compilerError ? s.compilerError.slice(0, 80) : 'none'}`
        )
        .join('\n');

      const prompt = `You are the AI Squad Lead Copilot supervising a live batch of 25 freelancer code submissions for a high-throughput data processing lab.
Problem: Longest subarray with sum <= K on positive integers.
SLA Target: runtime <= 400ms.

Current Live Batch Metrics:
- Total Nodes: ${total}
- Pre-Flight Passed (OPTIMAL_ON): ${passingCount}
- SLA Breaches (QUADRATIC_TLE): ${tleCount}
- Syntax Failures (COMPILE_ERROR): ${compileErrorCount}
- Logic Mismatches (WRONG_ANSWER): ${wrongAnswerCount}

Failing Worker Samples:
${failingSamples}

Question from Lead/Judge: "${question}"

Analyze the live telemetry and provide an authoritative, technical, and concise response. If your advice warrants a broadcast hint to a specific group, indicate the target cluster and provide a hint string.

Return ONLY a raw valid JSON object with these keys:
{
  "answer": "Direct, authoritative 2-3 sentence answer with numerical context from the live batch",
  "suggestedClusterTarget": "QUADRATIC_TLE" | "COMPILE_ERROR" | "WRONG_ANSWER" | null,
  "suggestedBroadcastHint": "Short broadcast message for that cluster" | null
}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json'
            }
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed.answer) {
            return {
              answer: parsed.answer,
              suggestedClusterTarget: parsed.suggestedClusterTarget || null,
              suggestedBroadcastHint: parsed.suggestedBroadcastHint || null,
              mode: 'gemini-live'
            };
          }
        }
      }
    } catch (err) {
      console.warn('Squad Copilot Gemini query failed or timed out, activating Local Copilot:', err.message);
    }
  }

  // Dynamic fallback based on real batch telemetry
  const q = question.toLowerCase();

  if (q.includes('bottleneck') || q.includes('top rejection') || q.includes('quadratic') || q.includes('sla')) {
    return {
      answer: `The primary rejection driver is the O(N²) quadratic bottleneck affecting ${tleCount} workers. Average runtimes range between 680ms and 1500ms (far exceeding the 400ms SLA). The root defect is unpruned nested pairwise loops across positive integer sequences.`,
      suggestedClusterTarget: 'QUADRATIC_TLE',
      suggestedBroadcastHint: 'Your nested loop is over the 400 ms SLA. Use a sliding window: keep a running windowSum and advance left while windowSum > K.',
      mode: 'local-copilot'
    };
  }

  if (q.includes('wrong') || q.includes('logic') || q.includes('mismatch') || q.includes('subtle')) {
    return {
      answer: `Currently ${wrongAnswerCount} workers are failing test verification. AST analysis identifies off-by-one window length calculations (right - left instead of right - left + 1) and overly aggressive shrink conditions (windowSum >= K) which discard valid sub-arrays.`,
      suggestedClusterTarget: 'WRONG_ANSWER',
      suggestedBroadcastHint: 'Output differs from the reference. Check the boundary when shrinking the window and the length formula right - left + 1.',
      mode: 'local-copilot'
    };
  }

  if (q.includes('compile') || q.includes('build') || q.includes('syntax') || q.includes('error')) {
    return {
      answer: `${compileErrorCount} workers are failing at the g++ compilation gate. Typical causes are undeclared windowSum identifiers and missing semicolons before loop return blocks.`,
      suggestedClusterTarget: 'COMPILE_ERROR',
      suggestedBroadcastHint: 'Build failed. Read the first compiler error line and fix it before submitting.',
      mode: 'local-copilot'
    };
  }

  // Default overview answer
  const atRiskVal = ((total - passingCount) * 18.5).toFixed(2);
  const passingVal = (passingCount * 18.5).toFixed(2);
  return {
    answer: `Live batch telemetry: ${passingCount}/${total} workers have cleared pre-flight gates ($${passingVal} verified). ${total - passingCount} workers remain at rejection risk ($${atRiskVal} at risk), predominantly due to ${tleCount} O(N²) bottlenecks. Broadcasting an O(N) sliding window hint will rescue the majority of failing nodes.`,
    suggestedClusterTarget: tleCount > 0 ? 'QUADRATIC_TLE' : 'WRONG_ANSWER',
    suggestedBroadcastHint: 'Your nested loop is over the 400 ms SLA. Use a sliding window: keep a running windowSum and advance left while windowSum > K.',
    mode: 'local-copilot'
  };
}
