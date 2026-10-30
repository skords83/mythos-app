# Mythos: Sicherheitsprüfung und Härtung, 2026-10-30

## Herkunft und geprüfte Artefakte

PR [#5](https://github.com/skords83/mythos-app/pull/5) wurde am 2026-10-29 um 20:32:23 UTC in main gemergt. Mergecommit: `f9fa2e9077447a4dffb459fe6fe1b4609e43a7e0`; PR-Commit: `6cd638b10c99b1888faceeda7395bbe0123ab030`.
[Release-Run 40949930418](https://github.com/skords83/mythos-app/actions/runs/40949930418) und [PR-Checks](https://github.com/skords83/mythos-app/actions/runs/40948872729) sind erfolgreich.

Am Prüfungstag zeigen `ghcr.io/skords83/mythos-app/app:latest` und `:sha-f9fa2e9077447a4dffb459fe6fe1b4609e43a7e0` auf das veröffentlichte Manifest `sha256:c59d32aa31ee0da1ea0b2ecff9893986e4d8894dffe82c15ae6bebb7c8d2d4aa`; Config/Image-ID `sha256:3d50a8f0a2d9cf6d67b8cd8a49b081a0c3a29eeabe26d87f0787ce228037173f`. Digest aus Build-Log und lokalem Registry-Pull stimmen überein. Die öffentliche Registry-Tags-API listet genau diese beiden Tags ([Snapshot](security-evidence/registry-tags.json)); beide Manifestantworten wurden separat abgerufen. Tags sind veränderlich; SHA-Tag allein garantiert keine Unveränderlichkeit.

Das frühere lokale PR-Image `sha256:4ce5a80e858aede4ca843bde39216d5c9a534e9231e449770a7142954a4187c5` ist ein anderes Artefakt. Der damalige Scan darf nicht als Scan des veröffentlichten Images ausgegeben werden. Vollständige getrennte Scans und Inventare liegen unter [security-evidence](security-evidence/). Beim OCI-Export ändern sich Manifest-/Config-Digests gegenüber dem Registry-Format. Die unkomprimierten Layer-Digests wurden für veröffentlichtes Image und Kandidat jeweils vollständig identisch abgeglichen; [Provenienzbeleg](security-evidence/image-provenance.json) ordnet Registry-, lokale und Scan-Digests zu.
Node 22.23.4 / Debian 13 trixie sind im heruntergeladenen Image durch Ausführung bestätigt; Prisma 5.22.0 im Kandidaten. [Node-Herstellerhinweise](https://nodejs.org/en/blog/release/v22.23.4) bestätigen den unterstützten Security-Release.

**Odin: nicht geprüft.** Kein SSH, kein Produktionszugriff, keine Datenbank-/Volumeänderung, kein Rollout. Ein lokaler Pull belegt nicht, welches Image Dockhand gestartet hat.

## Methode und Grenzen

Alle 14 hohen CVEs wurden am 2026-10-30 mit dem Debian-Tracker und dessen verlinkten Herstellerinformationen abgeglichen. Paketversionen unten stammen aus dem vollständig erhaltenen PR5-Scan; veröffentlichte und neue Inventare sind separat erhalten. `no-dsa`, `postponed`, Scanner-`wont-fix` und fehlender Stable-Patch sind keine Entwarnung. In keiner dieser 14 Positionen ist derzeit ein Trixie-Fix ausgewiesen. Forky/sid-/experimentelle Pakete werden nicht eingemischt.

Quellpaket-Matching erzeugt mehrere Treffer für denselben fehlerhaften Funktionspfad. Paketbetroffenheit, vorhandener fehlerhafter Code, erreichbarer Aufruf und konkrete Ausnutzbarkeit sind getrennte Aussagen. Source-Suche ersetzt keine vollständige native Callgraph-Analyse. Niedrig bedeutet hier geringes belegtes Risiko im beschriebenen Containerbetrieb, nicht allgemeine Harmlosigkeit der CVE.

### CVE-2025-69720

Pakete/Versionen: `libtinfo6` `6.5+20250216-2`; `ncurses-base` `6.5+20250216-2`; `ncurses-bin` `6.5+20250216-2`.

Stacküberlauf in infocmp/analyze_string beim Verarbeiten manipulierter Terminalbeschreibungen.

Bestätigte Paketbetroffenheit; kein Aufruf von infocmp im Anwendungscode gefunden. HTTP-Uploads werden als Dateien gespeichert, nicht als Terminaldaten ausgeführt. Externe Erreichbarkeit nicht nachgewiesen; nach Codeausführung könnte das Werkzeug erreichbar werden.

Patch/Mitigation: Upstream ab 6.5-20251213 korrigiert; Debian unstable ab 6.6+20251231-1. Trixie no-dsa. Keine fremden Terminaldaten an infocmp übergeben.

Restrisiko: Niedrig im normalen App-Betrieb; lokale Angriffsfläche bleibt vorhanden. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2025-69720).

### CVE-2026-102010

Pakete/Versionen: `gcc-14-base` `14.2.0-19`; `libgcc-s1` `14.2.0-19`; `libstdc++6` `14.2.0-19`.

Use-after-free in der libstdc++-PBDS-Binary-Heap-Funktion erase_if nach Reallokation.

Potenziell betroffen. Ein passender kompilierter C++-Aufrufer ist Voraussetzung; kein Beleg für diesen Template-Pfad in Node/Prisma/Sharp. Paketzuordnung gcc-14-base/libgcc bestätigt keinen verwundbaren Code in jedem Binärpaket. Externe Erreichbarkeit unzureichend belegt.

Patch/Mitigation: GCC-14-Fix in Debian unstable 14.4.0-3; kein Trixie-Fix. Templates können einen Neubau des tatsächlichen Aufrufers benötigen.

Restrisiko: Niedrig bis unbestimmt: nativen Aufrufer prüfen; kein Nachweis einer ausnutzbaren HTTP-Kette. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-102010).

### CVE-2026-19499

Pakete/Versionen: `libc-bin` `2.41-12+deb13u4`; `libc6` `2.41-12+deb13u4`.

strfmon/strfmon_l schreiben bei rechtsbündiger Formatbreite über den Ausgabepuffer hinaus.

Bestätigt betroffene glibc-Version. Ausnutzung erfordert den spezifischen nativen Geldformatierungsaufruf mit zu kleinem Puffer. JS-Formatierung belegt diesen Aufruf nicht; kein direkter App-Aufrufer gefunden. Native Abhängigkeiten sind nicht vollständig als unerreichbar bewiesen.

Patch/Mitigation: Debian unstable ab 2.43-5 korrigiert; Trixie no-dsa. Keine attacker-kontrollierten strfmon-Formate nutzen.

Restrisiko: Potenziell relevante Speicherbeschädigung; im untersuchten HTTP-Pfad niedrig, Restunsicherheit bei nativen Modulen. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-19499).

