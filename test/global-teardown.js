const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PID_FILE = path.join(__dirname, '..', '.e2e-server-pid');

module.exports = async function globalTeardown() {
  // Kill the server process via PID file
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
    fs.unlinkSync(PID_FILE);

    if (pid && !isNaN(pid)) {
      exec(`taskkill /F /PID ${pid} 2>nul || exit 0`, (err) => {
        if (err) {
          console.log(`[global-teardown] Process ${pid} may have already exited`);
        } else {
          console.log(`[global-teardown] Killed E2E server (PID: ${pid})`);
        }
      });
    }
  }

  // Clean up any orphaned E2E servers that might have been spawned
  const PORT = process.env.E2E_PORT || 3110;
  exec(`netstat -ano | findstr ":${PORT}" | findstr "LISTENING"`, (err, stdout) => {
    if (err || !stdout.trim()) return;
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }
    if (pids.size === 0) return;
    console.log(`[global-teardown] Clearing orphaned E2E server(s) on port ${PORT}: ${[...pids].join(', ')}`);
    const killCmd = [...pids].map(p => `taskkill /F /PID ${p}`).join(' & ');
    exec(killCmd, () => {});
  });
};
