# GFFC Technology Presentation

## Übersicht

Diese Präsentation bietet eine technische Übersicht über den PatientOutcome-Stack für ein nicht-technisches Publikum.

## Zugriff auf die Präsentation

Die Präsentation ist unter der folgenden URL verfügbar (wenn der Frontend-Server läuft):

```
http://localhost:5173/presentation
```

Im Produktivbetrieb:
```
https://your-domain.com/presentation
```

## Inhalt

Die Präsentation umfasst 15 Folien zu folgenden Themen:

1. **Titel & Projektübersicht** - Einführung in PatientOutcome
2. **Projektübersicht** - Was ist die Anwendung?
3. **Full-Stack JavaScript** - Eine Sprache für Frontend und Backend
4. **Vorteile Full-Stack** - Warum JavaScript überall?
5. **Frontend-Technologien** - Vue.js, Vuetify, JSONForms, Vite
6. **Backend-Technologien** - Node.js, Express, Zod, Mongoose
7. **KI-Unterstützung** - Verwendete LLMs (GPT-4o, GPT-4.1, Claude Sonnet 4)
8. **KI-Vorteile** - Code-Generierung, Fehlersuche, Dokumentation
9. **KI-Nachteile & Best Practices** - Kritisches Denken beibehalten
10. **Open Source & MIT-Lizenz** - Freier Zugang zum Code
11. **Datenschutz** - Anonymisierung und DSGVO-Konformität
12. **Geplante Features** - Statistiken, Export, Verlaufsanalysen
13. **Testing** - Vitest, Playwright, Qualitätssicherung
14. **Versionierung & CI/CD** - Git, GitHub, Docker
15. **Zusammenfassung** - Schlüsselpunkte

## Navigation

- **Pfeiltasten** oder **Leertaste**: Vorwärts/Rückwärts navigieren
- **ESC**: Übersichtsmodus (Slide Overview)
- **F**: Vollbildmodus
- **S**: Sprechernotizen (falls vorhanden)

## Technologie

Die Präsentation nutzt:
- **Reveal.js** - HTML-Präsentationsframework
- **Vue 3** - Als Wrapper-Komponente
- Eingebettet in die PatientOutcome-Frontend-Anwendung

## Anpassungen

Um die Präsentation zu bearbeiten:

1. Öffne `TechPresentation.vue`
2. Bearbeite die `<section>`-Elemente im Template
3. Passe die Styles im `<style>`-Block an
4. Speichere und die Änderungen werden automatisch übernommen (Hot Reload)

## Reveal.js Optionen

Die Konfiguration in der Komponente:
```typescript
{
  hash: true,                    // URL-Hashes für Folien
  transition: 'slide',           // Übergangseffekt
  backgroundTransition: 'fade',  // Hintergrundübergang
  width: 1200,                   // Breite
  height: 700,                   // Höhe
  margin: 0.1,                   // Rand
  minScale: 0.2,                 // Min. Skalierung
  maxScale: 2.0                  // Max. Skalierung
}
```

## Weitere Informationen

- [Reveal.js Dokumentation](https://revealjs.com/)
- [Vue.js Dokumentation](https://vuejs.org/)
