const express = require('express');
const http = require('http');
const cors = require('cors');
const crypto = require('crypto');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const CLUSTER_LABELS = {
  COMPILE_ERROR: 'Build Failure (Rejection Risk)',
  WRONG_ANSWER: 'Output Mismatch (Rejection Risk)',
  QUADRATIC_TLE: 'Over SLA: O(N^2) (>400ms)',
  OPTIMAL_ON: 'Pre-Flight Passed'
};

// State: rooms = Map<roomId, Map<studentId, record>>
const rooms = new Map();

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }
  return room;
}

function classify(payload) {
  if (!payload.compileSuccess) {
    return 'COMPILE_ERROR';
  }
  if (payload.timedOut) {
    return 'QUADRATIC_TLE';
  }
  if (!payload.passedTests) {
    return 'WRONG_ANSWER';
  }
  if (payload.runtimeMs > 400) {
    return 'QUADRATIC_TLE';
  }
  return 'OPTIMAL_ON';
}

function buildRoomState(roomId) {
  const roomMap = rooms.get(roomId);
  const allRecords = roomMap ? Array.from(roomMap.values()) : [];

  let liveCount = 0;
  let simulatedCount = 0;
  const clusters = {
    COMPILE_ERROR: { count: 0, label: CLUSTER_LABELS.COMPILE_ERROR },
    WRONG_ANSWER: { count: 0, label: CLUSTER_LABELS.WRONG_ANSWER },
    QUADRATIC_TLE: { count: 0, label: CLUSTER_LABELS.QUADRATIC_TLE },
    OPTIMAL_ON: { count: 0, label: CLUSTER_LABELS.OPTIMAL_ON }
  };

  for (const record of allRecords) {
    if (record.online) {
      if (record.isSimulated) {
        simulatedCount++;
      } else {
        liveCount++;
      }
      if (clusters[record.clusterId]) {
        clusters[record.clusterId].count++;
      }
    }
  }

  const students = allRecords.slice().sort((a, b) => {
    // isSimulated false first
    const simA = a.isSimulated ? 1 : 0;
    const simB = b.isSimulated ? 1 : 0;
    if (simA !== simB) {
      return simA - simB;
    }
    // errorStreak descending
    const streakA = typeof a.errorStreak === 'number' ? a.errorStreak : 0;
    const streakB = typeof b.errorStreak === 'number' ? b.errorStreak : 0;
    if (streakB !== streakA) {
      return streakB - streakA;
    }
    // studentId ascending
    return String(a.studentId).localeCompare(String(b.studentId));
  });

  return {
    roomId,
    liveCount,
    simulatedCount,
    students,
    clusters
  };
}

function broadcast(roomId) {
  io.to('instructors:' + roomId).emit('room_state', buildRoomState(roomId));
}

io.on('connection', (socket) => {
  socket.data = socket.data || {};

  socket.on('join_room', (payload) => {
    const { roomId, role } = payload || {};
    if (!roomId) return;

    socket.data.roomId = roomId;

    if (role === 'instructor') {
      socket.join('instructors:' + roomId);
      socket.emit('room_state', buildRoomState(roomId));
    } else {
      socket.join(roomId);
    }

    console.log(`[join] socket=${socket.id} room=${roomId} role=${role}`);
  });

  socket.on('code_update', (payload) => {
    if (!payload || !payload.roomId || !payload.studentId) return;

    socket.join(payload.roomId);
    socket.data.roomId = payload.roomId;

    const room = getOrCreateRoom(payload.roomId);
    const prevRecord = room.get(payload.studentId);

    const editIterations = !prevRecord ? 1 : (payload.code !== prevRecord.code ? (prevRecord.editIterations || 1) + 1 : (prevRecord.editIterations || 1));
    const proofHash = payload.proofHash || ('log_' + crypto.createHash('sha256').update(payload.studentId + ':' + (payload.code || '') + ':' + editIterations).digest('hex').slice(0, 12));

    const clusterId = classify(payload);
    const highConfidenceQuadratic = clusterId === 'QUADRATIC_TLE' && Boolean(payload.loopDepth >= 2);

    let errorStreak = 0;
    if (clusterId === 'OPTIMAL_ON') {
      errorStreak = 0;
    } else if (!prevRecord || payload.code !== prevRecord.code) {
      const prevStreak = prevRecord && typeof prevRecord.errorStreak === 'number' ? prevRecord.errorStreak : 0;
      errorStreak = prevStreak + 1;
    } else {
      errorStreak = prevRecord && typeof prevRecord.errorStreak === 'number' ? prevRecord.errorStreak : 1;
    }

    const { clusterId: _clientClusterId, ...cleanPayload } = payload;

    const record = {
      ...cleanPayload,
      clusterId,
      errorStreak,
      highConfidenceQuadratic,
      editIterations,
      proofHash,
      online: true,
      socketId: socket.id
    };

    room.set(payload.studentId, record);

    broadcast(payload.roomId);

    console.log(`[code_update] room=${payload.roomId} student=${payload.studentId} cluster=${clusterId} streak=${errorStreak}`);
  });

  socket.on('send_hint', (payload) => {
    if (!payload || !payload.roomId) return;

    const hintPayload = {
      ...payload,
      sentAt: Date.now()
    };

    io.to(payload.roomId).emit('instructor_hint', hintPayload);

    console.log(`[send_hint] room=${payload.roomId} targetCluster=${payload.targetClusterId} targetStudent=${payload.targetStudentId}`);
  });

  socket.on('disconnect', () => {
    for (const roomMap of rooms.values()) {
      for (const record of roomMap.values()) {
        if (record.socketId === socket.id) {
          record.online = false;
        }
      }
    }

    if (socket.data && socket.data.roomId) {
      broadcast(socket.data.roomId);
    }

    console.log(`[disconnect] socket=${socket.id} room=${socket.data && socket.data.roomId ? socket.data.roomId : 'none'}`);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`CodePulse server running on port ${PORT}`);
});
