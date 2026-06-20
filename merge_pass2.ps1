$env:GITHUB_TOKEN = ""
$repo = "Ayushh-Sharmaa/NexaSphere"
$merged2   = [System.Collections.Generic.List[int]]::new()
$stillFailed = [System.Collections.Generic.List[int]]::new()

$failedNums = @(
    2490, 2479, 2474, 2420, 2414, 2400, 2396, 2392, 2391,
    2389, 2388, 2387, 2386, 2383, 2376, 2363, 2349, 2348, 2347,
    2346, 2343, 2342, 2336, 2334, 2332, 2331, 2329, 2327, 2309,
    2308, 2307, 2306, 2304, 2303, 2302, 2301, 2300, 2299, 2295,
    2292, 2285, 2274, 2186, 2183, 2175, 2159, 2158, 2157, 2156,
    2155, 2154, 2153, 2152, 2151, 2145, 2108, 2068, 2067, 2064,
    2061, 2059, 2057, 2056, 2055, 2054, 2053, 2052, 2043, 1994,
    1977, 1976, 1975, 1974, 1972, 1971, 1970, 1969, 1968, 1966, 1870
)

Write-Host "=== Second Pass: $($failedNums.Count) PRs ===" -ForegroundColor Cyan
git checkout main 2>&1 | Out-Null
git pull origin main 2>&1 | Out-Null
Write-Host "Local main updated`n" -ForegroundColor Green

$total = $failedNums.Count
$i = 0

foreach ($num in $failedNums) {
    $i++

    # Get PR info
    $prJson = gh pr view $num --repo $repo --json headRefName,title,state 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[$i/$total] PR #$num - cannot fetch, skipping" -ForegroundColor Yellow
        continue
    }
    $prInfo = $prJson | ConvertFrom-Json
    if ($prInfo.state -ne "OPEN") {
        Write-Host "[$i/$total] PR #$num - already closed, skipping" -ForegroundColor DarkGray
        continue
    }

    $branch = $prInfo.headRefName
    $title  = $prInfo.title
    Write-Host "[$i/$total] PR #$num  branch=[$branch]" -ForegroundColor White

    # Skip PRs where head branch is 'main' (invalid PR setup)
    if ($branch -eq "main" -or $branch -eq "") {
        Write-Host "  SKIP: head branch is '$branch' (invalid)" -ForegroundColor Yellow
        $stillFailed.Add($num)
        continue
    }

    $localRef  = "pr-fetch-$num"
    $tempBranch = "tmp-resolve-$num"

    # Fetch the PR commits
    git fetch origin "pull/$num/head" --update-head-ok 2>&1 | Out-Null
    git fetch origin "pull/${num}/head:${localRef}" 2>&1 | Out-Null

    # Create a temp branch off main
    git checkout -b $tempBranch main 2>&1 | Out-Null

    # Merge PR into temp branch, preferring PR changes on conflict
    $mergeOut = git merge $localRef --no-edit --strategy-option=theirs 2>&1
    $mergeCode = $LASTEXITCODE

    if ($mergeCode -ne 0) {
        Write-Host "  CONFLICT: cannot auto-resolve #$num" -ForegroundColor Red
        git merge --abort 2>&1 | Out-Null
        git checkout main 2>&1 | Out-Null
        git branch -D $tempBranch 2>&1 | Out-Null
        git branch -D $localRef 2>&1 | Out-Null
        $stillFailed.Add($num)
        continue
    }

    Write-Host "  Local merge OK — pushing to $branch" -ForegroundColor Gray

    # Push the resolved temp branch to the PR's actual head branch (force)
    $pushOut = git push origin "${tempBranch}:refs/heads/${branch}" --force 2>&1
    $pushCode = $LASTEXITCODE

    git checkout main 2>&1 | Out-Null
    git branch -D $tempBranch 2>&1 | Out-Null
    git branch -D $localRef 2>&1 | Out-Null

    if ($pushCode -ne 0) {
        Write-Host "  PUSH FAILED for #$num : $pushOut" -ForegroundColor Red
        $stillFailed.Add($num)
        continue
    }

    # Give GitHub time to recompute mergeability
    Start-Sleep -Seconds 5

    # Merge via gh CLI
    gh pr merge $num --repo $repo --squash --admin 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  MERGED #$num (squash)" -ForegroundColor Green
        $merged2.Add($num)
    } else {
        gh pr merge $num --repo $repo --merge --admin 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  MERGED #$num (merge commit)" -ForegroundColor Green
            $merged2.Add($num)
        } else {
            Write-Host "  STILL FAILED #$num" -ForegroundColor Red
            $stillFailed.Add($num)
        }
    }

    git pull origin main 2>&1 | Out-Null
    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "=== PASS 2 COMPLETE ===" -ForegroundColor Cyan
Write-Host "Merged     : $($merged2.Count)" -ForegroundColor Green
Write-Host "Still Failed: $($stillFailed.Count)" -ForegroundColor Red

if ($stillFailed.Count -gt 0) {
    Write-Host "Remaining failed:" -ForegroundColor Red
    foreach ($n in $stillFailed) { Write-Host "  PR #$n" }
}

@{ merged = @($merged2); stillFailed = @($stillFailed) } | ConvertTo-Json -Depth 5 |
    Out-File "d:\NexaSphere\merge_results_pass2.json" -Encoding UTF8
Write-Host "Saved to merge_results_pass2.json" -ForegroundColor Cyan
