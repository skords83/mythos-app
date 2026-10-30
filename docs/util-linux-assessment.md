# util-linux: Prüfung der vier hohen CVEs

Stand: 2026-10-30. Referenz ist das veröffentlichte Mythos-Image
`ghcr.io/skords83/mythos-app/app@sha256:16fc36e610ed6a8c7bb799055d60f481af6a2ec2c259e2259558016999dc8681`
(Config-Digest `sha256:040d6724ff9ef54fd7fc0ec0d91d5dd9c867e516bbfa9122e4806fde1aefe189`).
Die Prüfung erfolgt an einer lokalen Kopie, ohne Zugriff auf Odin.

## Bestätigte Ausgangslage

| Binärpaket | Installierte Version |
| --- | --- |
| util-linux, mount, libmount1, libblkid1, libuuid1, libsmartcols1, liblastlog2-2 | 2.41.5-0+deb13u1 |
| bsdutils | 1:2.41.5-0+deb13u1 |
| login | 1:4.16.0-2+really2.41.5-0+deb13u1 |

Der Scanner ordnet alle neun Binärpakete dem Quellpaket util-linux zu:
**36 hohe Paket/CVE-Treffer für diese vier CVEs**, keine 36 unabhängigen Fehler.
Die bloße Installation etwa von libuuid1 beweist keinen Aufruf des verwundbaren
Mount-/nsenter-Codes in dieser Bibliothek.

Im unveränderten veröffentlichten Image sind `/usr/bin/mount` und
`/usr/bin/umount` root-eigen mit Modus **4755**, `/usr/bin/nsenter` mit **0755**.
`/etc/fstab` enthält ausschließlich `# UNCONFIGURED FSTAB FOR BASE SYSTEM`.
`nsenter --help` bestätigt, dass `--join-cgroup` vorhanden ist. Mythos-Code und
Startup-Skript enthalten keine Aufrufe dieser Werkzeuge. Das ist eine Aussage
über die legitimen App-Pfade, keine Unerreichbarkeitsgarantie nach beliebiger
Codeausführung.

Compose setzt bereits `cap_drop: [ALL]` und `no-new-privileges:true`; ein lokaler
Container-Regressionslauf bestätigt CapEff=0 und NoNewPrivs=1. Der Odin-Betrieb ist
damit noch nicht bestätigt: Image-Pull und Container-Neuerstellung mit der
aktuellen Compose-Konfiguration sind verschiedene Vorgänge.

## CVE-2026-78410: umgelenkte Bind-Mount-Quelle

Eine aus fstab autorisierte Quelle wird vor dem privilegierten Bind-Mount nicht
festgehalten. Kann ein lokaler Nutzer die Quelle oder einen übergeordneten Pfad
austauschen, lassen sich ein anderes Verzeichnis und mit X-mount.owner/group/mode
auch privilegierte Eigentümer-/Rechteänderungen erreichen.

**Betroffenheit:** Debian markiert die installierte util-linux-Quellversion als
verwundbar; der fehlerrelevante mount/libmount-Pfad ist vorhanden. Eine konkrete
Mythos-Ausnutzung ist nicht bestätigt. Es fehlen die passende fstab-Autorisierung
und der legitime Mount-Aufrufer; unter der geprüften Compose-Härtung fehlen auch
die benötigten Privilegien. Ein HTTP-Upload allein erfüllt die Voraussetzungen
nicht. Risiko unter dieser Konfiguration: niedrig, bei nachträglich eingerichteten
privilegierten Mount-Freigaben neu zu bewerten.

**Patch:** Upstream nennt 2.41.6/2.42.3; Debian führt den Fix in unstable ab
2.42.3-1, nicht in Trixie. Kein Einmischen von sid-/forky-Paketen.
Mitigation: keine SUID-Mounts im App-Image; Capabilities und Privilegiengewinn
weiterhin sperren; keine fstab-Mount-Freigaben für Upload-Pfade.

