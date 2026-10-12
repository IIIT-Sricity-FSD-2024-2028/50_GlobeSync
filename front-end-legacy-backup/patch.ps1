$basedir = "c:\Users\miste\html\GlobeSync\front-end"
$dirs = @("admin", "super", "guide", "support")

$link = '      <a class="nav-item" data-page="profile" href="profile.html"><span class="nav-icon">👤</span>My Profile</a>
    </nav>'

foreach ($d in $dirs) {
    $dirpath = Join-Path $basedir $d
    $files = Get-ChildItem -Path $dirpath -Filter *.html
    foreach ($f in $files) {
        $content = Get-Content $f.FullName -Raw
        if ($content -notmatch 'href="profile.html"' -and $content -match '</nav>') {
            $newcontent = $content -replace '    </nav>', $link
            Set-Content -Path $f.FullName -Value $newcontent -Encoding UTF8
            Write-Host "Patched: $($f.Name)"
        }
    }
}
Write-Host "Done"
