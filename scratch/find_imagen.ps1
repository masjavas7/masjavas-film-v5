$apiKey = $env:GEMINI_API_KEY; if (-not $apiKey) { throw 'Set GEMINI_API_KEY environment variable.' }
$url = "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey"

try {
  $response = Invoke-RestMethod -Uri $url -Method Get
  Write-Host "SUCCESS!"
  $response.models | Where-Object { $_.name -match "imagen" } | Select-Object name
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
}
