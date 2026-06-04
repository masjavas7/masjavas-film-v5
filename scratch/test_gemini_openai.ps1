$apiKey = $env:GEMINI_API_KEY; if (-not $apiKey) { throw 'Set GEMINI_API_KEY environment variable.' }
$url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
$body = @{
  model = "gemini-2.5-flash"
  messages = @(
    @{
      role = "user"
      content = "Say hello in one word."
    }
  )
  stream = $false
} | ConvertTo-Json -Depth 5

try {
  $response = Invoke-RestMethod -Uri $url -Method Post -Headers @{ 
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json" 
  } -Body $body
  Write-Host "SUCCESS!"
  $response.choices[0].message.content
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response Body: $responseBody"
  }
}
