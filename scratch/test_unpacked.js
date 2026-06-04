import { spawn } from 'child_process';

console.log("Starting MASJAVAS AI.exe from unpacked release...");
const child = spawn('release\\win-unpacked\\MASJAVAS AI.exe', [], {
  detached: true,
  stdio: 'ignore'
});

child.unref();

console.log("Waiting 8 seconds for the application and backend to initialize...");
setTimeout(async () => {
  const ports = [3000, 3001, 3002, 3010];
  let foundPort = null;
  let responseData = null;

  for (const port of ports) {
    try {
      console.log(`Checking health on port ${port}...`);
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) {
        foundPort = port;
        responseData = await res.json();
        break;
      }
    } catch (e) {
      // Ignore connection error
    }
  }

  if (foundPort) {
    console.log(`✅ Success! Express backend is running on port ${foundPort}`);
    console.log("Response:", JSON.stringify(responseData, null, 2));
  } else {
    console.error("❌ Failed to contact the backend server on any anticipated port.");
  }

  // Attempt to kill the child process if it's still attached, or let the user know
  try {
    process.kill(child.pid);
    console.log("Terminated desktop app process.");
  } catch (err) {
    // Process might have already detached or closed
  }
  process.exit(foundPort ? 0 : 1);
}, 8000);
