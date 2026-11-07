# =========================================================
# generar-iconos.ps1 — crea los íconos PNG de la app (solo se usa al desarrollar)
# =========================================================
# iOS necesita íconos PNG (no acepta SVG para la pantalla de inicio).
# Este script dibuja el mismo diseño que icons/icono.svg usando .NET,
# que ya viene con Windows, así que no hay que instalar nada.
#
# Uso (desde la carpeta del proyecto):
#   powershell -ExecutionPolicy Bypass -File tools/generar-iconos.ps1

Add-Type -AssemblyName System.Drawing

$carpeta = Join-Path $PSScriptRoot "..\icons"
$indigo = [System.Drawing.Color]::FromArgb(255, 79, 70, 229)

function Nuevo-Icono([int]$tam, [double]$escala, [string]$archivo) {
    # $escala < 1 achica el dibujo para dejar margen (íconos "maskable" de Android)
    $bmp = New-Object System.Drawing.Bitmap $tam, $tam
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Fondo cuadrado completo: iOS y Android redondean las esquinas por su cuenta
    $g.Clear($indigo)

    $k = $tam / 512.0 * $escala          # factor para pasar de 512 px al tamaño real
    $centro = $tam / 2.0
    $lapiz = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), (34 * $k)

    # Círculo
    $r = 150 * $k
    $g.DrawEllipse($lapiz, [single]($centro - $r), [single]($centro - $r), [single](2 * $r), [single](2 * $r))

    # Check (mismas coordenadas que el SVG, relativas al centro 256,256)
    $lapiz.Width = 40 * $k
    $lapiz.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lapiz.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lapiz.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $puntos = @(
        (New-Object System.Drawing.PointF ([single]($centro + (190 - 256) * $k)), ([single]($centro + (262 - 256) * $k))),
        (New-Object System.Drawing.PointF ([single]($centro + (236 - 256) * $k)), ([single]($centro + (308 - 256) * $k))),
        (New-Object System.Drawing.PointF ([single]($centro + (328 - 256) * $k)), ([single]($centro + (204 - 256) * $k)))
    )
    $g.DrawLines($lapiz, $puntos)

    $ruta = Join-Path $carpeta $archivo
    $bmp.Save($ruta, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $lapiz.Dispose()
    Write-Output "Creado $archivo"
}

Nuevo-Icono 180 1.0 "icon-180.png"           # apple-touch-icon (iPhone)
Nuevo-Icono 192 1.0 "icon-192.png"
Nuevo-Icono 512 1.0 "icon-512.png"
Nuevo-Icono 512 0.8 "icon-maskable-512.png"  # con margen extra para Android
