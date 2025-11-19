Standalone Präsentation

Dateien:
- `index.html` — Standalone Reveal.js Präsentation (Deutsch)

Zugriff:
- Während `pnpm dev` läuft: http://localhost:5173/gffc-presentation/index.html
- In Produktion: https://<your-domain>/gffc-presentation/index.html

Hinweise:
- Die Seite nutzt Reveal.js über CDN (unpkg). Wenn Sie alles lokal ohne CDN möchten, können Sie die Reveal-Assets aus `node_modules/reveal.js/dist` in diesen Ordner kopieren und die Links anpassen.
- Die Präsentation ist unabhängig von Vue und kann direkt im Browser geöffnet werden.

Skripte & Regeneration:
- Diese Seite verweist auf das vorhandene `npm run regenerate-api` Skript in der Projekt-README; es gibt ein Hinweis in der Folie zur API-Generierung.

Benötigst du eine Version ohne CDN (lokale Assets) oder eine PDF-Export-Version der Folien?