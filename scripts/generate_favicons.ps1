Add-Type -AssemblyName System.Drawing;

function Draw-ApertureFavicon([int]$size, [string]$outputPath, [bool]$isApple) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($isApple) {
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#09090b'))
        $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    $padding = $size * 0.12
    $strokeWidth = [Math]::Max(1.8, $size * 0.085)
    $diameter = $size - (2 * $padding)
    $x = $padding
    $y = $padding

    $ringColor = [System.Drawing.ColorTranslator]::FromHtml('#3f3f46')
    $emberColor = [System.Drawing.ColorTranslator]::FromHtml('#ff6b4a')

    $penRing = New-Object System.Drawing.Pen($ringColor, $strokeWidth)
    $g.DrawEllipse($penRing, [float]$x, [float]$y, [float]$diameter, [float]$diameter)

    $penEmber = New-Object System.Drawing.Pen($emberColor, $strokeWidth)
    $penEmber.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penEmber.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($penEmber, [float]$x, [float]$y, [float]$diameter, [float]$diameter, 270.0, 90.0)

    $dotRadius = [Math]::Max(1.8, $size * 0.13)
    $dotX = ($size / 2) - $dotRadius
    $dotY = ($size / 2) - $dotRadius
    $dotDiameter = $dotRadius * 2
    $brushEmber = New-Object System.Drawing.SolidBrush($emberColor)
    $g.FillEllipse($brushEmber, [float]$dotX, [float]$dotY, [float]$dotDiameter, [float]$dotDiameter)

    $g.Dispose()
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated: $outputPath ($size x $size)"
}

Draw-ApertureFavicon -size 16 -outputPath 'd:\MyWeb\Night Lore\public\favicon-16x16.png' -isApple $false
Draw-ApertureFavicon -size 32 -outputPath 'd:\MyWeb\Night Lore\public\favicon-32x32.png' -isApple $false
Draw-ApertureFavicon -size 180 -outputPath 'd:\MyWeb\Night Lore\public\apple-touch-icon.png' -isApple $true
