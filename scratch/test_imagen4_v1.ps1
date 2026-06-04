$apiKey = $env:GEMINI_API_KEY; if (-not $apiKey) { throw 'Set GEMINI_API_KEY environment variable.' }
$url = "https://generativelanguage.googleapis.com/v1/models/imagen-4.0-generate-001:generateImages?key=$apiKey"
$body = @{
  prompt = "A cinematic shot of a stone castle on a mountain, high detail"
  numberOfImages = 1
  outputMimeType = "image/jpeg"
  aspectRatio = "16:9"
} | ConvertTo-Json -Depth 5

try {
  $response = Invoke-RestMethod -Uri $url -Method Post -Headers @{ "Content-Type" = "application/json" } -Body $body
  Write-Host "SUCCESS!"
  if ($response.generatedImages) {
    Write-Host "Images count: $($response.generatedImages.Count)"
    Write-Host "Base64 starts with: $($response.generatedImages[0].image.imageBytes.Substring(0, 50))"
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
