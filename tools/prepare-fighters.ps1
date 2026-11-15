# Requires PowerShell on Windows. Run from any directory.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$vendor = Join-Path $root 'vendor/luizmelo'
$inputRoot = Join-Path $vendor 'extracted'
$previewRoot = Join-Path $vendor 'previews'
New-Item -ItemType Directory -Force -Path $inputRoot, $previewRoot | Out-Null

$common = [ordered]@{
  idle='Idle'; run='Run'; jump='Jump'; fall='Fall'; light='Attack1';
  heavy='Attack2'; hurt='Take Hit'; death='Death'
}
$ren = [ordered]@{} + $common
$ren.jump = 'Going Up'; $ren.fall = 'Going Down'; $ren.combo = 'Attack3'
$aria = [ordered]@{} + $common
$aria.hurt = 'Hit'
$packs = @(
  @{ id='kael'; slug='hero-knight'; dir='Hero Knight/Sprites'; size=180; height=180; clips=$common },
  @{ id='ren'; slug='martial-hero-3'; dir='Martial Hero 3/Sprite'; size=126; height=126; clips=$ren },
  @{ id='aria'; slug='wizard-pack'; dir='Wizard Pack'; size=231; height=190; clips=$aria },
  @{ id='darius'; slug='martial-hero'; dir='Martial Hero/Sprites'; size=200; height=200; clips=$common }
)
$fallbacks = [ordered]@{
  walk='run'; land='fall'; combo='heavy'; air='light';
  dash='run'; down='death'; recover='hurt'; special1='light'; special2='heavy'; victory='idle'
}
$utf8 = [System.Text.UTF8Encoding]::new($false)
foreach ($pack in $packs) {
  Expand-Archive -LiteralPath (Join-Path $vendor ($pack.slug + '.zip')) -DestinationPath $inputRoot -Force
  $images = @{}
  $rows = [Collections.Generic.List[object]]::new()
  $clips = [ordered]@{}
  $minX=$pack.size; $minY=$pack.height; $maxX=-1; $maxY=-1
  foreach ($name in $pack.clips.Keys) {
    $file = Join-Path $inputRoot ($pack.dir + '/' + $pack.clips[$name] + '.png')
    $image = [Drawing.Bitmap]::new($file)
    $images[$name] = $image
    if ($image.Height -ne $pack.height -or $image.Width % $pack.size -ne 0) {
      throw "Sheet size mismatch: $file"
    }
    $count = [int]($image.Width / $pack.size)
    $keys = @()
    for ($frame = 0; $frame -lt $count; $frame++) {
      $left=$pack.size; $top=$pack.height; $right=-1; $bottom=-1
      $sourceX = $frame * $pack.size
      for ($y=0; $y -lt $pack.height; $y++) {
        for ($x=0; $x -lt $pack.size; $x++) {
          if ($image.GetPixel($sourceX+$x,$y).A -eq 0) { continue }
          if ($x -lt $left) { $left=$x }; if ($x -gt $right) { $right=$x }
          if ($y -lt $top) { $top=$y }; if ($y -gt $bottom) { $bottom=$y }
        }
      }
      if ($right -lt 0 -or ($right-$left+1 -eq $pack.size -and $bottom-$top+1 -eq $pack.height)) {
        throw "Missing sprite or transparent border: $file, frame $frame"
      }
      if ($left -lt $minX) { $minX=$left }; if ($top -lt $minY) { $minY=$top }
      if ($right -gt $maxX) { $maxX=$right }; if ($bottom -gt $maxY) { $maxY=$bottom }
      $key = "$name-$frame"
      $keys += $key
      $rows.Add(@{ clip=$name; key=$key; index=$frame; left=$left; top=$top; right=$right; bottom=$bottom })
    }
    $clips[$name] = $keys
  }
  $idle = $rows[0]
  $w = $maxX-$minX+1; $h = $maxY-$minY+1
  $columns = 8
  $atlas = [Drawing.Bitmap]::new($w*$columns,$h*[int][Math]::Ceiling($rows.Count/$columns))
  $output = Join-Path $root ('public/assets/characters/' + $pack.id)
  New-Item -ItemType Directory -Force -Path (Join-Path $output 'sprites'), (Join-Path $output 'animations') | Out-Null
  $frames = [ordered]@{}
  for ($i=0; $i -lt $rows.Count; $i++) {
    $row=$rows[$i]
    $dx=($i%$columns)*$w; $dy=[int][Math]::Floor($i/$columns)*$h
    $image=$images[$row.clip]
    for ($y=$row.top; $y -le $row.bottom; $y++) {
      for ($x=$row.left; $x -le $row.right; $x++) {
        $atlas.SetPixel($dx+$x-$minX,$dy+$y-$minY,$image.GetPixel($row.index*$pack.size+$x,$y))
      }
    }
    $frames[$row.key]=@{frame=@{x=$dx;y=$dy;w=$w;h=$h};rotated=$false;trimmed=$false}
  }
  $atlas.Save((Join-Path $output 'sprites/fighter.png'),[Drawing.Imaging.ImageFormat]::Png)
  $portraitSize=[int][Math]::Round(($idle.bottom-$idle.top+1)*.62)
  $portrait=[Drawing.Bitmap]::new($portraitSize,$portraitSize)
  $center=[int][Math]::Round(($idle.left+$idle.right)/2)
  $portraitX=$center-[int][Math]::Floor($portraitSize/2)
  for ($y=0; $y -lt $portraitSize; $y++) {
    for ($x=0; $x -lt $portraitSize; $x++) {
      $portrait.SetPixel($x,$y,$images.idle.GetPixel($portraitX+$x,$idle.top+$y))
    }
  }
  $portrait.Save((Join-Path $output 'sprites/portrait.png'),[Drawing.Imaging.ImageFormat]::Png)
  $portrait.Dispose()
  $usedFallbacks=[ordered]@{}
  foreach ($state in $fallbacks.Keys) {
    if (!$clips.Contains($state)) {
      $usedFallbacks[$state]=$fallbacks[$state]
      $clips[$state]=$clips[$fallbacks[$state]]
    }
  }
  # Compose a defensive ready stance from native weapon wind-up frames.
  # Native source pixels remain unchanged; guard impact and crouch lean are rendered in-game.
  $clips.block=@($clips.light[0],$clips.light[1],$clips.light[1],$clips.light[0])
  $clips.crouch=@($clips.light[0],$clips.light[1])
  $usedFallbacks.block='pose-based weapon wind-up plus guard impact'
  $usedFallbacks.crouch='pose-based weapon wind-up plus grounded lean'
  # A distinct ordered sequence for each ultimate, with timing driven by the combat engine.
  switch ($pack.id) {
    'kael' { $clips.ultimate=@($clips.light + $clips.heavy + $clips.light + $clips.heavy) }
    'ren' { $clips.ultimate=@($clips.combo + $clips.light + $clips.combo + $clips.heavy) }
    'aria' { $clips.ultimate=@($clips.heavy + $clips.light + $clips.heavy) }
    'darius' { $clips.ultimate=@($clips.heavy + $clips.light) }
  }
  $usedFallbacks.ultimate='composed native attack sequence with character-specific VFX'
  $meta=@{
    source=$pack.slug; framesPerClip=$clips; fallbacks=$usedFallbacks;
    sourceCell=@{width=$pack.size;height=$pack.height};
    bodyHeight=$idle.bottom-$idle.top+1;
    pivot=@{x=($center-$minX)/$w;y=($idle.bottom+1-$minY)/$h}
  }
  $payload=@{frames=$frames;meta=$meta}
  [IO.File]::WriteAllText((Join-Path $output 'animations/fighter.json'),($payload | ConvertTo-Json -Depth 9 -Compress),$utf8)
  $atlas.Save((Join-Path $previewRoot ($pack.id + '-contact-sheet.png')),[Drawing.Imaging.ImageFormat]::Png)
  $atlas.Dispose()
  $images.Values | ForEach-Object { $_.Dispose() }
  Write-Output ($pack.id + ': ' + $rows.Count + ' source frames; body ' + $meta.bodyHeight + ' px; atlas tiles ' + $w + '×' + $h)
}


