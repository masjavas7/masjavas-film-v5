/**
 * test_real_export.js
 * Trigger real export job for project-123 using the approved scene video and poll status.
 */

const BASE = 'http://localhost:3000';
const projectId = 'project-123';
const approvedSceneIds = ['scene-1-1780220684614'];

async function main() {
  console.log('----------------------------------------------------');
  console.log(`Starting real export job for project ${projectId}...`);
  console.log(`Approved Scenes: ${JSON.stringify(approvedSceneIds)}`);
  console.log('----------------------------------------------------');

  const startRes = await fetch(`${BASE}/api/projects/${projectId}/export/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      approvedSceneIds,
      strategy: 'fit_blur',
      includeSubtitle: true
    })
  });

  if (!startRes.ok) {
    const errText = await startRes.text();
    console.error(`Failed to start job: HTTP ${startRes.status} - ${errText}`);
    process.exit(1);
  }

  const job = await startRes.json();
  const jobId = job.jobId;
  console.log(`Job successfully created: ${jobId}`);
  console.log(`Initial Status: ${job.status}, Progress: ${job.progress}%`);

  console.log('\nPolling job status...');
  const maxPolls = 60;
  for (let i = 0; i < maxPolls; i++) {
    const statusRes = await fetch(`${BASE}/api/projects/${projectId}/export/jobs/${jobId}`);
    if (!statusRes.ok) {
      console.error(`Failed to get status: HTTP ${statusRes.status}`);
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    const status = await statusRes.json();
    console.log(`[Poll #${i+1}] Status: ${status.status} (${status.progress}%) - ${status.progressMessage || ''}`);
    
    if (status.warnings && status.warnings.length > 0) {
      console.log(`  Warnings: ${JSON.stringify(status.warnings)}`);
    }

    if (status.status === 'completed') {
      console.log('\n====================================================');
      console.log('🎉 EXPORT JOB COMPLETED SUCCESSFULLY!');
      console.log(`Download ZIP: ${status.packageZipUrl}`);
      console.log(`Download Video: ${status.mp4Url}`);
      console.log(`Download SRT: ${status.subtitleUrl}`);
      console.log('====================================================');
      break;
    } else if (status.status === 'failed') {
      console.error(`\n❌ Export job failed: ${status.errorMessage}`);
      process.exit(1);
    } else if (status.status === 'canceled') {
      console.log(`\n⚠️ Job was canceled.`);
      process.exit(0);
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

main().catch(err => {
  console.error('Fatal error running export test:', err);
  process.exit(1);
});
