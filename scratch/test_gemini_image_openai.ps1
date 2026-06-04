$apiKey = $env:GEMINI_API_KEY; if (-not $apiKey) { throw 'Set GEMINI_API_KEY environment variable.' }
$url = "https://generativelanguage.googleapis.com/v1beta/openai/images/generations"
$body = @{
  model = "imagen-4.0-generate-001"
  prompt = "A cinematic shot of a stone castle on a mountain, high detail"
  n = 1
  size = "1024x1024"
  response_format = "b64_json"
} | ConvertTo-Json -Depth 5

try {
  $response = Invoke-RestMethod -Uri $url -Method Post -Headers @{ 
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json" 
  } -Body $body -TimeoutSec 120
  Write-Host "SUCCESS!"
  if ($response.data) {
    Write-Host "Data count: $($response.data.Count)"
    Write-Host "b64_json starts with: $($response.data[0].b64_json.Substring(0, 50))"
  } else {
    $response | ConvertTo-Json -Depth 3
  }
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response Body: $responseBody"
  }
}
