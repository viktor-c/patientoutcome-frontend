<template>
  <div class="presentation-container">
    <div class="reveal">
      <div class="slides">

        <!-- Slide 1: Titel -->
        <section data-background-gradient="linear-gradient(to bottom, #1e3a8a, #3b82f6)">
          <h1>PatientOutcome</h1>
          <h1>Technologie-Stack einer modernen Webanwendung</h1>
          <h2>Eine Full-Stack-Lösung für Patient Reported Outcome Measures (PROMs)</h2>
        </section>

        <!-- Slide 2: Projektübersicht -->
        <section>
          <h2>Projektübersicht</h2>
          <div class="two-columns">
            <div>
              <h4>Was ist PatientOutcome?</h4>
              <ul>
                <li>Digitale Erfassung von Patientendaten</li>
                <li>Standardisierte Fragebögen (PROMs)</li>
                <li>Anonyme Datenverwaltung</li>
                <li>Automatische Auswertung</li>
              </ul>
            </div>
            <div>
              <h4>Technologie</h4>
              <ul>
                <li>🌐 Webanwendung</li>
                <li>📱 Responsive Design</li>
                <li>🔒 Datenschutzkonform</li>
                <li>🆓 Open Source (MIT-Lizenz)</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Slide 3: Full-Stack mit JavaScript -->
        <section>
          <h2>Eine Sprache für alles: JavaScript</h2>
          <div class="tech-stack">
            <div class="stack-layer frontend">
              <h4>Frontend (Benutzeroberfläche)</h4>
              <p><strong>Vue.js 3</strong> + TypeScript</p>
              <p>Was der Nutzer sieht und bedient</p>
            </div>
            <div class="arrow">⬇</div>
            <div class="stack-layer backend">
              <h4>Backend (Server)</h4>
              <p><strong>Node.js</strong> + Express + TypeScript</p>
              <p>Verarbeitet Anfragen und Geschäftslogik</p>
            </div>
            <div class="arrow">⬇</div>
            <div class="stack-layer database">
              <h4>Datenbank</h4>
              <p><strong>MongoDB</strong></p>
              <p>Speichert alle Daten persistent</p>
            </div>
          </div>
        </section>

        <!-- Slide 4: Vorteile Full-Stack JavaScript -->
        <section>
          <h2>Vorteile einer Full-Stack JavaScript-Lösung</h2>
          <ul>
            <li class="fragment">✅ <strong>Eine Sprache</strong> für Frontend und Backend
              <br><small>Entwickler können überall arbeiten</small>
            </li>
            <li class="fragment">✅ <strong>Code-Wiederverwendung</strong>
              <br><small>Datenmodelle können geteilt werden</small>
            </li>
            <li class="fragment">✅ <strong>Große Community</strong>
              <br><small>Viele Bibliotheken und Lösungen verfügbar</small>
            </li>
            <li class="fragment">✅ <strong>Schnelle Entwicklung</strong>
              <br><small>Moderne Tools und Frameworks</small>
            </li>
          </ul>
        </section>

        <!-- Slide 5: Frontend Technologien -->
        <section>
          <h2>Frontend: Was der Nutzer sieht</h2>
          <div class="tech-details">
            <div class="tech-item">
              <h4>🎨 Vue.js 3</h4>
              <p>Modernes JavaScript-Framework für reaktive Benutzeroberflächen</p>
            </div>
            <div class="tech-item">
              <h4>💎 Vuetify</h4>
              <p>Material Design Komponenten-Bibliothek</p>
            </div>
            <div class="tech-item">
              <h4>📝 JSONForms</h4>
              <p>Dynamische Formulargenerierung aus JSON-Schema</p>
            </div>
            <div class="tech-item">
              <h4>🔧 Vite</h4>
              <p>Schneller Build-Tool und Entwicklungsserver</p>
            </div>
          </div>
        </section>

        <!-- Slide 6: Backend Technologien -->
        <section>
          <h2>Backend: Die Logik im Hintergrund</h2>
          <div class="tech-details">
            <div class="tech-item">
              <h4>🟢 Node.js & Express</h4>
              <p>JavaScript-Server-Plattform mit Web-Framework</p>
            </div>
            <div class="tech-item">
              <h4>🔐 Session-Management</h4>
              <p>Sichere Benutzerverwaltung mit express-session</p>
            </div>
            <div class="tech-item">
              <h4>✔️ Zod</h4>
              <p>TypeScript-first Schema-Validierung</p>
            </div>
            <div class="tech-item">
              <h4>🗄️ Mongoose</h4>
              <p>Elegant MongoDB Objekt-Modellierung</p>
            </div>
          </div>
        </section>

        <!-- Slide 7: KI-Unterstützung in der Entwicklung -->
        <section data-background-color="#2d3748">
          <h2>🤖 KI-Assistenten in der Entwicklung</h2>
          <div class="ai-content">
            <p>In diesem Projekt wurden folgende LLMs verwendet:</p>
            <ul>
              <li><strong>GPT-4o</strong> - OpenAI</li>
              <li><strong>GPT-4.1</strong> - OpenAI</li>
              <li><strong>Claude Sonnet 4</strong> - Anthropic</li>
            </ul>
          </div>
        </section>

        <!-- Slide 8: KI - Vorteile -->
        <section>
          <h2>Vorteile von KI-Assistenz</h2>
          <ul>
            <li class="fragment">✅ <strong>Code-Generierung</strong>
              <br><small>Schnelle Erstellung von Boilerplate-Code</small>
            </li>
            <li class="fragment">✅ <strong>Fehlersuche</strong>
              <br><small>Hilft beim Debugging komplexer Probleme</small>
            </li>
            <li class="fragment">✅ <strong>Dokumentation</strong>
              <br><small>Erstellt Kommentare und README-Dateien</small>
            </li>
            <li class="fragment">✅ <strong>Lernhilfe</strong>
              <br><small>Erklärt neue Technologien und Konzepte</small>
            </li>
          </ul>
        </section>

        <!-- Slide 9: KI - Nachteile & Best Practices -->
        <section>
          <h2>Nachteile & Best Practices</h2>
          <div class="two-columns">
            <div>
              <h4>⚠️ Herausforderungen</h4>
              <ul>
                <li>Kann falsche Lösungen vorschlagen</li>
                <li>Versteht Kontext nicht immer</li>
                <li>Keine Garantie für Sicherheit</li>
                <li>Erfordert menschliche Überprüfung</li>
              </ul>
            </div>
            <div>
              <h4>✅ Best Practices</h4>
              <ul>
                <li>Code immer testen</li>
                <li>Verständnis ist wichtiger als Copy-Paste</li>
                <li>KI als Assistenz, nicht als Ersatz</li>
                <li>Kritisches Denken beibehalten</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Slide 10: Open Source & MIT-Lizenz -->
        <section data-background-color="#10b981">
          <h2>🆓 Open Source & MIT-Lizenz</h2>
          <div class="license-content">
            <h4>Was bedeutet das?</h4>
            <ul>
              <li>✅ Code ist frei zugänglich auf GitHub</li>
              <li>✅ Jeder kann den Code ansehen, nutzen und verbessern</li>
              <li>✅ Keine Lizenzkosten</li>
              <li>✅ Förderung von Transparenz und Zusammenarbeit</li>
              <li>✅ Community kann zum Projekt beitragen</li>
            </ul>
            <p><small>Die MIT-Lizenz ist eine der freizügigsten Open-Source-Lizenzen</small></p>
          </div>
        </section>

        <!-- Slide 11: Datenschutz -->
        <section data-background-color="#7c3aed">
          <h2>🔒 Datenschutz & Anonymität</h2>
          <div class="privacy-content">
            <h4>Patientendaten sind besonders sensibel</h4>
            <ul>
              <li>🔐 <strong>Anonymisierung</strong>: Keine direkten Patientenidentifikatoren</li>
              <li>🔐 <strong>Session-basierte Authentifizierung</strong>: Sichere Anmeldung</li>
              <li>🔐 <strong>Rollenbasierte Zugriffskontrolle</strong>: Nur autorisierte Zugriffe</li>
              <li>🔐 <strong>DSGVO-konform</strong>: Europäische Datenschutzstandards</li>
              <li>🔐 <strong>Lokale Speicherung möglich</strong>: Daten bleiben im Haus</li>
            </ul>
          </div>
        </section>

        <!-- Slide 12: Geplante Features -->
        <section>
          <h2>🚀 Geplante Features</h2>
          <div class="features-grid">
            <div class="feature-card">
              <h4>📊 Statistiken für PROMs</h4>
              <p>Automatische Auswertung und Visualisierung von Outcome-Daten</p>
            </div>
            <div class="feature-card">
              <h4>📤 Datenexport</h4>
              <p>Export in menschenlesbaren Formaten (JSON, PDF)</p>
            </div>
            <div class="feature-card">
              <h4>📈 Verlaufsanalysen</h4>
              <p>Darstellung von Veränderungen über Zeit</p>
            </div>
            <div class="feature-card">
              <h4>🔔 Benachrichtigungen</h4>
              <p>Erinnerungen für Follow-up-Fragebögen</p>
            </div>
          </div>
        </section>

        <!-- Slide 13: API-Design & OpenAPI -->
        <section data-background-color="#0ea5a4">
          <h2>🔗 API-Design & OpenAPI</h2>
          <div class="privacy-content">
            <h4>Warum API-Design wichtig ist</h4>
            <ul>
              <li>Klare Verträge zwischen Frontend und Backend</li>
              <li>Stellt sicher, dass beide Seiten dieselben Erwartungen haben</li>
              <li>Erleichtert Wartung und Zusammenarbeit</li>
            </ul>
            <h4>OpenAPI / Swagger</h4>
            <ul>
              <li>Maschinenlesbare Spezifikation für REST-APIs</li>
              <li>Dokumentation und interaktives Testen (Swagger UI)</li>
              <li>Generierung von Client-Code und Typen möglich</li>
            </ul>
            <h4>Generierte Typen (TypeScript)</h4>
            <ul>
              <li>Automatisch aus OpenAPI-Spezifikation erzeugte Typen</li>
              <li>Erhöhen Typsicherheit im Frontend</li>
              <li>Verringern Laufzeitfehler durch frühzeitige Typprüfung</li>
            </ul>
            <p class="fragment"><small>Im Projekt: Skript zum Regenerieren der API-Typen:
                <code>npm run regenerate-api</code></small></p>
          </div>
        </section>

        <!-- Slide 13: Testing & Qualitätssicherung -->
        <section>
          <h2>🧪 Testing & Qualitätssicherung</h2>
          <div class="testing-content">
            <h4>Warum ist Testing wichtig?</h4>
            <ul>
              <li class="fragment">🛡️ <strong>Fehler früh erkennen</strong>
                <br><small>Bugs werden gefunden bevor sie Nutzer betreffen</small>
              </li>
              <li class="fragment">🔄 <strong>Refactoring ermöglichen</strong>
                <br><small>Code kann sicher umstrukturiert werden</small>
              </li>
              <li class="fragment">📚 <strong>Lebende Dokumentation</strong>
                <br><small>Tests zeigen wie Code funktionieren soll</small>
              </li>
            </ul>
            <div class="fragment tech-used">
              <p><strong>Verwendete Tools:</strong> Vitest (Unit-Tests), Playwright (E2E-Tests)</p>
            </div>
          </div>
        </section>

        <!-- Slide 14: Versionierung & CI/CD -->
        <section>
          <h2>📦 Versionierung & CI/CD</h2>
          <div class="two-columns">
            <div>
              <h4>Git & GitHub</h4>
              <ul>
                <li>Versionskontrolle des Codes</li>
                <li>Nachvollziehbare Änderungshistorie</li>
                <li>Zusammenarbeit im Team</li>
                <li>Backup in der Cloud</li>
              </ul>
            </div>
            <div>
              <h4>Continuous Integration</h4>
              <ul>
                <li>Automatische Tests bei jedem Commit</li>
                <li>Frühzeitige Fehlererkennung</li>
                <li>Konsistente Code-Qualität</li>
                <li>Schnellere Entwicklungszyklen</li>
              </ul>
            </div>
          </div>
          <p class="fragment"><small>⚙️ Docker-basiertes Deployment für konsistente Umgebungen</small></p>
        </section>

        <!-- Slide 15: Zusammenfassung & Danke -->
        <section data-background-gradient="linear-gradient(to bottom, #3b82f6, #1e3a8a)">
          <h2>Zusammenfassung</h2>
          <ul>
            <li>✅ Moderne Full-Stack JavaScript-Lösung</li>
            <li>✅ KI-unterstützte Entwicklung</li>
            <li>✅ Open Source mit MIT-Lizenz</li>
            <li>✅ Datenschutzkonform & anonym</li>
            <li>✅ Professionelle Qualitätssicherung</li>
          </ul>
          <br>
          <h3>Vielen Dank!</h3>
          <p><small>Fragen?</small></p>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Reveal: any = null

