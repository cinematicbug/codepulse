const util = require('util');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { performance } = require('perf_hooks');
const chalk = require('chalk');
const chokidar = require('chokidar');
const io = require('socket.io-client');

const execFileAsync = util.promisify(execFile);

let runCount = 0, prevHash = 'GENESIS';

function getArg(flag, defaultValue) {
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === flag && i + 1 < process.argv.length) {
      return process.argv[i + 1];
    }
    if (process.argv[i].startsWith(flag + '=')) {
      return process.argv[i].slice(flag.length + 1);
    }
  }
  return defaultValue;
}

const roomId = getArg('--room', 'CU-DSA-101');
const name = getArg('--name', 'Namanjot Kaur');
const studentId = getArg('--id', 'stu_live_1');
const fileArg = getArg('--file', path.join(__dirname, 'solution.cpp'));
const serverUrl = getArg('--server', 'http://localhost:4000');

const targetFile = path.resolve(fileArg);
console.log(`CodePulse CLI watching ${targetFile} | room=${roomId} id=${studentId}`);

const socket = io(serverUrl);
let lastPayload = null;
let currentClusterId = null;

socket.on('connect', () => {
  socket.emit('join_room', { roomId, role: 'student' });
  if (lastPayload) {
    socket.emit('code_update', lastPayload);
  }
});

function stripCommentsAndStrings(code) {
  let result = '';
  let i = 0;
  const len = code.length;
  while (i < len) {
    if (code[i] === '/' && code[i + 1] === '/') {
      i += 2;
      while (i < len && code[i] !== '\n') {
        i++;
      }
    } else if (code[i] === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
        i++;
      }
      i += 2;
    } else if (code[i] === '"') {
      i++;
      while (i < len && code[i] !== '"') {
        if (code[i] === '\\' && i + 1 < len) {
          i += 2;
        } else {
          i++;
        }
      }
      i++;
      result += ' ';
    } else if (code[i] === "'") {
      i++;
      while (i < len && code[i] !== "'") {
        if (code[i] === '\\' && i + 1 < len) {
          i += 2;
        } else {
          i++;
        }
      }
      i++;
      result += ' ';
    } else {
      result += code[i];
      i++;
    }
  }
  return result;
}

function countMaxLoopDepth(code) {
  if (!code) return 0;
  const clean = stripCommentsAndStrings(code);
  const loopBraceIndices = new Set();
  const loopRegex = /\b(for|while)\s*\(/g;
  let match;

  while ((match = loopRegex.exec(clean)) !== null) {
    let parenDepth = 1;
    let idx = loopRegex.lastIndex;
    while (idx < clean.length && parenDepth > 0) {
      if (clean[idx] === '(') {
        parenDepth++;
      } else if (clean[idx] === ')') {
        parenDepth--;
      }
      idx++;
    }
    if (parenDepth === 0) {
      while (idx < clean.length && /\s/.test(clean[idx])) {
        idx++;
      }
      if (idx < clean.length && clean[idx] === '{') {
        loopBraceIndices.add(idx);
      }
    }
  }

  const stack = [];
  let currentDepth = 0;
  let maxDepth = 0;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '{') {
      const isLoop = loopBraceIndices.has(i);
      if (isLoop) {
        currentDepth++;
        if (currentDepth > maxDepth) {
          maxDepth = currentDepth;
        }
      }
      stack.push(isLoop);
    } else if (ch === '}') {
      if (stack.length > 0) {
        const wasLoop = stack.pop();
        if (wasLoop) {
          currentDepth--;
        }
      }
    }
  }

  return maxDepth;
}

function classify(update) {
  if (!update.compileSuccess) {
    return 'COMPILE_ERROR';
  }
  if (update.timedOut) {
    return 'QUADRATIC_TLE';
  }
  if (!update.passedTests) {
    return 'WRONG_ANSWER';
  }
  if (update.runtimeMs > 400) {
    return 'QUADRATIC_TLE';
  }
  return 'OPTIMAL_ON';
}

function formatCluster(clusterId) {
  switch (clusterId) {
    case 'QUADRATIC_TLE':
      return chalk.red.bold(clusterId);
    case 'COMPILE_ERROR':
      return chalk.yellow.bold(clusterId);
    case 'WRONG_ANSWER':
      return chalk.magenta.bold(clusterId);
    case 'OPTIMAL_ON':
      return chalk.green.bold(clusterId);
    default:
      return chalk.white(clusterId);
  }
}

