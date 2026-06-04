try {
  $url = "https://image.pollinations.ai/prompt/test-cinematic-castle?width=1024&height=1024&nologo=true&private=true"
  $dest = "C:\Users\DELL\Documents\masjavas\APLIKASI MASJAVAS FILM V5\APLIKASI MASJAVAS FILM V5\scratch\test_pollinations.png"
  Invoke-RestMethod -Uri $url -OutFile $dest -TimeoutSec 15
  Write-Host "SUCCESS!"
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
}
