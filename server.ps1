# Kleiner lokaler Webserver fuer die Setup-Seite (nur Windows-Bordmittel, kein Python noetig).
# Wird von start.bat aufgerufen. Beenden mit Strg+C oder Fenster schliessen.
# Hinweis: Diese Datei enthaelt absichtlich keine Umlaute (Kompatibilitaet mit Windows PowerShell 5.1).

$ErrorActionPreference = 'Stop'

try {
    $root = Split-Path -Parent $MyInvocation.MyCommand.Path
    $rootWithSep = $root.TrimEnd('\') + '\'

    $mime = @{
        '.html' = 'text/html; charset=utf-8'
        '.css'  = 'text/css; charset=utf-8'
        '.js'   = 'text/javascript; charset=utf-8'
        '.txt'  = 'text/plain; charset=utf-8'
        '.md'   = 'text/plain; charset=utf-8'
        '.json' = 'application/json; charset=utf-8'
        '.svg'  = 'image/svg+xml'
        '.png'  = 'image/png'
        '.jpg'  = 'image/jpeg'
        '.jpeg' = 'image/jpeg'
        '.gif'  = 'image/gif'
        '.webp' = 'image/webp'
        '.ico'  = 'image/x-icon'
        '.woff2' = 'font/woff2'
        '.zip'  = 'application/zip'
    }

    # Ersten freien Port zwischen 8080 und 8090 suchen
    $listener = $null
    $port = 0
    foreach ($p in 8080..8090) {
        $l = New-Object System.Net.HttpListener
        $l.Prefixes.Add("http://localhost:$p/")
        try {
            $l.Start()
            $listener = $l
            $port = $p
            break
        } catch {
            $l.Close()
        }
    }
    if (-not $listener) {
        throw 'Kein freier Port zwischen 8080 und 8090 gefunden. Bitte andere Programme schliessen und erneut versuchen.'
    }

    $url = "http://localhost:$port/"
    Write-Host ''
    Write-Host "  Seite laeuft auf $url"
    Write-Host '  Beenden: Strg+C druecken oder dieses Fenster schliessen.'
    Write-Host ''

    Start-Process $url

    try {
        while ($listener.IsListening) {
            # Asynchron warten, damit Strg+C jederzeit funktioniert
            $task = $listener.GetContextAsync()
            while (-not $task.AsyncWaitHandle.WaitOne(200)) { }
            $ctx = $task.GetAwaiter().GetResult()

            try {
                $reqPath = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
                if ($reqPath.EndsWith('/')) { $reqPath += 'index.html' }
                $rel = $reqPath.TrimStart('/').Replace('/', '\')
                $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))

                $inside = $full.StartsWith($rootWithSep, [StringComparison]::OrdinalIgnoreCase)
                if (-not $inside -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
                    $ctx.Response.StatusCode = 404
                    $bytes = [Text.Encoding]::UTF8.GetBytes('404 - nicht gefunden')
                } else {
                    $ext = [IO.Path]::GetExtension($full).ToLower()
                    if ($mime.ContainsKey($ext)) {
                        $ctx.Response.ContentType = $mime[$ext]
                    } else {
                        $ctx.Response.ContentType = 'application/octet-stream'
                    }
                    $bytes = [IO.File]::ReadAllBytes($full)
                }

                $ctx.Response.Headers.Add('Cache-Control', 'no-store')
                $ctx.Response.ContentLength64 = $bytes.Length
                $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                # Einzelne fehlgeschlagene Anfrage ignorieren (z. B. Browser bricht ab)
            } finally {
                $ctx.Response.Close()
            }
        }
    } finally {
        $listener.Stop()
        $listener.Close()
    }
} catch {
    Write-Host ''
    Write-Host '  FEHLER:' -ForegroundColor Red
    Write-Host ('  ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host ''
    exit 1
}
