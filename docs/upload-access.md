# Zugriff auf hochgeladene Bilder

Neue Uploads erhalten vor Rückgabe ihrer URL einen `Upload`-Datensatz mit dem
angemeldeten Benutzer als Besitzer. Der Bildabruf verlangt eine gültige Sitzung
und entweder Besitz oder eine zulässige Familienfreigabe. Freigaben werden aus
Charakteren, Ortsbildern und Kapitelversionen abgeleitet, die von einem
registrierten Bildbesitzer stammen. Das Einfügen einer fremden URL in einen
eigenen Datensatz erteilt deshalb keine Berechtigung.

`/uploads/...` wird durch die Middleware an `/api/upload/...` weitergeleitet.
Bildantworten verwenden `Cache-Control: private, no-store`. Bereits vor diesem
Update ausgelieferte und zwischengespeicherte Kopien können nicht zurückgerufen
werden.

## Bestehende Bilder

Die Migration `20260915120000_upload_ownership` legt die Besitzertabelle an und
übernimmt Referenzen aus Projekt-Titelbildern, Kapiteltexten, Charakter-Avataren,
Ortsbildern und Kapitelversionen. Beide gespeicherten Kapiteltextformen werden
berücksichtigt. Bei mehreren bisherigen Besitzern bleiben diese erhalten.
Dateien werden weder verschoben noch gelöscht.

Alte Dateien ohne gespeicherte Referenz lassen sich keinem Besitzer zuverlässig
zuordnen. Sie werden deshalb nicht freigegeben und müssen bei Bedarf erneut
hochgeladen werden. Auch noch ausschließlich lokal gespeicherte Bildreferenzen
sind nicht Teil der Datenbankmigration.

Die Migration muss vor Betrieb der neuen Routen laufen. Der vorhandene
Docker-Start führt dafür `prisma migrate deploy` aus. Die lokale Codeprüfung
führt keine Migration auf der laufenden Datenbank aus.

## Suche

Die Familiensuche behält ihre Sichtbarkeitsfilter für freigegebene Entitäten.
Kapitel und Notizen werden ausschließlich beim Projektbesitzer durchsucht,
entsprechend den Berechtigungen ihrer direkten Abrufrouten.
