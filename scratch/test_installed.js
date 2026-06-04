import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const installedExe = 'C:\\Users\\Masjavas\\AppData\\Local\\Programs\\MASJAVAS AI\\MASJAVAS AI.exe';
const appDataDir = 'C:\\Users\\Masjavas\\AppData\\Roaming\\MASJAVAS AI';

console.log("Checking if AppData directory exists before startup...");
const existsBefore = fs.existsSync(appDataDir);
console.log(`AppData directory exists before: ${existsBefore}`);

console.log(`Starting installed app from: ${installedExe}`);
const child = spawn(installedExe, [], {
  detached: true,
  stdio: 'ignore'
});
child.unref();

console.log("Waiting 8 seconds for application to boot up Express and register directories...");
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
      // Ignore
    }
  }

  if (foundPort) {
    console.log(`✅ Success! Installed application is running backend on port ${foundPort}`);
    console.log("Response:", JSON.stringify(responseData, null, 2));

    // Check AppData directory creation
    console.log("Verifying AppData directory after startup...");
    const existsAfter = fs.existsSync(appDataDir);
    console.log(`AppData directory exists after: ${existsAfter}`);
    if (existsAfter) {
      const contents = fs.readdirSync(appDataDir);
      console.log("AppData folder contents:", contents);

      const projectsPath = path.join(appDataDir, 'data', 'projects');
      if (fs.existsSync(projectsPath)) {
        console.log("Projects directory exists:", projectsPath);
        console.log("Projects folder contents:", fs.readdirSync(projectsPath));
      } else {
        console.log("❌ Projects directory was not created.");
      }

      // Check if config.json is created
      const configPath = path.join(appDataDir, 'config.json');
      console.log(`Checking if config.json exists: ${fs.existsSync(configPath)}`);
      if (fs.existsSync(configPath)) {
        console.log("config.json contents:", fs.readFileSync(configPath, 'utf8'));
      }
    } else {
      console.error("❌ AppData directory was not created!");
    }

    // Now test Settings REST endpoint save
    try {
      console.log("Testing POST /api/settings API Key update...");
      const saveRes = await fetch(`http://127.0.0.1:${foundPort}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'sk-testapikeyvalue1234567890',
          apiBaseUrl: 'https://api.grokpi.com/v1'
        })
      });
      if (saveRes.ok) {
        console.log("✅ Settings saved successfully!");
        const configPath = path.join(appDataDir, 'config.json');
        if (fs.existsSync(configPath)) {
          console.log("Updated config.json contents:", fs.readFileSync(configPath, 'utf8'));
        }

        // Verify get settings
        const getRes = await fetch(`http://127.0.0.1:${foundPort}/api/settings`);
        const settingsData = await getRes.json();
        console.log("Fetched Settings Response (should be masked):", settingsData);
      } else {
        console.error(`❌ Failed to save settings. Status: ${saveRes.status}`);
      }
    } catch (e) {
      console.error("❌ Error while testing settings save:", e.message);
    }

  } else {
    console.error("❌ Failed to contact the backend server on any port.");
  }

  // Terminate app
  try {
    process.kill(child.pid);
    console.log("Terminated installed app process.");
  } catch (err) {
    // Already exited or detached
  }

  process.exit(foundPort ? 0 : 1);
}, 8000);