onMounted(async () => {
  // Dynamically import Reveal.js and CSS to reduce main bundle size
  await import('reveal.js/plugin/highlight/zenburn.css')
  // @ts-expect-error - reveal.js doesn't have full TypeScript definitions
  const RevealModule = await import('reveal.js')
  // @ts-expect-error - reveal.js plugins don't have full TypeScript definitions
  const RevealNotes = await import('reveal.js/plugin/notes/notes')
  // @ts-expect-error - reveal.js plugins don't have full TypeScript definitions
  const RevealHighlight = await import('reveal.js/plugin/highlight/highlight')

  Reveal = new RevealModule.default({
    hash: true,
    center: true,
    transition: 'slide',
    backgroundTransition: 'fade',
    plugins: [RevealNotes.default, RevealHighlight.default],
    // Use a responsive layout: allow reveal to scale to container
    width: 1200,
    height: 700,
    margin: 0.1,
    minScale: 0.2,
    maxScale: 2.0,
    controls: true,
    progress: true,
    slideNumber: true,
  })

  await Reveal.initialize()
})

onUnmounted(() => {
  if (Reveal) {
    Reveal.destroy()
  }
})
</script>

<style scoped>
/* Import Reveal.js CSS */
@import 'reveal.js/dist/reveal.css';
@import 'reveal.js/dist/theme/white.css';
/* Highlight CSS is loaded dynamically with reveal.js to avoid large chunk */

