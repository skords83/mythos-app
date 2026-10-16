# Mythos ↔ ChatGPT: MCP-Anbindung (Entwurf)

Status: Planung, noch keine laufende MCP-Schnittstelle.

## Ziel
Ein externer, zunächst ausschließlich lesender MCP-Endpunkt soll autorisierten ChatGPT-Clients projektbezogene Daten aus Mythos bereitstellen. Die vorhandenen Next.js-API-Routen sind nicht ohne Weiteres ein MCP-Server.

## Vorhandene Grundlage
- Next.js 14 App Router, Prisma/PostgreSQL.
- JWT-Cookie-Authentifizierung für die Web-App.
- Modelle: Project, Chapter (Tiptap-JSON), Character, Place, Relation, TimelineEvent, LoreEntry, Item, Faction, Scene.
- Die bestehenden Routen /api/projects, /api/chapters und /api/characters verwenden Nutzer-/Familienberechtigungen.

## Sicherheitsanforderungen vor Freigabe
1. Externe Authentifizierung getrennt von Browser-Cookies; für ChatGPT Remote-MCP eine kompatible OAuth-Integration mit sicherer Tokenverwaltung prüfen und implementieren.
2. Token an einen Nutzer und definierte Berechtigungen binden (zunächst read-only); Projektzugriff bei jeder Anfrage serverseitig prüfen.
3. Niemals DATABASE_URL, JWT_SECRET oder andere Zugangsdaten in GitHub einchecken oder im Chat teilen.
4. TLS, Rate-Limits, Protokollierung ohne sensible Textinhalte, begrenzte Antwortgrößen und Pagination.
5. Keine unkontrollierte Exposition sämtlicher Familien-/Projektdaten; explizite Projektauswahl vorsehen.
6. Berechtigungen mit Tests für Fremdzugriffe und abgelaufene Tokens absichern.

## Geplante MCP-Werkzeuge (v1)
- list_projects(): Nur Projekte des authentifizierten Nutzers, paginiert.
- list_chapters(project_id): Metadaten und Kapitel-IDs, paginiert.
- get_chapter(project_id, chapter_id): Vollständigen Kapiteltext aus Tiptap-JSON lesen, mit Größenbegrenzung.
- list_characters(project_id): Figurenbeschreibungen, nur bei zulässiger Sichtbarkeit.
- list_places(project_id): Orte mit Sichtbarkeitsprüfung.
- list_timeline_events(project_id): Chronologie, einschließlich Kapitelbezug.
- list_lore_entries(project_id): Kanonische Weltenregeln.
- list_relations(project_id): Nur Verknüpfungen zurückgeben, deren beide Endpunkte sichtbar sind.

## Umsetzungsschritte
1. Bestehende Auth- und Visibility-Helfer, dynamische Routen und Tests vollständig prüfen.
2. Remote-MCP-Transport und Auth-Flow wählen; ChatGPT-Kompatibilität verifizieren.
3. Separaten read-only Endpunkt implementieren, ohne bestehende Browser-Auth zu schwächen.
4. Unit-/Integrationstests, darunter Mandantentrennung und Zugriff auf private Einträge.
5. Lokal/staging testen; erst nach ausdrücklicher Freigabe produktiv deployen.
6. Später optional Schreibwerkzeuge mit expliziter Bestätigung, Änderungsprotokoll und Konfliktschutz.

## Inhaltliche Regeln für Trolle nach Süden
- Figurenchronik unterscheidet gesicherte Originalangaben von Interpretationen.
- Bandübergreifende Entwicklungen nicht rückwirkend als Wissen früherer Bände darstellen.
- Kapitelbelege für Änderungen und neue Weltregeln möglichst mitführen.
