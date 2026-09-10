const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.E2E_PORT || 3110;
const LOG_FILE = path.join(__dirname, '..', 'e2e-server.log');

/**
 * Find and kill orphaned E2E server on port 3110.
 * Only kills Node processes running start-e2e-server.js.
 */
async function clearOrphanedServer() {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr ":${PORT}" | findstr "LISTENING"`, (err, stdout) => {
      if (err || !stdout.trim()) { resolve(); return; }

      const lines = stdout.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') pids.add(pid);
      }
      if (pids.size === 0) { resolve(); return; }

      // Verify each PID is a Node process running our E2E server
      // Use tasklist to check each PID's command line
      const pidsList = [...pids];
      const safePids = new Set();
      const checkPid = (idx) => {
        if (idx >= pidsList.length) {
          // All PIDs checked
          if (safePids.size === 0) {
            // All PIDs are gone - port should be free now. Just resolve.
            console.log(`[global-setup] All PIDs on port ${PORT} have exited. Port should be free.`);
            setTimeout(resolve, 500);
            return;
          }
          console.log(`[global-setup] Clearing orphaned E2E server(s) on port ${PORT}: ${[...safePids].join(', ')}`);
          const killCmd = [...safePids].map(p => `taskkill /F /PID ${p}`).join(' & ');
          exec(killCmd, () => {
            setTimeout(resolve, 500);
          });
          return;
        }
        const pid = pidsList[idx];
        exec(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, (err3, stdout3) => {
          // Process already gone - just skip it, port will be free
          if (err3 || !stdout3.trim()) { 
            console.log(`[global-setup] PID ${pid} no longer exists, skipping`);
            checkPid(idx + 1); 
            return; 
          }
          const line = stdout3.trim();
          // CSV format: "name","pid","session","mem"
          const match = line.match(/^"([^"]+)","(\d+)"/);
          if (match) {
            const name = match[1];
            if (name === 'node.exe' || name === 'node') {
              // Check if it's our E2E server by looking at command line via wmic
              exec(`wmic process where "ProcessId=${pid}" get CommandLine /value 2>nul`, (err4, stdout4) => {
                if (!err4 && stdout4.includes('start-e2e-server.js')) {
                  safePids.add(pid);
                }
                checkPid(idx + 1);
              });
              return;
            }
          }
          checkPid(idx + 1);
        });
      };
      checkPid(0);
    });
  });
}

/**
 * Wait until the server responds on the health endpoint.
 */
function waitForServer(url, timeoutMs = 120000) {
  const http = require('http');
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function tryConnect() {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server did not start within ${timeoutMs}ms`));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
    }
    tryConnect();
  });
}

module.exports = async function globalSetup() {
  // Step 1: Clear any orphaned server
  await clearOrphanedServer();

  // Step 2: Delete stale storage state
  const storageStatePath = path.join(__dirname, '..', 'e2e-storage-state.json');
  if (fs.existsSync(storageStatePath)) {
    fs.unlinkSync(storageStatePath);
  }

  // Step 3: Start the E2E server as a child process
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'w' });
  logStream.on('open', () => {
    console.log(`[global-setup] Log file opened: ${LOG_FILE}`);
  });
  
  const serverProcess = spawn('node', [path.join(__dirname, 'start-e2e-server.js')], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  // Pipe server output to log file
  serverProcess.stdout.pipe(logStream);
  serverProcess.stderr.pipe(logStream);

  // Store PID for teardown
  const pidFile = path.join(__dirname, '..', '.e2e-server-pid');
  fs.writeFileSync(pidFile, String(serverProcess.pid));

  console.log(`[global-setup] E2E server started (PID: ${serverProcess.pid})`);

  // Step 4: Wait for server to be ready
  try {
    await waitForServer(`http://localhost:${PORT}`);
    console.log(`[global-setup] E2E server ready on port ${PORT}`);
  } catch (err) {
    console.error(`[global-setup] Server failed to start: ${err.message}`);
    console.error(fs.readFileSync(LOG_FILE, 'utf8'));
    serverProcess.kill();
    throw err;
  }
};
