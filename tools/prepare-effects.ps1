$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot -Parent
$source=Join-Path $root 'vendor/cethiel-slash/Classic'
$output=Join-Path $root 'public/assets/effects'
New-Item -ItemType Directory -Force $output | Out-Null
$atlas=New-Object System.Drawing.Bitmap(768,800)
$g=[System.Drawing.Graphics]::FromImage($atlas)
$g.Clear([System.Drawing.Color]::Transparent)
$g.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$frames=@{}
for($row=1;$row -le 5;$row++){
 $files=Get-ChildItem (Join-Path $source $row) -Filter '*.png' | Sort-Object Name
 for($col=0;$col -lt $files.Count;$col++){
  $image=[System.Drawing.Image]::FromFile($files[$col].FullName)
  if($image.Width -gt 128 -or $image.Height -gt 160){throw 'Unexpected frame size'}
  $x=$col*128;$y=($row-1)*160
  $g.DrawImageUnscaled($image,$x,$y)
  $frames["slash-$row-$col"]=@{frame=@{x=$x;y=$y;w=128;h=160};rotated=$false;trimmed=$false;sourceSize=@{w=128;h=160};spriteSourceSize=@{x=0;y=0;w=128;h=160}}
  $image.Dispose()
 }
}
$g.Dispose()
$atlas.Save((Join-Path $output 'slash.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$atlas.Dispose()
@{frames=$frames;meta=@{author='Cethiel';license='CC0';source='https://opengameart.org/content/weapon-slash-effect'}} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $output 'slash.json')

