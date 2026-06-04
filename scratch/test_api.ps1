$body = @{
  model = "grok-imagine-1.0-video"
  messages = @(
    @{
      role = "user"
      content = "A wide cinematic shot of tropical forest, mist, ancient stone temple, film grain"
    }
  )
  video_config = @{
    aspect_ratio = "16:9"
    video_length = 10
    resolution_name = "720p"
    preset = "normal"
  }
} | ConvertTo-Json -Depth 5

$grokKey = $env:GROKPI_API_KEY; if (-not $grokKey) { throw 'Set GROKPI_API_KEY environment variable.' }

try {
  $response = Invoke-RestMethod -Uri "https://www.grokpi.masjavas.my.id/v1/video/generations" -Method Post -Headers @{ 
    "Authorization" = "Bearer $grokKey"
    "Content-Type" = "application/json" 
  } -Body $body -TimeoutSec 120
  Write-Host "SUCCESS!"
  $response | ConvertTo-Json -Depth 3
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  if ($_.ErrorDetails) {
    Write-Host "Details: $($_.ErrorDetails.Message)"
  }
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response Body: $responseBody"
  }
}