.presentation-container {
  width: 100%;
  height: 100vh;
}

/* Ensure Reveal is centered inside the container */
.presentation-container .reveal {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

/* Make slides responsive to the container width */
.presentation-container .reveal .slides {
  width: 100%;
  max-width: 1200px;
  box-sizing: border-box;
}
</style>

<style>
/* Custom Styles for the Presentation */
.reveal h1,
.reveal h2,
.reveal h3,
.reveal h4 {
  text-transform: none;
}

.reveal .two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  text-align: left;
}

.reveal .tech-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.reveal .stack-layer {
  width: 80%;
  padding: 1.5rem;
  border-radius: 10px;
  text-align: center;
}

.reveal .stack-layer.frontend {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.reveal .stack-layer.backend {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.reveal .stack-layer.database {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.reveal .arrow {
  font-size: 2rem;
  color: #fff;
}

.reveal .tech-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}

.reveal .tech-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
  text-align: left;
}

.reveal .tech-item h4 {
  margin-top: 0;
  color: #60a5fa;
}

.reveal .ai-content,
.reveal .license-content,
.reveal .privacy-content {
  text-align: left;
  margin: 2rem auto;
  max-width: 900px;
}

.reveal .features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}

.reveal .feature-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  border-radius: 10px;
  border: 2px solid rgba(96, 165, 250, 0.3);
}

.reveal .feature-card h4 {
  color: #60a5fa;
  margin-top: 0;
}

.reveal .testing-content {
  text-align: left;
  margin: 0 auto;
  max-width: 900px;
}

.reveal .tech-used {
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(96, 165, 250, 0.2);
  border-radius: 8px;
  text-align: center;
}

.reveal ul {
  margin-top: 1rem;
}

.reveal li {
  margin: 0.8rem 0;
}

.reveal small {
  opacity: 0.7;
}
</style>
