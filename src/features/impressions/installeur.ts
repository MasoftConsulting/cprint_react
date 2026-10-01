import type { AgentCredentials } from './types'

/**
 * Fabrication de l'installeur d'un point d'impression.
 *
 * Ni `server-only` ni `'use client'` : des fonctions pures, appelées depuis la
 * page d'administration au moment où le jeton est encore là. La centrale ne
 * garde que l'empreinte du jeton, elle ne pourra donc jamais regénérer ces
 * valeurs — d'où la fabrication ici, au seul instant où elles existent.
 *
 * Ce qui est produit reste volontairement **minuscule** : quelques valeurs et
 * un appel. Toute la logique d'installation vit dans `deploy/amorce.ps1`,
 * publiée par la centrale sur `GET /agents/amorce.ps1`. Corriger
 * l'installation se fait donc en déployant la centrale, sans avoir à
 * regénérer le moindre fichier déjà distribué.
 */

/**
 * Échappe une valeur pour une chaîne PowerShell entre apostrophes, où le seul
 * caractère spécial est l'apostrophe elle-même, qui se double.
 *
 * Aucune des valeurs en jeu n'en contient (nom restreint aux minuscules et
 * tirets, jeton en base64url, IP, URL) : c'est une ceinture, pas un pansement.
 */
function psChaine(valeur: string): string {
  return valeur.replace(/'/g, "''")
}

/** Nom du fichier proposé au téléchargement. */
export function nomDuFichierInstalleur(credentials: AgentCredentials): string {
  return `installeur-${credentials.name}.ps1`
}

/**
 * La commande d'une ligne, pour installer sans passer par un fichier.
 *
 * Pratique en dépannage, mais le jeton part dans l'historique de la console
 * et dans le presse-papier : préférer le fichier pour une vraie installation.
 */
export function commandeDInstallation(credentials: AgentCredentials): string {
  const { name, token, central, printerIp } = credentials
  const imprimante = printerIp ? ` -Imprimante '${psChaine(printerIp)}'` : ''
  return (
    `& ([scriptblock]::Create((Invoke-RestMethod ${central}/agents/amorce.ps1 -UseBasicParsing)))` +
    ` -Nom '${psChaine(name)}' -Jeton '${psChaine(token)}'${imprimante}` +
    ` -Centrale '${psChaine(central)}'`
  )
}

/** Contenu du fichier `.ps1` remis à la personne qui installe sur place. */
export function scriptDInstallation(credentials: AgentCredentials): string {
  const { name, token, central, printerIp } = credentials
  const fichier = nomDuFichierInstalleur(credentials)
  const date = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

  // Commentaires sans accents : la console Windows n'est pas en UTF-8 par
  // defaut, et « généré » y apparaitrait « gÃ©nÃ©rÃ© ».
  return `# Campus Print - installeur du point "${name}"
#
# Genere par l'administration le ${date}.
#
# CE FICHIER CONTIENT LE JETON DE CE POINT. Traitez-le comme un mot de passe :
# ne le laissez pas sur une cle USB partagee, et supprimez-le une fois
# l'installation terminee. En cas de doute, renouvelez le jeton depuis
# l'administration : l'ancien cesse aussitot de fonctionner.
#
# UTILISATION, sur le PC relie a l'imprimante :
#
#   1. ouvrez PowerShell EN ADMINISTRATEUR (clic droit sur le menu Demarrer,
#      "Terminal (administrateur)" ou "Windows PowerShell (admin)") ;
#   2. placez-vous dans le dossier de ce fichier, par exemple :
#        cd "$env:USERPROFILE\\Downloads"
#   3. lancez :
#        powershell -ExecutionPolicy Bypass -File .\\${fichier}
#
# Le clic droit > "Executer avec PowerShell" echoue en general : Windows
# refuse les scripts non signes. La commande de l'etape 3 leve ce refus pour
# ce seul fichier, sans changer le reglage de la machine.

$Nom        = '${psChaine(name)}'
$Jeton      = '${psChaine(token)}'
$Imprimante = '${psChaine(printerIp ?? '')}'
$Centrale   = '${psChaine(central)}'

$ErrorActionPreference = 'Stop'

# TLS 1.2 : les PC de magasin ne sont pas toujours a jour, et un Windows
# PowerShell ancien negocie encore TLS 1.0, que la centrale refuse.
try {
    [Net.ServicePointManager]::SecurityProtocol =
        [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch { }

# Tout le travail (Python, code de l'agent, reglages, tache planifiee,
# pare-feu, controle) est fait par l'amorce que publie la centrale. Ce fichier
# ne porte que les valeurs de ce point : une correction de l'installation se
# deploie sur la centrale, sans regenerer les installeurs deja distribues.
Write-Host ""
Write-Host "Campus Print - installation du point '$Nom'"
Write-Host "Recuperation du script d'installation depuis $Centrale ..."

try {
    $amorce = Invoke-RestMethod "$Centrale/agents/amorce.ps1" -UseBasicParsing -TimeoutSec 30
} catch {
    Write-Host ""
    Write-Host "Impossible de joindre la centrale sur $Centrale." -ForegroundColor Red
    Write-Host "Verifiez la connexion Internet de ce PC, puis relancez." -ForegroundColor Red
    Write-Host "Detail : $($_.Exception.Message)"
    if (-not $env:CAMPUS_PRINT_TASK) { pause }
    exit 1
}

$parametres = @{ Nom = $Nom; Jeton = $Jeton; Centrale = $Centrale }
if ($Imprimante) { $parametres.Imprimante = $Imprimante }

& ([scriptblock]::Create($amorce)) @parametres
`
}
