# Clear invalid GITHUB_TOKEN so keyring credentials are used
$env:GITHUB_TOKEN = ""

$repo = "Ayushh-Sharmaa/NexaSphere"
$merged = @()
$failed = @()

Write-Host "=== Fetching all open PRs ===" -ForegroundColor Cyan

$prs = gh pr list --repo $repo --state open --limit 300 --json number,title,headRefName | ConvertFrom-Json
Write-Host "Found $($prs.Count) open PRs`n" -ForegroundColor Yellow

$i = 0
foreach ($pr in $prs) {
    $i++
    $num = $pr.number
    $title = $pr.title
    Write-Host "[$i/$($prs.Count)] PR #$num : $title" -ForegroundColor White

    # Try squash merge first (no --body flag, causes issues on Windows)
    $result = gh pr merge $num --repo $repo --squash --admin 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Merged #$num (squash)" -ForegroundColor Green
        $merged += $num
    } else {
        # Fall back to regular merge commit
        $result2 = gh pr merge $num --repo $repo --merge --admin 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Merged #$num (merge commit)" -ForegroundColor Green
            $merged += $num
        } else {
            # Try rebase as last resort
            $result3 = gh pr merge $num --repo $repo --rebase --admin 2>&1

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Merged #$num (rebase)" -ForegroundColor Green
                $merged += $num
            } else {
                Write-Host "  ❌ Failed #$num : $result3" -ForegroundColor Red
                $failed += [PSCustomObject]@{ Number = $num; Title = $title; Error = "$result3" }
            }
        }
    }

    Start-Sleep -Milliseconds 200
}

Write-Host "`n==============================" -ForegroundColor Cyan
Write-Host "=== FINAL SUMMARY ===" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "✅ Successfully Merged : $($merged.Count) PRs" -ForegroundColor Green
Write-Host "❌ Failed              : $($failed.Count) PRs" -ForegroundColor Red

if ($failed.Count -gt 0) {
    Write-Host "`n--- Failed PRs ---" -ForegroundColor Red
    foreach ($f in $failed) {
        Write-Host "  PR #$($f.Number) - $($f.Title)" -ForegroundColor Red
        Write-Host "    $($f.Error)" -ForegroundColor DarkRed
    }
}

# Save results
$results = @{
    total    = $prs.Count
    merged   = $merged
    failed   = $failed | ForEach-Object { @{ number = $_.Number; title = $_.Title; error = $_.Error } }
} | ConvertTo-Json -Depth 5
$results | Out-File "d:\NexaSphere\merge_results.json" -Encoding UTF8
Write-Host "`n✅ Results saved to merge_results.json" -ForegroundColor Cyan
