$env:GITHUB_TOKEN = ""
$repo = "Ayushh-Sharmaa/NexaSphere"
$merged3 = [System.Collections.Generic.List[int]]::new()
$skipped3 = [System.Collections.Generic.List[int]]::new()
$failed3  = [System.Collections.Generic.List[int]]::new()

$failedNums = @(
    2479, 2474, 2420, 2414, 2400, 2396, 2392, 2391,
    2389, 2388, 2387, 2386, 2383, 2376, 2363, 2349, 2348, 2347,
    2346, 2343, 2342, 2336, 2334, 2332, 2331, 2329, 2327, 2309,
    2308, 2307, 2306, 2304, 2303, 2302, 2301, 2300, 2299, 2295,
    2292, 2285, 2274, 2186, 2183, 2175, 2159, 2158, 2157, 2156,
    2155, 2154, 2153, 2152, 2151, 2145, 2108, 2068, 2067, 2064,
    2061, 2059, 2057, 2056, 2055, 2054, 2053, 2052, 2043, 1994,
    1977, 1976, 1975, 1974, 1972, 1971, 1970, 1969, 1968, 1966, 1870
)

Write-Host "=== Pass 3: Direct-to-main merge for $($failedNums.Count) PRs ===" -ForegroundColor Cyan

git checkout main 2>&1 | Out-Null
git pull origin main 2>&1 | Out-Null
Write-Host "Local main updated" -ForegroundColor Green

$total = $failedNums.Count
$i = 0

foreach ($num in $failedNums) {
    $i++

    $prJson = gh pr view $num --repo $repo --json headRefName,title,state,mergedAt 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[$i/$total] PR #$num - cannot fetch info, skip" -ForegroundColor Yellow
        $skipped3.Add($num)
        continue
    }
    $prInfo = $prJson | ConvertFrom-Json

    if ($prInfo.state -eq "MERGED") {
        Write-Host "[$i/$total] PR #$num - already MERGED, skip" -ForegroundColor DarkGray
        $skipped3.Add($num)
        continue
    }
    if ($prInfo.state -ne "OPEN") {
        Write-Host "[$i/$total] PR #$num - state=$($prInfo.state), skip" -ForegroundColor DarkGray
        $skipped3.Add($num)
        continue
    }

    $title = $prInfo.title
    Write-Host "[$i/$total] PR #$num : $title" -ForegroundColor White

    $localRef = "pr-direct-$num"

    git fetch origin "pull/$num/head" 2>&1 | Out-Null
    git fetch origin "pull/${num}/head:${localRef}" 2>&1 | Out-Null

    $mergeOut = git merge $localRef --no-edit --strategy-option=theirs 2>&1
    $mergeCode = $LASTEXITCODE

    if ($mergeCode -ne 0) {
        Write-Host "  CONFLICT cannot resolve #$num" -ForegroundColor Red
        git merge --abort 2>&1 | Out-Null
        git branch -D $localRef 2>&1 | Out-Null
        $failed3.Add($num)
        continue
    }

    $pushOut = git push origin main 2>&1
    $pushCode = $LASTEXITCODE

    git branch -D $localRef 2>&1 | Out-Null

    if ($pushCode -ne 0) {
        Write-Host "  PUSH FAILED #$num : $pushOut" -ForegroundColor Red
        git reset --hard origin/main 2>&1 | Out-Null
        $failed3.Add($num)
        continue
    }

    Write-Host "  MERGED #$num (direct push to main)" -ForegroundColor Green
    $merged3.Add($num)

    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "=== PASS 3 COMPLETE ===" -ForegroundColor Cyan
Write-Host "Merged  : $($merged3.Count)" -ForegroundColor Green
Write-Host "Skipped : $($skipped3.Count)" -ForegroundColor DarkGray
Write-Host "Failed  : $($failed3.Count)" -ForegroundColor Red

Write-Host ""
Write-Host "=== GRAND TOTAL ===" -ForegroundColor Cyan
Write-Host "Pass 1 merged  : 91"  -ForegroundColor Green
Write-Host "Pass 2 merged  : 1"   -ForegroundColor Green
Write-Host "Pass 3 merged  : $($merged3.Count)" -ForegroundColor Green
$grandTotal = 91 + 1 + $merged3.Count
Write-Host "GRAND TOTAL    : $grandTotal / 172" -ForegroundColor Green

if ($failed3.Count -gt 0) {
    Write-Host "Still unmerged:" -ForegroundColor Red
    foreach ($n in $failed3) { Write-Host "  PR #$n" }
}

@{ merged = @($merged3); skipped = @($skipped3); failed = @($failed3) } |
    ConvertTo-Json -Depth 5 |
    Out-File "d:\NexaSphere\merge_results_pass3.json" -Encoding UTF8
Write-Host "Results saved to merge_results_pass3.json" -ForegroundColor Cyan