async function executeRun() {
  let code = '';
  try {
    code = fs.readFileSync(targetFile, 'utf8');
  } catch (err) {
    console.error(`Cannot read ${targetFile}:`, err.message);
    return;
  }

  const loopDepth = countMaxLoopDepth(code);
  let compileSuccess = false;
  let compilerError = '';
  let runtimeMs = 0;
  let timedOut = false;
  let passedTests = false;

  const binPath = path.join(__dirname, `solution_bin_${Date.now()}${process.platform === 'win32' ? '.exe' : ''}`);

  try {
    // 6a: Compile
    try {
      await execFileAsync('g++', ['-std=c++17', '-O0', targetFile, '-o', binPath], {
        timeout: 30000,
        windowsHide: true
      });
      compileSuccess = true;
    } catch (err) {
      compileSuccess = false;
      compilerError = (err.stderr || err.message || '').slice(0, 1500);
    }

    if (compileSuccess) {
      // 6b: Run #1
      const t0 = performance.now();
      let run1Err = null;
      let run1Stdout = '';
      try {
        const res = await execFileAsync(binPath, [], {
          timeout: 1500,
          maxBuffer: 1048576,
          windowsHide: true
        });
        run1Stdout = res.stdout || '';
      } catch (err) {
        run1Err = err;
        run1Stdout = (err.stdout || '') + (err.stderr || '');
      }
      const t1 = performance.now();
      runtimeMs = t1 - t0;

      timedOut = !!run1Err && (run1Err.killed === true || run1Err.signal === 'SIGTERM');
      passedTests = !run1Err && run1Stdout.trim().includes('PASS');

      // 6c: Retry if passedTests && runtimeMs > 400
      if (passedTests && runtimeMs > 400) {
        const tRetry0 = performance.now();
        let retryErr = null;
        let retryStdout = '';
        try {
          const resRetry = await execFileAsync(binPath, [], {
            timeout: 400,
            maxBuffer: 1048576,
            windowsHide: true
          });
          retryStdout = resRetry.stdout || '';
        } catch (err) {
          retryErr = err;
          retryStdout = (err.stdout || '') + (err.stderr || '');
        }
        const tRetry1 = performance.now();
        const retryMs = tRetry1 - tRetry0;

        if (!retryErr && retryStdout.trim().includes('PASS') && retryMs < runtimeMs) {
          runtimeMs = retryMs;
        }
      }
    }
  } finally {
    try {
      fs.rmSync(binPath, { force: true });
    } catch (e) {}
  }

  // 6d: Single emit point
  runCount += 1;
  const proofHash = 'log_' + crypto.createHash('sha256').update(prevHash + ':' + studentId + ':' + runCount + ':' + code.length + ':' + Math.round(runtimeMs)).digest('hex').slice(0, 12);
  prevHash = proofHash;

  const payload = {
    roomId,
    studentId,
    name,
    isSimulated: false,
    code,
    compileSuccess,
    compilerError,
    runtimeMs: Math.round(runtimeMs),
    timedOut,
    passedTests,
    loopDepth,
    proofHash,
    timestamp: Date.now()
  };

  currentClusterId = classify(payload);
  lastPayload = payload;
  socket.emit('code_update', payload);

  console.log(chalk.cyan('┌────────────────────────────────────────────────────────┐'));
  console.log(`│ Status : ${formatCluster(currentClusterId)}`);
  console.log('│ Pre-flight: ' + (currentClusterId === 'OPTIMAL_ON' ? chalk.green.bold('PASSED') : chalk.red.bold('REJECTION RISK')));
  console.log('│ Effort log: ' + proofHash + ' (run #' + runCount + ')');
  console.log(`│ Time   : ${payload.runtimeMs}ms | loopDepth: ${loopDepth}`);
  console.log(`│ Tests  : ${passedTests ? chalk.green('PASS') : chalk.red('FAIL')} | timedOut: ${timedOut}`);
  if (compilerError) {
    const firstLine = compilerError.split('\n')[0].trim();
    if (firstLine) {
      console.log(`│ Error  : ${chalk.yellow(firstLine.slice(0, 48))}`);
    }
  }
  console.log(chalk.cyan('└────────────────────────────────────────────────────────┘'));
}

let running = false;
let pending = false;

async function runOnce() {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  try {
    await executeRun();
  } catch (err) {
    console.error('Run error:', err.message);
  } finally {
    running = false;
    if (pending) {
      pending = false;
      runOnce();
    }
  }
}

runOnce();

chokidar
  .watch(targetFile, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50
    }
  })
  .on('all', (event) => {
    if (event === 'add' || event === 'change') {
      runOnce();
    }
  });

function wrapText(text, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    if (!word) continue;
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [''];
}

socket.on('instructor_hint', (payload) => {
  if (!payload) return;
  const isMatch =
    (payload.targetStudentId == null && payload.targetClusterId === currentClusterId) ||
    payload.targetStudentId === studentId;

  if (isMatch) {
    const message = payload.hintMessage || '';
    const lines = wrapText(message, 54);
    console.log('\n' + chalk.cyan.bold('┌─ SQUAD LEAD FIX ' + '─'.repeat(39) + '┐'));
    for (const line of lines) {
      console.log(chalk.cyan.bold('│ ') + chalk.whiteBright(line.padEnd(54, ' ')) + chalk.cyan.bold(' │'));
    }
    console.log(chalk.cyan.bold('└' + '─'.repeat(56) + '┘') + '\n');
    process.stdout.write(String.fromCharCode(7));
  }
});
