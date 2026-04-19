param(
  [string]$ProjectRef = "kypvylnyugmiukobsjoi",
  [string]$Origin = "https://condominioguest.vercel.app"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$functionsDir = Join-Path $repoRoot "supabase/functions"
if (-not (Test-Path $functionsDir)) {
  throw "Diretorio supabase/functions nao encontrado em $repoRoot. Execute o script dentro do repositorio condogest."
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  throw "SUPABASE_ACCESS_TOKEN nao definido. Defina o token e tente novamente. Exemplo: `$env:SUPABASE_ACCESS_TOKEN='seu_token'"
}

$functions = @("create-user", "delete-user", "update-role", "send-urgent-occurrence-email")
$baseUrl = "https://$ProjectRef.supabase.co/functions/v1"

Write-Host "Deploy de Edge Functions para projeto: $ProjectRef" -ForegroundColor Cyan

foreach ($fn in $functions) {
  Write-Host "[DEPLOY] $fn" -ForegroundColor Yellow
  npx supabase functions deploy $fn --project-ref $ProjectRef --no-verify-jwt
  if ($LASTEXITCODE -ne 0) {
    throw "Falha no deploy da funcao $fn"
  }
}

Write-Host "Validacao de endpoints (OPTIONS preflight)..." -ForegroundColor Cyan

$headers = @{
  Origin = $Origin
  "Access-Control-Request-Method" = "POST"
  "Access-Control-Request-Headers" = "authorization,content-type,apikey"
}

$validationFailed = $false

foreach ($fn in $functions) {
  $url = "$baseUrl/$fn"
  try {
    $response = Invoke-WebRequest -Uri $url -Method Options -Headers $headers
    if ($response.StatusCode -eq 200) {
      Write-Host "[OK] $fn -> HTTP 200" -ForegroundColor Green
    } else {
      Write-Host "[ERRO] $fn -> HTTP $($response.StatusCode)" -ForegroundColor Red
      $validationFailed = $true
    }
  } catch {
    $statusCode = "desconhecido"
    $responseBody = ""

    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
      } catch {
        $statusCode = "desconhecido"
      }

      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $responseBody = $reader.ReadToEnd()
          $reader.Dispose()
        }
      } catch {
        $responseBody = ""
      }
    }

    Write-Host "[ERRO] $fn -> HTTP $statusCode" -ForegroundColor Red
    if ($responseBody) {
      Write-Host "Resposta: $responseBody" -ForegroundColor DarkRed
    }
    $validationFailed = $true
  }
}

if ($validationFailed) {
  throw "Uma ou mais funcoes falharam na validacao."
}

Write-Host "Deploy e validacao concluidos com sucesso." -ForegroundColor Green
