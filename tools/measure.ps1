Add-Type -AssemblyName System.Drawing
foreach ($p in @(
    'C:\Users\Pc\Desktop\HorseRace\assets\botones\botones.png',
    'C:\Users\Pc\Desktop\HorseRace\assets\fondos\fondohorizontal.png',
    'C:\Users\Pc\Desktop\HorseRace\assets\fondos\fondovertical.png'
)) {
    $img = [System.Drawing.Image]::FromFile($p)
    Write-Output ("{0}: {1} x {2}" -f (Split-Path $p -Leaf), $img.Width, $img.Height)
    $img.Dispose()
}