### CVE-2026-5435

Pakete/Versionen: `libc-bin` `2.41-12+deb13u4`; `libc6` `2.41-12+deb13u4`.

Veraltete DNS-Debugfunktionen ns_printrrf, ns_printrr und fp_nquery missachten Pufferlängen bei TSIG-Ausgabe.

Bestätigt betroffene glibc-Version; normale DNS-Auflösung allein ist kein Nachweis für diesen Debug-Ausgabepfad. Mythos ruft ihn nicht direkt auf. Externer Angreifer müsste passende DNS-Daten in genau diese Funktionen bringen.

Patch/Mitigation: Debian unstable ab 2.43-3; kein Trixie-Fix. DNS-Debugdruck fremder TSIG-Daten vermeiden.

Restrisiko: Niedrig bei aktueller Nutzung; native indirekte Aufrufe nicht vollständig ausgeschlossen. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-5435).

### CVE-2026-54369

Pakete/Versionen: `libacl1` `2.3.2-2+b1`.

Pfadbasierte libacl-Funktionen folgen ausgetauschten Symlinks und können privilegierte ACL-Operationen umlenken.

Bestätigte Paketbetroffenheit. Lokaler Angreifer muss Pfadbestandteile kontrollieren und einen privilegierten ACL-Aufrufer auslösen. Kein solcher App-Aufruf gefunden; Upload-Dateinamen entstehen serverseitig als UUID. Keine direkte HTTP-Erreichbarkeit belegt.

