# Локальный сервер для mygameio (Windows / PowerShell)
# Запуск: powershell -ExecutionPolicy Bypass -File serve.ps1
# Затем откройте http://localhost:8765
$root = (Get-Location).Path
if (-not (Test-Path (Join-Path $root "index.html"))) {
  Write-Host "index.html не найден в $root - запустите скрипт из папки игры" -ForegroundColor Red
  exit 1
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8765/")
$listener.Start()
$types = @{ ".html"="text/html; charset=utf-8"; ".js"="application/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8"; ".md"="text/markdown; charset=utf-8"; ".png"="image/png"; ".ico"="image/x-icon" }
Write-Host "Сервер запущен: http://localhost:8765 (Ctrl+C для остановки)" -ForegroundColor Green
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq "/") { $path = "/index.html" }
    $file = Join-Path $root ($path -replace '/', '\')
    $full = [IO.Path]::GetFullPath($file)
    if ($full.StartsWith([IO.Path]::GetFullPath($root)) -and (Test-Path $full -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full)
      $ctx.Response.ContentType = $types[$ext]
      if (-not $ctx.Response.ContentType) { $ctx.Response.ContentType = "application/octet-stream" }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $ctx.Response.StatusCode = 200
    } else {
      $msg = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $ctx.Response.StatusCode = 404
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
  } catch { }
}
