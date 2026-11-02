# EPUB-Kapitelnavigation und optionales Inhaltsverzeichnis

## Ursache und Formatentscheidung

Der bisherige Export schrieb alle Kapitel in `OEBPS/content.xhtml`. Das OPF (Version 2.0) enthielt genau einen Spine-Eintrag, die NCX genau einen `navPoint` mit dem Buchtitel. Die Kapitelüberschriften im zusammengefügten HTML erzeugten keine technische Navigation. Das ist der nachgewiesene Fehler; konkrete Kindle-/Vorleseprogramme und ihre Import-Caches wurden nicht untersucht.

Es gibt keine EPUB-Exportbibliothek im Projekt: JSZip 3.10.1 verpackt die selbst erzeugten XML-/XHTML-Dateien. EPUB 2 bleibt erhalten. Seine technische Navigation ist die NCX, referenziert durch Manifest und `spine toc="ncx"`. Ein EPUB-3-`nav`-Dokument würde einen Formatwechsel erfordern und wird nicht zusätzlich in das EPUB-2-Paket gemischt. Amazon dokumentiert weiterhin Unterstützung der NCX als logisches Inhaltsverzeichnis; dies ersetzt keinen Gerätetest.

Quellen:
- [JSZip-API](https://stuk.github.io/jszip/documentation/api_jszip/generate_async.html)
- [Kobo: EPUB-2-NCX und EPUB-3-Navigation](https://github.com/kobolabs/epub-spec)
- [Amazon: logisches und sichtbares Inhaltsverzeichnis](https://kdp.amazon.com/en_US/help/topic/G201605710)

## Umsetzung

Die ausschließlich für EPUB angezeigte Checkbox „Inhaltsverzeichnis einfügen“ ist initial aktiviert. Sie steuert `toc.xhtml`, dessen Manifest-/Spine-Eintrag und den OPF-Guide-Verweis. Bei deaktivierter Option fehlt diese Seite vollständig. Die NCX enthält in beiden Fällen alle exportierten Kapitel.

`loadProjectExportChapters` erhält Kapitelgrenzen als strukturierte Daten. Es übernimmt die bisherige Logik: sämtliche API-Seiten laden, nach `order` sortieren, vollständige Inhalte abrufen und gegebenenfalls den noch ungespeicherten Editorstand einsetzen. Es gab keine zusätzliche Filterung; auch leere Kapitel bleiben erhalten. Andere Exportformate erhalten über `loadProjectExportContent` weiterhin das bisherige zusammengefügte HTML. Beim Einzelkapitelexport wird nur das gewählte Kapitel verwendet.

Jedes Kapitel erhält eine XHTML-Datei, einen Manifest-Eintrag, eine Spine-Position und ein eindeutiges Navigationsziel. Die IDs und Dateinamen entstehen aus der Position, nicht aus dem Titel; identische Titel und Sonderzeichen bleiben möglich. Inhaltsüberschriften werden nicht als Kapitelgrenzen interpretiert. Separate Spine-Dokumente trennen Kapitelanfänge auch ohne sichtbares Inhaltsverzeichnis. Buchtitel, Cover, Bilder, Formatierungen und Mention-Bereinigung bleiben im Export erhalten. Die Datenbank und gespeicherte Inhalte werden nicht verändert. Bei null Kapiteln wird mit einer deutschen Fehlermeldung abgebrochen; ein einzelnes, auch leeres Kapitel ist gültig.

## Verifikation (02.11.2026)

- 105 Jest-Suites / 714 Tests bestanden; bestehende 5 Suites / 30 Tests übersprungen.
- Produktionsbuild, Lint, separate Typprüfung (`npx tsc --noEmit --incremental false`) und `git diff --check` erfolgreich. Bestehende Hook-/Image-/Sentry-Warnungen bleiben bestehen. Repository-Wissensgraph aktualisiert.
- Checkbox-Integration: Standardwert, beide Zustände, Parameterweitergabe, aktueller Editorstand und Einzelkapitelauswahl.
- Archivtests: NCX/Manifest/Spine, Link- und Fragmentziele, Reihenfolge, identische Titel, Umlaute/XML-Sonderzeichen, null/ein Kapitel, Bilder sowie Namensverknüpfungen.
- Beide synthetischen EPUBs als ZIP erneut geladen, separat entpackt und per Python ElementTree auf Manifest-/Spine-/NCX-/XHTML-Ziele geprüft.
- EPUBCheck 5.4.0: beide EPUBs nach EPUB-2.0.1-Regeln ohne Fehler, Warnungen oder Hinweise validiert.
- Kein EPUB-Reader in der Umgebung verfügbar; kein Kindle- oder Vorleseprogramm getestet. Offen bleibt der Import beider Dateien in den tatsächlich verwendeten Reader bzw. über Send to Kindle, mit Auswahl jedes Kapitels, Vorlesen und Kontrolle der optionalen sichtbaren Seite.

Reproduktion:

```sh
cd frontend
EPUB_NAV_ARTIFACT_DIR=/tmp npm test -- --runInBand src/lib/__tests__/exportEpub.test.ts
unzip -d /tmp/mythos-with-toc /tmp/mythos-toc-true.epub
unzip -d /tmp/mythos-without-toc /tmp/mythos-toc-false.epub
java -jar /path/to/epubcheck.jar /tmp/mythos-toc-true.epub
java -jar /path/to/epubcheck.jar /tmp/mythos-toc-false.epub
```
