import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const installedExe = 'C:\\Users\\Masjavas\\AppData\\Local\\Programs\\MASJAVAS AI\\MASJAVAS AI.exe';
const appDataDir = 'C:\\Users\\Masjavas\\AppData\\Roaming\\MASJAVAS AI';

async function testFullFlow() {
  console.log("=== STARTING INSTALLED APP FULL FLOW QA ===");
  console.log(`Executable: ${installedExe}`);
  console.log(`AppData Dir: ${appDataDir}`);

  // Start app
  const child = spawn(installedExe, [], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  console.log("Waiting 8 seconds for Express server to boot...");
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Determine port
  const ports = [3000, 3001, 3002, 3010];
  let port = null;
  for (const p of ports) {
    try {
      const res = await fetch(`http://127.0.0.1:${p}/api/health`);
      if (res.ok) {
        port = p;
        break;
      }
    } catch (e) {}
  }

  if (!port) {
    console.error("❌ Failed to find running Express server port.");
    process.exit(1);
  }
  console.log(`✅ Express backend running on port: ${port}`);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Get Projects List (should be empty first)
    console.log("\n[Step 1] Fetching projects list...");
    const listRes = await fetch(`${baseUrl}/api/projects`);
    const listData = await listRes.json();
    console.log(`- Status: ${listRes.status}`);
    console.log(`- Projects:`, listData);

    // 2. Create Project
    console.log("\n[Step 2] Creating new project...");
    const projectId = `proj-test-${Date.now()}`;
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        title: 'Project Roro Jonggrang QA Test',
        aspectRatio: '16:9',
        orientation: 'landscape',
        resolutionPreset: '720p',
        durationPerSceneSec: 10
      })
    });
    const project = await createRes.json();
    console.log(`- Status: ${createRes.status}`);
    console.log(`- Created Project ID: ${project.id}`);
    console.log(`- Created Project Title: "${project.title}"`);

    // Verify file created in AppData projects folder
    const fileDir = path.join(appDataDir, 'data', 'projects');
    const filePath = path.join(fileDir, `${project.id}.json`);
    console.log(`- Checking physical file in AppData: ${filePath}`);
    const exists = fs.existsSync(filePath);
    console.log(`- File exists: ${exists}`);
    if (exists) {
      console.log(`- File content preview:`, fs.readFileSync(filePath, 'utf8').substring(0, 150) + "...");
    } else {
      throw new Error("Project file was not written to AppData projects folder!");
    }

    // 3. Save Project Snapshot
    console.log("\n[Step 3] Updating project via snapshot...");
    project.storyDraft = {
      ideaText: 'Candi sewu di bawah sinar rembulan malam.',
      selectedPlatform: 'YouTube 16:9',
      selectedDuration: '6 adegan',
      selectedStyle: 'Sinematik',
      narration: 'Maka terjadilah candi yang keseribu di pagi hari.'
    };
    project.title = 'Project Roro Jonggrang QA Test (Updated)';

    const snapshotRes = await fetch(`${baseUrl}/api/projects/${project.id}/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    });
    const snapshotResult = await snapshotRes.json();
    console.log(`- Status: ${snapshotRes.status}`);
    console.log(`- Snapshot Success: ${snapshotResult.success}`);

    // Verify backup file creation
    const backupPath = path.join(fileDir, `${project.id}.backup.json`);
    console.log(`- Checking backup file in AppData: ${backupPath}`);
    console.log(`- Backup exists: ${fs.existsSync(backupPath)}`);

    // 4. Reopen/Fetch Project
    console.log("\n[Step 4] Fetching/Reopening project...");
    const fetchRes = await fetch(`${baseUrl}/api/projects/${project.id}`);
    const fetchedProject = await fetchRes.json();
    console.log(`- Status: ${fetchRes.status}`);
    console.log(`- Reopened title: "${fetchedProject.title}"`);
    console.log(`- Reopened storyDraft ideaText: "${fetchedProject.storyDraft?.ideaText}"`);

    // 5. Delete Project
    console.log("\n[Step 5] Deleting project...");
    const deleteRes = await fetch(`${baseUrl}/api/projects/${project.id}`, {
      method: 'DELETE'
    });
    const deleteResult = await deleteRes.json();
    console.log(`- Status: ${deleteRes.status}`);
    console.log(`- Delete success: ${deleteResult.success}`);

    // Verify files deleted in AppData
    console.log(`- Checking if main file is deleted: ${!fs.existsSync(filePath)}`);
    console.log(`- Checking if backup file is deleted: ${!fs.existsSync(backupPath)}`);

  } catch (err) {
    console.error("❌ Test flow encountered error:", err);
  } finally {
    // Terminate app
    try {
      process.kill(child.pid);
      console.log("\nTerminated installed app process successfully.");
    } catch (e) {}
  }
}

testFullFlow();