Patch/Mitigation: Upstream acl 2.4.0; Debian unstable 2.4.0-1. Trixie plant Point-Release, neuer ABI verhindert einfache Einzel-Backports. Capabilities entziehen und keine privilegierten ACL-Jobs auf Uploads ausführen.

Restrisiko: Niedrig mit cap_drop ALL; root und beschreibbares Root-Dateisystem bleiben zusätzliche Risiken. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-54369).

### CVE-2026-54370

Pakete/Versionen: `libacl1` `2.3.2-2+b1`.

TOCTOU in rekursiven ACL-Werkzeugen: zwischen lstat und nachfolgenden Operationen wird ein Pfad durch Symlinks ersetzt.

Quellpaket betroffen; betroffene CLI-Programme sind durch libacl1 allein nicht nachgewiesen. Erfordert lokalen Pfadzugriff und privilegiertes getfacl/setfacl/chacl. Keine solche Nutzung in Mythos.

Patch/Mitigation: Upstream 2.4.0 / unstable 2.4.0-1; kein Trixie-Update. Keine ACL-Verarbeitung fremder Upload-Bäume; Capabilities und Privilegiengewinn sperren.

Restrisiko: Niedrig; kein bestätigter erreichbarer Aufrufer. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-54370).

### CVE-2026-76642

Pakete/Versionen: `bsdutils` `1:2.41.5-0+deb13u1`; `libblkid1` `2.41.5-0+deb13u1`; `liblastlog2-2` `2.41.5-0+deb13u1`; `libmount1` `2.41.5-0+deb13u1`; `libsmartcols1` `2.41.5-0+deb13u1`; `libuuid1` `2.41.5-0+deb13u1`; `login` `1:4.16.0-2+really2.41.5-0+deb13u1`; `mount` `2.41.5-0+deb13u1`; `util-linux` `2.41.5-0+deb13u1`.

Mount-Nachbearbeitung läuft trotz fehlgeschlagenem Helper und kann mit X-mount.idmap/owner privilegierte Änderungen ausführen.

Bestätigte util-linux-Quellpaketbetroffenheit; nicht alle neun gemeldeten Binärpakete enthalten den fehlerhaften Pfad. Erfordert lokale Mount-Berechtigung und passende Optionen/Helper. App führt keine Mounts durch.

Patch/Mitigation: Debian unstable ab 2.42.3-1; Trixie no-dsa. ALL-Capability-Drop, no-new-privileges, kein privileged/Host-Mount/Socket.

Restrisiko: Niedrig unter überprüfter Compose-Härtung; keine direkte externe Erreichbarkeit. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-76642).

### CVE-2026-78408

Pakete/Versionen: `bsdutils` `1:2.41.5-0+deb13u1`; `libblkid1` `2.41.5-0+deb13u1`; `liblastlog2-2` `2.41.5-0+deb13u1`; `libmount1` `2.41.5-0+deb13u1`; `libsmartcols1` `2.41.5-0+deb13u1`; `libuuid1` `2.41.5-0+deb13u1`; `login` `1:4.16.0-2+really2.41.5-0+deb13u1`; `mount` `2.41.5-0+deb13u1`; `util-linux` `2.41.5-0+deb13u1`.

nsenter --join-cgroup vererbt privilegiert geöffnetes cgroup.procs über Credential-Wechsel und exec.

Bestätigte Quellpaketbetroffenheit. Privilegierter Operator müsste nsenter gegen ein vom Angreifer kontrolliertes Ziel mit dieser Option ausführen. HTTP allein reicht nicht. Docker exec ist nicht dieser Aufruf.

Patch/Mitigation: Debian unstable ab 2.42.4-1; kein Trixie-Fix. nsenter --join-cgroup gegen fremde Container vermeiden; Host-util-linux separat patchen.

Restrisiko: Niedrig im App-Container; Host-Betriebsabläufe bleiben gesondert zu prüfen. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-78408).

### CVE-2026-78409

Pakete/Versionen: `bsdutils` `1:2.41.5-0+deb13u1`; `libblkid1` `2.41.5-0+deb13u1`; `liblastlog2-2` `2.41.5-0+deb13u1`; `libmount1` `2.41.5-0+deb13u1`; `libsmartcols1` `2.41.5-0+deb13u1`; `libuuid1` `2.41.5-0+deb13u1`; `login` `1:4.16.0-2+really2.41.5-0+deb13u1`; `mount` `2.41.5-0+deb13u1`; `util-linux` `2.41.5-0+deb13u1`.

