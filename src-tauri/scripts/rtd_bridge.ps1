# rtd_bridge.ps1
# Universal Bridge for Excel RTD -> TraderLog CSV (Profit XLS Robust Mode)
Param([string]$ExcelPath)

$currentPid = $PID
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { 
    $_.Id -ne $currentPid -and 
    (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine -like "*rtd_bridge.ps1*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

$tempPath = [System.IO.Path]::GetTempPath()
$csvPath = Join-Path $tempPath "traderlog_rtd_data.csv"
$debugLog = Join-Path $tempPath "traderlog_rtd_debug.log"

function Log($msg) {
    "[$(Get-Date -Format 'HH:mm:ss')] $msg" | Out-File -FilePath $debugLog -Append -Encoding utf8
}

function Normalize-String($s) {
    if ($null -eq $s) { return "" }
    try {
        $normalized = [string]$s.Normalize([System.Text.NormalizationForm]::FormD)
        $sb = New-Object System.Text.StringBuilder
        foreach ($c in $normalized.ToCharArray()) {
            if ([System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
                [void]$sb.Append($c)
            }
        }
        return $sb.ToString().ToUpper().Trim()
    } catch {
        return [string]$s.ToUpper().Trim()
    }
}

function Get-SafeValue($val) {
    if ($null -eq $val) { return 0 }
    $vStr = [string]$val
    # -2146826246 = Excel RTD_NOT_AVAILABLE / formula not yet calculated
    # These are "pending" values - Profit hasn't fed data yet
    if ($vStr -eq "-2146826246" -or $vStr -match "^-214682") { return -1 }
    if ($vStr -match "#N/A|#VALOR|#REF|#DIV/0|#NUM|#NOME|#NULO|#N/D") { return 0 }
    $out = 0
    if ($vStr -match ",") {
        $vStr = $vStr.Replace(".", "").Replace(",", ".")
    }
    if ([double]::TryParse($vStr, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$out)) { return $out }
    return 0
}

Log "--- RTD Universal Bridge Started (Robust Mode) ---"
if ($ExcelPath) { Log "Target Excel Path: $ExcelPath" }

$lastScan = 0
while ($true) {
    try {
        $excel = [Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application")
        if ($null -ne $excel) {
            $workbook = $null
            
            # --- Robust Workbook Matching ---
            $allWbs = @()
            try { $allWbs = $excel.Workbooks } catch { }
            
            if ($allWbs.Count -gt 0) {
                if ($lastScan -eq 0) { Log "Excel found with $($allWbs.Count) workbooks open." }
                
                # 1. Try Exact/Path Match (Case-Insensitive)
                if ($ExcelPath) {
                    $cleanTarget = $ExcelPath.Trim().ToLower()
                    $targetFilename = [System.IO.Path]::GetFileName($cleanTarget).ToLower()
                    
                    foreach ($wb in $allWbs) {
                        $fn = [string]$wb.FullName.ToLower()
                        $bn = [string]$wb.Name.ToLower()
                        
                        if ($fn -eq $cleanTarget -or $bn -eq $targetFilename) {
                            $workbook = $wb
                            if ($lastScan -eq 0) { Log "MATCH FOUND: '$($wb.Name)' by Path/Name." }
                            break
                        }
                    }
                }
                
                # 2. Try Keyword Match Fallback
                if ($null -eq $workbook) {
                    foreach ($wb in $allWbs) {
                        $bn = [string]$wb.Name.ToLower()
                        if ($bn -match "profit|rtd|asset|ativo|trade") {
                            $workbook = $wb
                            if ($lastScan -eq 0) { Log "MATCH FOUND: '$($wb.Name)' by Keyword." }
                            break
                        }
                    }
                }
                
                # 3. Last Resort: ActiveWorkbook
                if ($null -eq $workbook) {
                    $workbook = $excel.ActiveWorkbook
                    if ($null -ne $workbook -and $lastScan -eq 0) { Log "MATCH FOUND: Using ActiveWorkbook '$($workbook.Name)'." }
                }
            } else {
                if ($lastScan -eq 0) { Log "WARNING: Excel found but NO workbooks are open." }
            }

            if ($null -ne $workbook) {
                $aggregatedData = @()
                $aggregatedData += "TYPE;SYMBOL;LAST;OPEN;HIGH;LOW;CLOSE;VOLUME;TRADES;BID;ASK;SHEET"
                
                foreach ($sheet in $workbook.Worksheets) {
                    $rawName = [string]$sheet.Name
                    $data = $null
                    try {
                        $range = $sheet.Range("A1:AZ150")
                        $data = $range.Value2 
                    } catch { 
                        # Excel might be busy
                        continue 
                    }
                    
                    if ($null -eq $data) { continue }
                    
                    $colMap = @{}
                    $colsCount = $data.GetUpperBound(1)
                    $headerRow = 0
                    
                    # Scan first 3 rows for headers
                    for ($row = 1; $row -le 3; $row++) {
                        for ($c = 1; $c -le $colsCount; $c++) {
                            $rawH = [string]$data[$row, $c]
                            if ($rawH.Length -lt 2) { continue }
                            $h = Normalize-String $rawH
                            if ($null -eq $colMap.SYM -and ($h -match "ASSET|SYMBOL|ATIVO|SIMBOLO|NOME|PAPEL|TICKER|COD")) { $colMap["SYM"] = $c; $headerRow = $row }
                            if ($null -eq $colMap.LAST -and ($h -match "ULTIMO|LAST|ULT|PRECO|PRICE|FECHAMENTO")) { $colMap["LAST"] = $c }
                            if ($null -eq $colMap.TRADES -and ($h -match "NEGOC|TRADES|QTD|COTIZ")) { $colMap["TRADES"] = $c }
                            if ($null -eq $colMap.POS -and ($h -match "SALDO|POSI")) { $colMap["POS"] = $c }
                            if ($null -eq $colMap.AVG -and ($h -match "MEDIO|AVG|PM")) { $colMap["AVG"] = $c }
                        }
                        if ($colMap.SYM) { break }
                    }

                    # IF SYM found but NOT LAST, look for first numeric column (Profit Fallback)
                    if ($colMap.SYM -and ($null -eq $colMap.LAST)) {
                        $dr = if ($headerRow) { $headerRow + 1 } else { 2 }
                        for ($c = 1; $c -le [Math]::Min($colsCount, 15); $c++) {
                            if ($c -eq $colMap.SYM) { continue }
                            if ((Get-SafeValue $data[$dr, $c]) -gt 0.0001) {
                                $colMap["LAST"] = $c
                                if ($lastScan -eq 0) { Log "Sheet '$rawName': Smart-mapped Col $c as PRICE." }
                                break
                            }
                        }
                    }

                    if ($null -eq $colMap.SYM) { continue }
                    if ($lastScan -eq 0) { Log "Sheet '$rawName' mapped: SYM=$($colMap.SYM) LAST=$($colMap.LAST)" }

                    $startR = if ($headerRow) { $headerRow + 1 } else { 2 }
                    $rowsFound = 0
                    for ($r = $startR; $r -le $data.GetUpperBound(0); $r++) {
                        $rawSym = [string]$data[$r, $colMap.SYM]
                        if ($rawSym.Length -lt 2) { continue }
                        $sym = $rawSym.Trim().ToUpper()
                        if ($sym -match "SYMBOL|ATIVO|SIMBOLO|ASSET|PAPEL") { continue }
                        
                        $last = if ($colMap.LAST) { Get-SafeValue $data[$r, $colMap.LAST] } else { 0 }
                        $trades = if ($colMap.TRADES) { Get-SafeValue $data[$r, $colMap.TRADES] } else { 0 }
                        $pos = if ($colMap.POS) { Get-SafeValue $data[$r, $colMap.POS] } else { 0 }
                        $avg = if ($colMap.AVG) { Get-SafeValue $data[$r, $colMap.AVG] } else { 0 }

                        if ($last -gt 0.0001) {
                             $rLast = [Math]::Round($last, 5)
                             $aggregatedData += "QUOTE;$sym;$rLast;0;0;0;0;0;$([Math]::Round($trades,0));0;0;$rawName"
                             if ($colMap.POS -and [Math]::Abs($pos) -gt 0.0001) {
                                  $aggregatedData += "POS;$sym;$([Math]::Abs([Math]::Round($pos,4)));$([Math]::Round($avg,5));0;0;0;0;0;0;0;$rawName"
                             }
                             $rowsFound++
                        }
                    }
                    # DIAGNOSTIC: Log first 5 rows of raw data to understand Excel values
                    if ($lastScan -eq 0) {
                        $diagEnd = [Math]::Min($startR + 5, $data.GetUpperBound(0))
                        $allPending = $true
                        for ($r = $startR; $r -le $diagEnd; $r++) {
                            $rSym = [string]$data[$r, $colMap.SYM]
                            $rLast = if ($colMap.LAST) { [string]$data[$r, $colMap.LAST] } else { "N/A" }
                            $parsedLast = if ($colMap.LAST) { Get-SafeValue $data[$r, $colMap.LAST] } else { 0 }
                            Log "DIAG Row $r | SYM='$rSym' | LAST_RAW='$rLast' | LAST_PARSED=$parsedLast"
                            if ($parsedLast -ne -1 -and $parsedLast -ne 0) { $allPending = $false }
                        }
                        if ($allPending) {
                            Log "Sheet '$rawName': WAITING for Profit RTD data. All prices are pending (-2146826246). Is Profit running and connected?"
                            $lastScan = 0 # Keep logging until data arrives
                        }
                    }
                    if ($lastScan -eq 0 -and $rowsFound -gt 0) { Log "Sheet '$rawName': Captured $rowsFound symbols." }
                    if ($lastScan -eq 0 -and $rowsFound -eq 0) { Log "Sheet '$rawName': WARNING - 0 symbols captured. Check DIAG lines above." }
                }

                if ($aggregatedData.Count -gt 1) {
                    $tmpCsv = $csvPath + ".tmp"
                    $aggregatedData | Set-Content -Path $tmpCsv -Force -Encoding utf8
                    Move-Item -Path $tmpCsv -Destination $csvPath -Force -ErrorAction SilentlyContinue
                }
                $lastScan = 1 # Mark as scanned to reduce log verbosity
            }
        }
    }
    catch {
        $e = $_.Exception.Message
        if ($e -notmatch "0x8001010A|0x800A01A8|MK_E_UNAVAILABLE|0x800AC472|rejeitada") {
            Log "ERROR: $e"
        }
        $lastScan = 0 # Reset on error to log next attempt
    }
    Start-Sleep -Milliseconds 400
}
