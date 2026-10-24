const io = require('socket.io-client');

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const optimalSlidingWindowCode = `int solve(const vector<int>& arr, long long K) {
    int left = 0, best = 0;
    long long windowSum = 0;
    for (int right = 0; right < (int)arr.size(); ++right) {
        windowSum += arr[right];
        while (windowSum > K && left <= right) windowSum -= arr[left++];
        best = max(best, right - left + 1);
    }
    return best;
}`;

function createInitialStudents() {
  const students = [
    // 11 QUADRATIC_TLE (9 normal pass, 2 timedOut)
    {
      studentId: 'sim_1',
      name: 'Aarav Sharma',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      runtimeMs: randomInt(680, 1420),
      timedOut: false,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int n = arr.size(), best = 0;
    for (int i = 0; i < n; ++i) {
        long long sum = 0;
        for (int j = i; j < n; ++j) {
            sum += arr[j];
            if (sum <= K) best = max(best, j - i + 1);
        }
    }
    return best;
}`
    },
    {
      studentId: 'sim_2',
      name: 'Ananya Iyer',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      runtimeMs: randomInt(680, 1420),
      timedOut: false,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int best = 0;
    for (int i = 0; i < (int)arr.size(); ++i) {
        long long cur = 0;
        for (int j = i; j < (int)arr.size(); ++j) {
            cur += arr[j];
            if (cur <= K) best = max(best, j - i + 1);
        }
    }
    return best;
}`
    },
    {
      studentId: 'sim_3',
      name: 'Rohan Gupta',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      runtimeMs: randomInt(680, 1420),
      timedOut: false,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int maxLen = 0, sz = arr.size();
    for (int start = 0; start < sz; ++start) {
        long long s = 0;
        for (int end = start; end < sz; ++end) {
            s += arr[end];
            if (s <= K) maxLen = max(maxLen, end - start + 1);
        }
    }
    return maxLen;
}`
    },
    {
      studentId: 'sim_4',
      name: 'Priya Patel',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      runtimeMs: randomInt(680, 1420),
      timedOut: false,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int ans = 0;
    for (int i = 0; i < (int)arr.size(); ++i) {
        long long sum = 0;
        for (int j = i; j < (int)arr.size(); ++j) {
            sum += arr[j];
            if (sum <= K) ans = max(ans, j - i + 1);
        }
    }
    return ans;
}`
    },
    {
      studentId: 'sim_5',
      name: 'Aditya Verma',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      runtimeMs: randomInt(680, 1420),
      timedOut: false,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int len = 0;
    for (int left = 0; left < (int)arr.size(); ++left) {
        long long tot = 0;
        for (int right = left; right < (int)arr.size(); ++right) {
            tot += arr[right];
            if (tot <= K) len = max(len, right - left + 1);
        }
    }
    return len;
}`
    },
    {
      studentId: 'sim_6',
      name: 'Sneha Reddy',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      runtimeMs: randomInt(680, 1420),
      timedOut: false,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int best = 0, n = arr.size();
    for (int i = 0; i < n; ++i) {
        long long s = 0;
        for (int j = i; j < n; ++j) {
            s += arr[j];
            if (s <= K) best = max(best, j - i + 1);
        }
    }
    return best;
}`
    },
    {
      studentId: 'sim_7',
      name: 'Vikram Malhotra',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      runtimeMs: randomInt(680, 1420),
      timedOut: false,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int maxSub = 0;
    for (int a = 0; a < (int)arr.size(); ++a) {
        long long sum = 0;
        for (int b = a; b < (int)arr.size(); ++b) {
            sum += arr[b];
            if (sum <= K) maxSub = max(maxSub, b - a + 1);
        }
    }
    return maxSub;
}`
    },
    {
      studentId: 'sim_8',
      name: 'Neha Singh',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      runtimeMs: randomInt(680, 1420),
      timedOut: false,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int n = arr.size(), ret = 0;
    for (int i = 0; i < n; i++) {
        long long acc = 0;
        for (int j = i; j < n; j++) {
            acc += arr[j];
            if (acc <= K) ret = max(ret, j - i + 1);
        }
    }
    return ret;
}`
    },
    {
      studentId: 'sim_9',
      name: 'Rahul Joshi',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      runtimeMs: randomInt(680, 1420),
      timedOut: false,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int ans = 0;
    for (int i = 0; i < (int)arr.size(); ++i) {
        long long sum = 0;
        for (int j = i; j < (int)arr.size(); ++j) {
            sum += arr[j];
            if (sum <= K) ans = max(ans, j - i + 1);
        }
    }
    return ans;
}`
    },
    {
      studentId: 'sim_10',
      name: 'Pooja Nair',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: false,
      runtimeMs: 1500,
      timedOut: true,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int ans = 0, n = arr.size();
    for (int i = 0; i < n; ++i) {
        long long sum = 0;
        for (int j = i; j < n; ++j) {
            sum += arr[j];
            if (sum <= K) ans = max(ans, j - i + 1);
        }
    }
    return ans;
}`
    },
    {
      studentId: 'sim_11',
      name: 'Amit Kumar',
      clusterId: 'QUADRATIC_TLE',
      compileSuccess: true,
      compilerError: '',
      passedTests: false,
      runtimeMs: 1500,
      timedOut: true,
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int best = 0;
    for (int i = 0; i < (int)arr.size(); ++i) {
        long long sum = 0;
        for (int j = i; j < (int)arr.size(); ++j) {
            sum += arr[j];
            if (sum <= K) best = max(best, j - i + 1);
        }
    }
    return best;
}`
    },

    // 4 COMPILE_ERROR
    {
      studentId: 'sim_12',
      name: 'Divya Rao',
      clusterId: 'COMPILE_ERROR',
      compileSuccess: false,
      compilerError: "solution.cpp: In function 'int solve(const std::vector<int>&, long long int)':\nsolution.cpp:3:5: error: expected ';' before 'long'",
      runtimeMs: 0,
      timedOut: false,
      passedTests: false,
      loopDepth: 1,
      code: `int solve(const vector<int>& arr, long long K) {
    int left = 0, best = 0
    long long windowSum = 0;
    for (int right = 0; right < (int)arr.size(); ++right) {
        windowSum += arr[right];
    }
    return best;
}`
    },
    {
      studentId: 'sim_13',
      name: 'Siddharth Mehta',
      clusterId: 'COMPILE_ERROR',
      compileSuccess: false,
      compilerError: "solution.cpp: In function 'int solve(const std::vector<int>&, long long int)':\nsolution.cpp:4:9: error: 'windowSum' was not declared in this scope",
      runtimeMs: 0,
      timedOut: false,
      passedTests: false,
      loopDepth: 1,
      code: `int solve(const vector<int>& arr, long long K) {
    int left = 0, best = 0;
    for (int right = 0; right < (int)arr.size(); ++right) {
        windowSum += arr[right];
        best = max(best, right - left + 1);
    }
    return best;
}`
    },
    {
      studentId: 'sim_14',
      name: 'Tanvi Deshmukh',
      clusterId: 'COMPILE_ERROR',
      compileSuccess: false,
      compilerError: "solution.cpp: In function 'int solve(const std::vector<int>&, long long int)':\nsolution.cpp:7:5: error: expected ';' before '}' token",
      runtimeMs: 0,
      timedOut: false,
      passedTests: false,
      loopDepth: 1,
      code: `int solve(const vector<int>& arr, long long K) {
    long long sum = 0;
    int best = 0;
    for (int i = 0; i < (int)arr.size(); ++i) {
        sum += arr[i];
    }
    return best
}`
    },
    {
      studentId: 'sim_15',
      name: 'Varun Kapoor',
      clusterId: 'COMPILE_ERROR',
      compileSuccess: false,
      compilerError: "solution.cpp: In function 'int solve(const std::vector<int>&, long long int)':\nsolution.cpp:4:9: error: 'totalSum' was not declared in this scope",
      runtimeMs: 0,
      timedOut: false,
      passedTests: false,
      loopDepth: 1,
      code: `int solve(const vector<int>& arr, long long K) {
    int n = arr.size();
    for (int i = 0; i < n; ++i) {
        totalSum += arr[i];
    }
    return 0;
}`
    },

    // 3 WRONG_ANSWER
    {
      studentId: 'sim_16',
      name: 'Riya Sen',
      clusterId: 'WRONG_ANSWER',
      compileSuccess: true,
      compilerError: '',
      passedTests: false,
      timedOut: false,
      runtimeMs: randomInt(3, 8),
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int left = 0, best = 0;
    long long windowSum = 0;
    for (int right = 0; right < (int)arr.size(); ++right) {
        windowSum += arr[right];
        while (windowSum > K && left < right) windowSum -= arr[left++];
        best = max(best, right - left);
    }
    return best;
}`
    },
    {
      studentId: 'sim_17',
      name: 'Kunal Bhatia',
      clusterId: 'WRONG_ANSWER',
      compileSuccess: true,
      compilerError: '',
      passedTests: false,
      timedOut: false,
      runtimeMs: randomInt(3, 8),
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int left = 0, best = 0;
    long long windowSum = 0;
    for (int right = 0; right < (int)arr.size(); ++right) {
        windowSum += arr[right];
        while (windowSum >= K && left <= right) windowSum -= arr[left++];
        best = max(best, right - left + 1);
    }
    return best;
}`
    },
    {
      studentId: 'sim_18',
      name: 'Shreya Chatterjee',
      clusterId: 'WRONG_ANSWER',
      compileSuccess: true,
      compilerError: '',
      passedTests: false,
      timedOut: false,
      runtimeMs: randomInt(3, 8),
      loopDepth: 2,
      code: `int solve(const vector<int>& arr, long long K) {
    int left = 0, best = 0;
    long long windowSum = 0;
    for (int right = 0; right < (int)arr.size(); ++right) {
        windowSum += arr[right];
        if (windowSum > K) {
            left = right;
            windowSum = arr[right];
        }
        best = max(best, right - left + 1);
    }
    return best;
}`
    },

    // 6 OPTIMAL_ON
    {
      studentId: 'sim_19',
      name: 'Harshit Saxena',
      clusterId: 'OPTIMAL_ON',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      timedOut: false,
      runtimeMs: randomInt(2, 5),
      loopDepth: 2,
      code: optimalSlidingWindowCode
    },
    {
      studentId: 'sim_20',
      name: 'Meera Pillai',
      clusterId: 'OPTIMAL_ON',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      timedOut: false,
      runtimeMs: randomInt(2, 5),
      loopDepth: 2,
      code: optimalSlidingWindowCode
    },
    {
      studentId: 'sim_21',
      name: 'Yash Singhania',
      clusterId: 'OPTIMAL_ON',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      timedOut: false,
      runtimeMs: randomInt(2, 5),
      loopDepth: 2,
      code: optimalSlidingWindowCode
    },
    {
      studentId: 'sim_22',
      name: 'Kritika Menon',
      clusterId: 'OPTIMAL_ON',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      timedOut: false,
      runtimeMs: randomInt(2, 5),
      loopDepth: 2,
      code: optimalSlidingWindowCode
    },
    {
      studentId: 'sim_23',
      name: 'Arjun Nair',
      clusterId: 'OPTIMAL_ON',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      timedOut: false,
      runtimeMs: randomInt(2, 5),
      loopDepth: 2,
      code: optimalSlidingWindowCode
    },
    {
      studentId: 'sim_24',
      name: 'Ishaan Choudhury',
      clusterId: 'OPTIMAL_ON',
      compileSuccess: true,
      compilerError: '',
      passedTests: true,
      timedOut: false,
      runtimeMs: randomInt(2, 5),
      loopDepth: 2,
      code: optimalSlidingWindowCode
    }
  ];

  return students.map(s => ({
    ...s,
    roomId: 'CU-DSA-101',
    isSimulated: true,
    timestamp: Date.now()
  }));
}

function toPayload(student, customCode) {
  return {
    roomId: 'CU-DSA-101',
    studentId: student.studentId,
    name: student.name,
    isSimulated: true,
    code: customCode !== undefined ? customCode : student.code,
    compileSuccess: student.compileSuccess,
    compilerError: student.compilerError,
    runtimeMs: student.runtimeMs,
    timedOut: student.timedOut,
    passedTests: student.passedTests,
    loopDepth: student.loopDepth,
    timestamp: Date.now()
  };
}

let students = [];
let activeTimers = [];
let jitterInterval = null;

function clearAllTimers() {
  activeTimers.forEach(clearTimeout);
  activeTimers = [];
  if (jitterInterval) {
    clearInterval(jitterInterval);
    jitterInterval = null;
  }
}

function flipStudent(student) {
  if (student.studentId === 'stu_live_1') return;

  Object.assign(student, {
    roomId: 'CU-DSA-101',
    clusterId: 'OPTIMAL_ON',
    code: optimalSlidingWindowCode,
    runtimeMs: randomInt(2, 5),
    timedOut: false,
    passedTests: true,
    compileSuccess: true,
    compilerError: '',
    loopDepth: 2,
    timestamp: Date.now()
  });

  socket.emit('code_update', toPayload(student));
  console.log(`[simulator] Flipped ${student.studentId} (${student.name}) -> OPTIMAL_ON`);
}

function startJitterInterval() {
  if (jitterInterval) clearInterval(jitterInterval);
  jitterInterval = setInterval(() => {
    const candidates = students.filter(s => s.compileSuccess === true && s.timedOut === false);
    if (candidates.length === 0) return;

    const candidate = candidates[randomInt(0, candidates.length - 1)];

    let minMs = 2;
    let maxMs = 5;
    if (candidate.clusterId === 'WRONG_ANSWER') {
      minMs = 3;
      maxMs = 8;
    } else if (candidate.clusterId === 'QUADRATIC_TLE') {
      minMs = 680;
      maxMs = 1420;
    }

    const jitterMultiplier = 1 + (Math.random() * 0.10 - 0.05);
    let newMs = Math.round(candidate.runtimeMs * jitterMultiplier);
    if (newMs < minMs) newMs = minMs;
    if (newMs > maxMs) newMs = maxMs;

    candidate.runtimeMs = newMs;
    candidate.timestamp = Date.now();

    socket.emit('code_update', toPayload(candidate));
  }, 4000);
}

const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('Simulator connected to http://localhost:4000');
  clearAllTimers();
  socket.emit('join_room', { roomId: 'CU-DSA-101', role: 'student' });
  students = createInitialStudents();

  students.forEach((student, index) => {
    const timer = setTimeout(() => {
      if (student.clusterId !== 'OPTIMAL_ON') {
        const preliminaryAttempts = randomInt(0, 3);
        for (let k = 1; k <= preliminaryAttempts; k++) {
          const attemptPayload = toPayload(student, `// attempt ${k}\n` + student.code);
          socket.emit('code_update', attemptPayload);
        }
      }
      socket.emit('code_update', toPayload(student));
    }, index * 80);
    activeTimers.push(timer);
  });

  const seedingDoneTimer = setTimeout(() => {
    startJitterInterval();
  }, students.length * 80 + 100);
  activeTimers.push(seedingDoneTimer);
});

socket.on('instructor_hint', (payload) => {
  if (!payload) return;
  const { targetStudentId, targetClusterId } = payload;

  if (targetStudentId) {
    if (targetStudentId.startsWith('sim_')) {
      const target = students.find(s => s.studentId === targetStudentId);
      if (target && target.clusterId !== 'OPTIMAL_ON') {
        const timer = setTimeout(() => {
          if (target.clusterId !== 'OPTIMAL_ON') {
            flipStudent(target);
          }
        }, 1500);
        activeTimers.push(timer);
      }
    }
    return;
  }

  if (targetClusterId && targetClusterId !== 'OPTIMAL_ON') {
    const matchingStudents = students.filter(s => s.clusterId === targetClusterId);
    const shuffled = matchingStudents.slice().sort(() => Math.random() - 0.5);
    const toFlip = shuffled.slice(0, 8);

    toFlip.forEach((st, idx) => {
      const timer = setTimeout(() => {
        if (st.clusterId !== 'OPTIMAL_ON') {
          flipStudent(st);
        }
      }, (idx + 1) * 550);
      activeTimers.push(timer);
    });
  }
});
