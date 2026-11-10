$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$certificateDirectory = Join-Path $projectRoot 'certs'
$certificatePath = Join-Path $certificateDirectory 'localhost.pfx'
$passphrasePath = Join-Path $certificateDirectory 'localhost.passphrase'
$passphraseText = 'carometro-local-dev'

New-Item -ItemType Directory -Path $certificateDirectory -Force | Out-Null
$certificate = New-SelfSignedCertificate `
  -DnsName 'localhost' `
  -CertStoreLocation 'Cert:\CurrentUser\My' `
  -FriendlyName 'Carometro localhost HTTPS' `
  -NotAfter (Get-Date).AddYears(2)
$passphrase = ConvertTo-SecureString -String $passphraseText -AsPlainText -Force

Export-PfxCertificate `
  -Cert $certificate `
  -FilePath $certificatePath `
  -Password $passphrase | Out-Null
Set-Content -Path $passphrasePath -Value $passphraseText -NoNewline -Encoding Ascii

Write-Output "Certificado de desenvolvimento criado em $certificatePath"