X-mount.subdir kann unter Linux >=6.15 über Zwischensymlinks aus dem neuen Dateisystem ausbrechen.

Bestätigte Quellpaketbetroffenheit, hostkernelabhängig. Erfordert lokalen Nutzer, autorisierten fstab-Eintrag und Mount-Rechte; diese Konfiguration gehört nicht zum Mythos-Setup. Odin-Kernel unbekannt.

Patch/Mitigation: Debian unstable ab 2.42.3-1; kein Trixie-Fix. Capability-Drop und no-new-privileges blockieren privilegierte Mount-Kette.

Restrisiko: Niedrig bei geprüften Containerrechten; keine bestätigte externe HTTP-Kette. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-78409).

### CVE-2026-78410

Pakete/Versionen: `bsdutils` `1:2.41.5-0+deb13u1`; `libblkid1` `2.41.5-0+deb13u1`; `liblastlog2-2` `2.41.5-0+deb13u1`; `libmount1` `2.41.5-0+deb13u1`; `libsmartcols1` `2.41.5-0+deb13u1`; `libuuid1` `2.41.5-0+deb13u1`; `login` `1:4.16.0-2+really2.41.5-0+deb13u1`; `mount` `2.41.5-0+deb13u1`; `util-linux` `2.41.5-0+deb13u1`.

Race beim eingeschränkten Bind-Mount: veränderbarer fstab-Quellpfad kann privilegierte Mount-/Owner-/Mode-Operationen umlenken.

Bestätigte Quellpaketbetroffenheit. Benötigt lokale Pfadkontrolle und passende privilegierte fstab-Bind-Mount-Freigabe. Keine solche Freigabe im App-Setup.

Patch/Mitigation: Debian unstable ab 2.42.3-1; kein Trixie-Fix. Kein SUID-Privilegiengewinn, keine Mount-Capabilities und keine Hostpfade freigeben.

Restrisiko: Niedrig unter Härtung; root allein ohne Capabilities erlaubt diese Mount-Operationen nicht. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-78410).

### CVE-2026-82560

Pakete/Versionen: `perl-base` `5.40.1-6+deb13u1`.

Pod::Text kann bei verschachtelten =over-Abschnitten endlos Ausgabe erzeugen und CPU/Speicher erschöpfen.

Scanner ordnet perl-base dem betroffenen Quellpaket zu. Im geprüften Laufzeitimage schlägt perl -MPod::Text fehl: das betroffene Modul ist nicht vorhanden. Mythos formatiert keine POD-Dokumente. Fehlende Erreichbarkeit für diesen konkreten Modulpfad bestätigt.

Patch/Mitigation: Upstream podlators 6.1.1; Debian perl noch unfixed. Modul nicht nachinstallieren ohne erneute Prüfung.

Restrisiko: Niedrig im geprüften Image; kein pauschales Entwarnen für das gesamte Perl-Quellpaket. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-82560).

### CVE-2026-85091

Pakete/Versionen: `zlib1g` `1:1.3.dfsg+really1.3.1-1+b1`.

Heapüberlauf in gz_vacate nach blockiertem non-blocking gzwrite und anschließendem gzprintf/gzvprintf.

Informationslage widersprüchlich: Tracker markiert Trixie 1.3.1 als vulnerable, nennt aber Einführung des fehlerhaften Pfads erst in 1.3.1.2. Installed wirklich 1.3.1. Node kann zusätzlich gebündelte zlib nutzen. Upload-Speicherung nutzt kein gzprintf; nicht jede HTTP-Kompression trifft diesen Pfad.

Patch/Mitigation: Fix upstream df84af25, Debian sid 1:1.3.dfsg+really1.3.2-4; kein Trixie-Fix. Betroffene non-blocking gz*-Sequenz vermeiden; Binär-/Quellvergleich vor Entwarnung nötig.

Restrisiko: Unbestimmt, potenziell hoch bei nachgewiesener nativer Erreichbarkeit. Nicht als False Positive unterdrückt. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-85091).

### CVE-2026-9538

