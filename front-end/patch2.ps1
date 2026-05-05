$basedir = "c:\Users\miste\html\GlobeSync\front-end"
$dirs = @("admin", "super", "guide", "support")

$base64 = "ICAgICAgPGEgY2xhc3M9Im5hdi1pdGVtIiBkYXRhLXBhZ2U9InByb2ZpbGUiIGhyZWY9InByb2ZpbGUuaHRtbCI+PHNwYW4gY2xhc3M9Im5hdi1pY29uIj7wn5S0PC9zcGFuPk15IFByb2ZpbGU8L2E+DQogICAgPC9uYXY+"
$link = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($base64))

foreach ($d in $dirs) {
    if (-not (Test-Path "$basedir\$d")) { continue }
    $files = Get-ChildItem -Path "$basedir\$d" -Filter *.html
    foreach ($f in $files) {
        $content = Get-Content $f.FullName -Raw -Encoding UTF8
        if ($content -notmatch 'href="profile.html"' -and $content -match '</nav>') {
            $newcontent = $content.Replace("    </nav>", $link)
            Set-Content -Path $f.FullName -Value $newcontent -Encoding UTF8
            Write-Host "Patched: $($f.Name)"
        }
    }
}
Write-Host "Done"