Quellen: [Debian](https://security-tracker.debian.org/tracker/CVE-2026-78410),
[Hersteller-Advisory](https://github.com/util-linux/util-linux/security/advisories/GHSA-rh77-686x-2f2m).

## CVE-2026-78409: X-mount.subdir verlässt den erlaubten Baum

Ein detached-tree-Pfad kann bei Zwischen-Symlinks bzw. procfs-Pfaden außerhalb des
neu gemounteten Dateisystems auflösen. Die dokumentierte eingeschränkte
SUID-Ausnutzung benötigt einen autorisierten X-mount.subdir-Eintrag und einen
Hostkernel ab Linux 6.15. Container teilen den Hostkernel; Debian 13 im Image
belegt daher keine bestimmte Kernelversion.

**Betroffenheit:** Debian markiert die installierte Quellversion als verwundbar.
Die Upstream-Metadaten nennen dagegen betroffen ab 2.42 und gleichzeitig einen
Fix für 2.41.6. Dieser Versionswiderspruch bleibt offen; kein pauschales
False-Positive-Urteil. Im geprüften Image fehlt unabhängig davon der erforderliche
fstab-Eintrag. Die App braucht keine Subdir-Mounts; die geprüfte Laufzeit entzieht
die Mount-Privilegien. Direkte HTTP-Erreichbarkeit nicht nachgewiesen. Restrisiko
unter diesen Voraussetzungen niedrig; exakte native Versionsbetroffenheit und
Odin-Kernel sind gesonderte, noch nicht vollständig belegte Aussagen.

**Patch:** Upstream 2.41.6/2.42.3; Debian unstable ab 2.42.3-1, kein Trixie-Fix.
Mitigation wie oben: SUID-Mount-Pfad entfernen und keine Mount-Capabilities oder
solchen fstab-Freigaben vergeben. Kein Kernel-Upgrade allein als CVE-Fix ausgeben.

Quellen: [Debian](https://security-tracker.debian.org/tracker/CVE-2026-78409),
[Hersteller-Advisory](https://github.com/util-linux/util-linux/security/advisories/GHSA-8f2p-47x3-43mv).

## CVE-2026-78408: geerbte cgroup-Berechtigung durch nsenter

`nsenter --join-cgroup` öffnet cgroup.procs privilegiert und lässt den Descriptor
über Credential-/Namespace-Wechsel und exec offen. Der folgende Prozess kann
damit Berechtigungen des ursprünglichen Öffners benutzen und fremde Prozesse in
cgroups verschieben bzw. mittelbar beenden.

**Betroffenheit:** Die installierte Version stellt die betroffene Option bereit;
Upstream beschreibt den Fehler ab 2.40. Das ist keine selbstständig auslösbare
SUID-Lücke: nsenter ist 0755. Ein privilegierter Betreiber muss nsenter mit dieser
Option gegen ein vom Angreifer kontrolliertes Ziel starten. Mythos ruft es nicht
auf. Ein gewöhnlicher HTTP-Request erfüllt diese Voraussetzung nicht.

**Wichtige Grenze:** CapEff=0 und no-new-privileges entziehen keinen bereits vom
Host privilegiert geöffneten und vererbten Descriptor. Daher ist diese CVE durch
die Compose-Härtung **nicht allgemein behoben**. Auch das Entfernen von nsenter aus
dem App-Image würde einen verwundbaren nsenter-Aufruf auf Odin nicht reparieren.
Ohne den privilegierten Betreiberaufruf ist kein erreichbarer App-Angriffspfad
belegt; bei solchem Host-Betrieb bleibt ein ernstes Integritäts-/Verfügbarkeitsrisiko.

**Patch:** Upstream-Advisory nennt 2.41.6/2.42.3; Debian führt für diese CVE den Fix
ab 2.42.4-1 und verlinkt Commit 286dd3ff. Trixie bleibt ohne Fix. Diese voneinander
abweichenden Metadaten sind keine Grundlage für ein manuelles Library-Upgrade.
Host-util-linux separat anhand der Ubuntu-Advisories prüfen. Bis zum Patch keine
privilegierten `nsenter --join-cgroup`-Aufrufe gegen untrusted Container/Ziele;
kein Host-PID-/cgroup-Zugriff und keine privilegiert geöffneten Host-FDs in die App.

Quellen: [Debian](https://security-tracker.debian.org/tracker/CVE-2026-78408),
[Hersteller-Advisory](https://github.com/util-linux/util-linux/security/advisories/GHSA-55fx-f4gg-cfhj).

## CVE-2026-76642: Post-Mount-Hooks nach fehlgeschlagenem Helper

Ein externer mount.<type>-Helper schlägt fehl, aber libmount führt dennoch
privilegierte X-mount.idmap-/owner-/group-/mode-Nachbearbeitung aus. Dadurch können
Rechte am vorhandenen Ziel verändert oder Dateisysteme mit gefährlichen
Eigenschaften geklont werden. Ein erfolgreicher Mount ist nicht erforderlich.

**Betroffenheit:** Die installierte Quellversion ist laut Debian betroffen;
Upstream bestätigt auch die Trixie-Familie. Ausnutzung benötigt einen lokalen
Aufrufer, passende fstab-Einträge/Helper und eine privilegierte Mount-Ausführung.
Im geprüften Image ist fstab leer; Mythos verarbeitet Uploads mit Node-Dateizugriff,
nicht mit Mount-Helpern. Keine direkte HTTP-Erreichbarkeit nachgewiesen. Restrisiko
unter der geprüften Konfiguration niedrig; bei eigenen Mount-Helpern und
privilegierten Freigaben ist diese Bewertung nicht übertragbar.

**Patch:** Upstream 2.41.6/2.42.3; Debian unstable ab 2.42.3-1, kein Trixie-Fix.
Mitigation: SUID-Mount-Aufruf entfernen, keine entsprechenden fstab-/Helper-
Freigaben einführen, Capabilities und no-new-privileges beibehalten.

Quellen: [Debian](https://security-tracker.debian.org/tracker/CVE-2026-76642),
[Hersteller-Advisory](https://github.com/util-linux/util-linux/security/advisories/GHSA-m25x-3hj9-m26f).

## Umgesetzte zusätzliche Mitigation

Der neue Kandidat entfernt ausschließlich SUID/SGID von mount und umount
(`chmod a-s` im Runtime-Stage). Pakete, Bibliotheken, Paketdatenbank und
CVE-Berichte bleiben vollständig erhalten. Die Sicherheitsfehler im Quellcode
werden dadurch nicht gepatcht. Bei weiterhin als root laufender App schützt
chmod alleine nicht vor root-Aufrufen; Capability-Drop bleibt erforderlich.
Die Kombination blockiert den untersuchten privilegierten Mount-Pfad; sie ersetzt
keine allgemeine Absicherung gegen bereits erfolgte Codeausführung.

Docker bindet bestehende named volumes vor dem Entrypoint über den Host-Daemon
ein. Dafür wird das mount-Programm im App-Image nicht benötigt. Prisma-DDL und
Node-Upload-Dateizugriffe brauchen keine SUID-Mount-Helfer. Die Regression prüft:

- Keine SUID-/SGID-Rechte an beiden Helpern, auch im Offline-Image-Test.
- Ein harmloser tmpfs-Mount wird im gehärteten Wegwerfcontainer vom Kernel
  verweigert; keine CVE-Exploits oder Host-Mounts werden ausgeführt.
- Echte ausstehende Prisma-Migration, App-Start und Neustart mit demselben Volume.
- Upload-Schreiben und geschütztes Lesen, Authentifizierung, OAuth-Widerruf und
  MCP einschließlich offiziellem SDK vor und nach Neustart.

Es wird **keine Verringerung der Scannerzahlen erwartet oder behauptet**.
`no-dsa`/`wont-fix` ist keine Entwarnung. Veröffentlichung und Anwendung der
Mitigation setzen einen später separat freigegebenen Merge/Release/Rollout voraus.
Odin wurde nicht kontaktiert, dortige Rechte und Kernel sind nicht verifiziert.

Lesende Betreiberprüfung auf Odin (keine nsenter-Probe starten):

```bash
uname -r
nsenter --version
dpkg-query -W util-linux mount libmount1
docker inspect mythos-app --format 'image={{.Image}} privileged={{.HostConfig.Privileged}} caps={{json .HostConfig.CapDrop}} security={{json .HostConfig.SecurityOpt}} pid={{.HostConfig.PidMode}}'
docker exec mythos-app stat -c '%a %u:%g %n' /usr/bin/mount /usr/bin/umount /usr/bin/nsenter
docker exec mythos-app cat /etc/fstab
docker exec mythos-app sh -c 'cat /proc/1/status | sed -n "/Cap/p;/NoNewPrivs/p"'
```

## Lokale Nachweise

Der Image-Build und der komplette Container-Regressionslauf sind erfolgreich.
Der Negativtest bestätigt die verweigerte tmpfs-Mount-Operation; beide
HTTP-Durchläufe melden jeweils 72 erfolgreiche Prüfungen. Sechs bestehende
Sicherheits-/Konfigurationsprüfungen bestehen ebenfalls.
[Prüfprotokoll](security-evidence/util-linux-verification.txt).

Eine frische APT-Abfrage im Wegwerfcontainer bestätigt für util-linux, mount und
libmount1 jeweils `Installed = Candidate = 2.41.5-0+deb13u1`, einschließlich der
konfigurierten Trixie-Security-Quelle. [APT-Nachweis](security-evidence/util-linux-apt-policy.txt).