Pakete/Versionen: `perl-base` `5.40.1-6+deb13u1`.

Archive::Tar vertraut einer sehr großen TAR-Header-Längenangabe und kann dadurch Speicher erschöpfen.

perl-base-Quellpakettreffer; perl -MArchive::Tar schlägt im Laufzeitimage fehl. Betroffener Modulpfad fehlt bestätigt. Mythos verarbeitet Archive mit JS-Bibliotheken; das ist kein Perl-TAR-Aufruf.

Patch/Mitigation: Upstream Archive::Tar 3.10; Debian unstable perl 5.42.3-1. Trixie postponed wegen Regressionen. Kein Perl-TAR-Modul nachinstallieren.

Restrisiko: Niedrig für diesen Pfad im geprüften Image; JS-Archivrisiken werden dadurch nicht bewertet. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-9538).

### CVE-2026-95619

Pakete/Versionen: `gcc-14-base` `14.2.0-19`; `libgcc-s1` `14.2.0-19`; `libstdc++6` `14.2.0-19`.

Integerüberlauf in aligned operator new kann bei extrem großen nativen Allokationen einen zu kleinen Speicherblock liefern.

Potenziell betroffen: libstdc++ vorhanden, Node und native Addons nutzen C++. Benötigt passende vom Angreifer beeinflusste Größen-/Alignmentwerte und anschließenden Zugriff. Aus dem JS-Quellcode allein keine Unerreichbarkeit beweisbar; gcc-base/libgcc-Treffer nicht jeweils unabhängige Lücken.

Patch/Mitigation: Debian unstable GCC-14 14.4.0-3; kein Trixie-Fix. Eingabegrößen begrenzen, Native-Callgraph prüfen, gepatchtes Stable-Update übernehmen sobald verfügbar.

