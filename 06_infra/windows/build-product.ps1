param(
 [string]$Node='C:\Users\hayas\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe',
 [string]$Npm='C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js',
 [string]$Maven='C:\9988_AppPF\apache-maven-3.9.16\bin\mvn.cmd',
 [switch]$InstallDependencies
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$api=Join-Path $root '05_code/exportweb-api'
$web=Join-Path $root '05_code/exportweb-web'
$env:Path=(Split-Path $Node)+";"+$env:Path
$env:JAVA_HOME='C:\Program Files\Java\jdk-25'
if((& $Node -p 'process.versions.node.split(".")[0]') -ne '24'){throw 'Node 24 is required'}
foreach($target in @((Join-Path $api 'target'),(Join-Path $root '21_client/exportweb-web'))){
 $absolute=[IO.Path]::GetFullPath($target)
 if(-not $absolute.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Build target is outside workspace'}
 if((Test-Path -LiteralPath $target) -and (Get-Item -LiteralPath $target).LinkType){throw 'Build target must not be a link'}
}
Push-Location $web
try {
 if($InstallDependencies){& $Node $Npm ci --ignore-scripts --no-audit --no-fund;if($LASTEXITCODE -ne 0){throw 'npm ci failed'}}
 & $Node $Npm run build;if($LASTEXITCODE -ne 0){throw 'Web build failed'}
 & $Node $Npm test;if($LASTEXITCODE -ne 0){throw 'Web tests failed'}
} finally {Pop-Location}
Push-Location $api
try {
 & $Maven -B -ntp clean package -DskipTests
 if($LASTEXITCODE -ne 0){throw 'API packaging failed'}
} finally {Pop-Location}
$artifact=Join-Path $root '21_client/exportweb-api-0.1.0.jar'
Copy-Item -LiteralPath (Join-Path $api 'target/exportweb-api-0.1.0.jar') -Destination $artifact
Get-FileHash -Algorithm SHA256 -LiteralPath $artifact | Select-Object Path,Hash
Write-Output 'Build complete. Run the PostgreSQL integration tests documented in ONBOARD before release.'
