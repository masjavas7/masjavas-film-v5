$jobId = "vid_job_4213d62348fa16391d9675bb"
$url = "https://www.grokpi.masjavas.my.id/v1/video/generations/$jobId"
$grokKey = $env:GROKPI_API_KEY; if (-not $grokKey) { throw 'Set GROKPI_API_KEY environment variable.' }

try {
  $response = Invoke-RestMethod -Uri $url -Method Get -Headers @{ 
    "Authorization" = "Bearer $grokKey"
  }
  Write-Host "SUCCESS!"
  $response | ConvertTo-Json -Depth 3
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
}