Restrisiko: Unbestimmt; native Speicherbeschädigung potenziell hoch, konkrete externe Ausnutzung nicht nachgewiesen. [Debian-Status und verlinkte Upstream-Belege](https://security-tracker.debian.org/tracker/CVE-2026-95619).

## Durchgeführte Maßnahmen und bewusste Grenzen

- App: `cap_drop: ALL`, `no-new-privileges:true`. Port 4000 benötigt keine Netzwerk-Capability. Prisma braucht Netzwerk-/Dateizugriff, keine Linux-Capabilities.
- Compose-DB-Netz: `internal: true`; DB/Redis besitzen weiterhin keine veröffentlichten Ports. App bleibt zusätzlich im externen Proxy-Netz und kann darüber ausgehend kommunizieren. Das ist keine App-Egress-Allowlist. Docker-DNS und beide Netzanschlüsse sind im Regressionstest berücksichtigt.
- Image erhält OCI-Source-/Revision-Labels; Release-Build übergibt Commit. Lokaler Build mit uncommittierten Änderungen hat nur den Basiscommit als Revision und bleibt ausdrücklich lokaler Kandidat.
- OAuth-Widerruf vergleicht Origin mit dem konfigurierten kanonischen Issuer. Die interne Standalone-Adresse verhinderte bisher gültigen Widerruf hinter dem Proxy. Tests prüfen gültige externe Origins und gefälschte Origins.
- Reproduzierbarer Container-Regressionslauf für Migration, Startup, Rechte, Upload-/Download, Login, OAuth, MCP-SDK, Scope-/Fremdzugriff und Widerruf. Historische MCP-Testannahmen wurden an den aktuellen Server angepasst.
- Keine CVE-Filter, keine Paketentfernung, kein ABI-Wechsel und keine Migration geändert.

**Root bleibt vorerst erhalten.** Bestehende Upload-Volumes können root-eigene Dateien/Verzeichnisse mit unbekannten Modi enthalten. `user: 1000:1000` würde bestehende Installationen möglicherweise sperren. Auch ein automatisches rekursives chown bei Startup ist keine sichere Migration. Root ohne Capabilities und mit no-new-privileges senkt Privilegienrisiken, verhindert aber keine Änderung root-eigener App-Dateien im beschreibbaren Image. Ein read-only Root-Dateisystem wird noch nicht aktiviert: Next-Cache, Prisma-Engines/Temporärdateien und Upload-Verhalten müssen dafür zusammen geprüft werden.

Nichtprivilegierter Folgeschritt: nach Backup Volumemodi und Eigentümer inventarisieren, auf einer Kopie UID/GID 1000, Upload-Lesen/Schreiben und Migration testen, dann dedizierte freigegebene Berechtigungsumstellung. App-Code root-owned/read-only, nur Uploads und erforderliche Cache-/tmp-Verzeichnisse beschreibbar. Keine DB-/Redis-UID pauschal ändern. Keine Entfernung von libstdc++, glibc, OpenSSL oder Prisma-Engines. Shell/apt-Werkzeuge verbleiben; Entfernung allein ersetzt keine Berechtigungshärtung.

## Kontinuierliche Prüfung

Wöchentlicher und manueller Actions-Workflow baut mit `--pull --no-cache`, publiziert und deployt nichts. Vollständige Scan- und Vergleichsberichte werden auch bei Fehlern 90 Tage aufbewahrt. Vergleichsschlüssel: CVE, Paket, Pakettyp; Versionsänderungen verlieren offene CVEs nicht. Neue, behobene, offene und hochgestufte Befunde erscheinen getrennt. Neue High/Critical, alle Critical und fixbare High lassen den Job fehlschlagen (Actions-Benachrichtigungen im Repository abonnieren).

Referenz ist der explizit geprüfte PR5-Snapshot; Unterschiede können auch aus neuer Scanner-Datenbank entstehen. Ein als behoben gelisteter Match ist zunächst aus dem Bericht verschwunden, keine automatische Exploitability-Aussage. Für reine Paketdeltas beide Images mit derselben DB scannen; DB-Metadaten aus JSON vergleichen. Referenz nur nach Review aktualisieren. Keine automatischen Produktionsupdates, kein Überschreiben von latest durch geplante Builds.

## Odin und Dockhand: ausschließlich vom Betreiber auszuführen

Auf Odin lesend prüfen, ohne `pull`, `up`, `restart` oder Migration:

```bash
docker inspect mythos-app --format 'configured={{.Config.Image}} actual={{.Image}} user={{.Config.User}}'
docker image inspect "$(docker inspect mythos-app --format '{{.Image}}')" --format 'digests={{json .RepoDigests}} labels={{json .Config.Labels}}'
docker inspect mythos-app --format 'caps={{json .HostConfig.CapDrop}} security={{json .HostConfig.SecurityOpt}} privileged={{.HostConfig.Privileged}} mounts={{json .Mounts}} networks={{json .NetworkSettings.Networks}}'
docker exec mythos-app node --version
docker exec mythos-app cat /etc/os-release
docker exec mythos-app dpkg-query -W
docker exec mythos-app sh -c 'cat /proc/1/status | sed -n "/Cap/p;/NoNewPrivs/p"'
docker port mythos-db
docker port mythos-redis
docker network inspect <compose-projekt>_internal
docker exec mythos-app stat -c '%u:%g %a %n' /app/public/uploads
```

Keine vollständigen Inspect-/Env-Ausgaben weitergeben: sie können Secrets enthalten. Anhand tatsächlicher Image-ID mit dem veröffentlichten Config-Digest vergleichen. Fehlt ein RepoDigest, ist der Build-Log-/Config-Abgleich nötig. Dockhand-Scan muss exakt diese laufende Image-ID/Manifestdigest, Architektur, Scanner-Version und DB-Zeit dokumentieren; alten Bericht gezielt erneuern. >100 Befunde sind mit 0 Critical vereinbar: bereits High+Medium+Low =111 Paketmatches, zuzüglich Negligible. Scanner unterscheiden sich bei Quellpaketduplikaten, Severity und Datenstand.

Für einen später separat vom Betreiber geplanten Rollout zunächst Kandidaten-PR prüfen, Release-Run abwarten, neues Manifestdigest auswählen und mit Scan verknüpfen. Sicherung von DB und Uploads, Staging mit Volume-Kopie, aktuelle Compose-Datei und Rückkehrdigest bereitstellen. **Die hier belegten Compose-Rechte werden erst nach einer bewussten Container-Neuerstellung wirksam; ein Image-Pull allein ändert keine laufenden Rechte.** Bestehende Migrationen dürfen nicht baselined oder zurückgesetzt werden. Ein leerer Neuinstallations-DB-Start scheitert weiterhin am fehlenden historischen Initialschema; der Test repräsentiert eine Bestandsinstallation.

## Abschluss: Scanvergleich und Tests

Grype 0.121.0, beide frischen Scans mit DB-Build `2026-10-29T06:23:34Z`, Schema v6.1.10; kein Filter und keine Unterdrückung. APT-Metadaten am 2026-10-30 aktualisiert: keine upgradable-Pakete; installierte Versionen entsprechen Kandidaten aus den konfigurierten Trixie-/Security-Repositories ([APT-Beleg](security-evidence/apt-policy.txt)).

| Befunde | PR5 lokal | GHCR veröffentlicht, neu gescannt | finaler lokaler Kandidat |
| --- | ---: | ---: | ---: |
| Critical | 0 | 0 | 0 |
| High | 54 | 54 | 54 |
| Medium | 47 | 47 | 47 |
| Low | 10 | 10 | 10 |
| Negligible | 46 | 46 | 46 |
| Unterschiedliche High-CVEs | 14 | 14 | 14 |

Kandidaten-Image-ID: `sha256:c796819c9341e3e51ea9fdd73000d527d675d067570108a37b5cdcff5119a522`. Kein veröffentlichtes Release. 0 neue, 0 verschwundene, 157 weiterhin offene Paket/CVE-Schlüssel; keine npm-Treffer in den Image-Scans. Vollständige JSON-Berichte bleiben erhalten. **Es wird keine Verringerung der CVE-Anzahl behauptet.** Nachweisbare Verbesserungen sind die entzogenen Privilegien, isolierte Netzwerkverbindungen und funktionierender Token-Widerruf.

Lokal ausgeführt:

- Finales Standalone-Image erfolgreich gebaut, Node 22.23.4 und Prisma 5.22.0 geprüft.
- 700 Unit-Tests erfolgreich, 30 separat aktivierbare Tests übersprungen; Lint und TypeScript erfolgreich (bestehende Lint-Warnungen).
- Drei Scan-Policy-Regressionstests erfolgreich: neue Critical, Severity-Eskalation, verschwundene und offene Befunde, neue verfügbare Fixes sowie ungültige Eingaben.
- Containerharness wendet die echte ausstehende Migration `20261018080000_universes` erfolgreich an; beim zweiten Start sind keine Migrationen ausstehend. PostgreSQL 15, Redis 7, zwei Netzen, Capability-Drop und no-new-privileges. Je 72 echte HTTP/OAuth/MCP/DB-Prüfungen vor und nach Neustart: Anmeldung, PKCE, Discovery, MCP-SDK, Zugriffssperren, Scopes, Rate-Limit und Widerruf; Upload als angemeldeter Nutzer, Bytevergleich beim Download und 401 ohne Session.
- Persistenz und erneutes Schreiben einer root-eigenen Datei mit Modus 0600 im selben Upload-Volume nach Neustart. Keine echten Uploads oder Volumes verwendet. Eigentümer anderer Bestandsvolumes sind vor Rollout gesondert zu prüfen: ohne DAC_OVERRIDE kann root fremde private Dateien nicht mehr übergehen.
- YAML-Dateien geparst, Shellsyntax und `git diff --check` erfolgreich.

Reproduktion: `npm ci` und `npx --no-install prisma generate` in frontend, Kandidatenimage bauen; im Repo `CONTAINER_ENGINE=podman scripts/security/test-container.sh IMAGE` (Standard: Docker). Der korrigierte Harness veröffentlicht keine Hostports. Fixture und Bereitschaftstest laufen im internen Testnetz; HTTP-/MCP-Tests teilen ausschließlich den Netzwerk-Namespace der App. Er erzeugt zufällige Secrets und entfernt nur eigene Container/Netze/Volumes. Das historische Initialschema wird ausschließlich im leeren Wegwerfcontainer durch `db push` erzeugt; dann wird die letzte echte Migration als ausstehend vorbereitet und beim App-Start angewandt. Das ist kein Produktions-Reparaturverfahren. Ein zweiter Start muss ohne ausstehende Migrationen erfolgen.

Weitere Maßnahmen: zuerst Odin-Digest und Rechteinventar erheben; anschließend Nicht-root-/Read-only-Umstellung auf Volume-Kopie testen. Native Erreichbarkeit besonders bei aligned-new und zlib vertiefen; Debian Stable-Updates beobachten. Hostkernel, Docker, Dockhand, Traefik sowie PostgreSQL-/Redis-Images unabhängig patchen/scannen: der App-Scan deckt diese nicht ab. App kann weiterhin ihre DB und Uploads im Rahmen ihrer Anwendungsrechte verändern; Containerhärtung verhindert keine fachlichen Autorisierungsfehler.

## CI-Korrektur: interner Datenbankzugriff

Der Actions-Lauf [40981014940](https://github.com/skords83/mythos-app/actions/runs/40981014940) scheiterte im Container-Test mit P1001: Die Fixture lief auf dem Host und erwartete PostgreSQL unter `127.0.0.1:55432`, obwohl der Datenbankcontainer nur an ein internes Docker-Netz angeschlossen war. Die veröffentlichte Loopback-Portzuordnung funktionierte dort nicht. [Moby erläutert das erwartete Verhalten](https://github.com/moby/moby/discussions/53256): Portfreigaben werden über das Default-Gateway-Netz eingerichtet; einem ausschließlich internen Container fehlt dieses Netz. Das vorherige `pg_isready` ohne `-h` prüfte nur den Unix-Socket im DB-Container; es belegte keine TCP-Erreichbarkeit vom Runner und konnte zudem PostgreSQLs temporären Initialisierungsserver sehen. Der lokale Podman-Lauf hatte diesen Docker-spezifischen Fehler nicht offengelegt.

Die Produktions-Compose-Datei bleibt unverändert. DB und Redis bleiben ausschließlich intern. Alle Host-Portfreigaben wurden aus dem Testharness entfernt. Ein kurzlebiger Runner aus dem Kandidatenimage führt `SELECT 1`, Prisma-Schemafixture und Vorbereitung der ausstehenden Migration direkt im internen Netz aus. Der Bereitschaftstest nutzt authentifiziertes SQL über denselben TCP-/DNS-Pfad wie Prisma. Erst danach startet die App mit den unveränderten Härtungsrechten. HTTP-/OAuth-/MCP-/Upload-Tests laufen in einem separaten Container im Netzwerk-Namespace der App: HTTP bleibt `localhost:4000`, DB/Redis werden über interne Containernamen angesprochen. Nur erforderliche Testskripte, Prisma-Schema und installierte Testabhängigkeiten werden read-only eingebunden; weder Docker-Socket noch Hostnetzwerk sind verfügbar. Produktionsdaten werden nicht eingebunden.

Zielschutz bleibt strikt: normale lokale Tests akzeptieren weiterhin nur die bisherigen Loopback-Testports und `mythos_integration_test`. Der explizite Containermodus akzeptiert ausschließlich exakt zusammengehörige, eindeutig benannte Wegwerfdienste `mythos-security-<Zeit>-<PID>-db/-redis`, ihre internen Ports und denselben Testdatenbanknamen. Regressionstests lehnen Produktionshosts, falsche Ports, falsche Datenbanknamen, manipulierte Präfixe und fremde Redis-Ziele ab. Der Harness prüft außerdem die tatsächlich konfigurierten Netzanschlüsse und fehlenden Portfreigaben von DB/Redis. Bereitschaftszeitüberschreitungen führen ausdrücklich zum Fehler.

Docker beschreibt [interne Netzwerke und ihre Isolation](https://docs.docker.com/reference/cli/docker/network/create/#network-internal-mode---internal) sowie [geteilte Container-Netzwerkstacks](https://docs.docker.com/engine/network/#container-networks). Der Testzugriff findet jetzt innerhalb dieser Isolation statt; die Isolation wird nicht entfernt, um einen Host-Portzugriff zu ermöglichen.

## Vertiefung der util-linux-Befunde

Die [gezielte Prüfung der vier util-linux-CVEs](util-linux-assessment.md) ergänzt die Versionswidersprüche in den Upstream-Metadaten, die Grenzen von Capability-Drop bei geerbten cgroup-FDs und die zusätzliche SUID-Mitigation für mount/umount. Sie ersetzt keine Prüfung der tatsächlichen Host-Konfiguration auf Odin.
