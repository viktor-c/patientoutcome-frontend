# Präsentation 

## Warum Papierform
  ### Pro
  - günstig, einfach
  ### Kontra
  - jemand muss es eintragen (fehlerbehaftet)
  - Statistik nur manuell möglich

## Warum digitale PROMS
  ### Pro
  - Modern
  - Patientenwartezeit nutzen
  - Direkte Verfügbarkeit und Überprüfung der Ergebnisse
  - Zahlreiche Forms/Scores einsetzbar
  ### Kontra
  - zusätzliche Forms müssen direkt eingebaut werden
    - aber nur ein Mal, Übersetzung kann direkt eingebaut werden
    - alle Nutzer profitieren davon

## Technologie-Stack - Opensource
  - FILE: images/digitale-souveranität-merz.png
  - Zentrum für Digitale Souveränität der öffentlichen Verwaltung
  - FILE: images/analyse-abhaengigkeit-oeffentliche-verwaltung.png
  ### Zusammenfassung
    - Vorteile werden aufgezählt
    - Zeitraum und Kosten werden genannt (2021)
    - Empfehlung für öffentliche Verwaltung
      - Fokus auf Open Source
      - Vermeidung von Abhängigkeiten
      - Stärkung der digitalen Souveränität
      - **"Open Source First" Richtlinie etablieren**
    - Persönliche Meinung: 
      - Gilt auch für Krankenhäuser / Gesundheitswesen
      - Aus Fehlern der Vergangenheit und Gegenwart lernen 
        - z.B. Telematikinfrastruktur
        - Limux
  ### Konkret
    ## 📊 Technologie-Stack (Warum diese Auswahl?) (KI)

      **Backend:** Express.js
      - Branchenstandard, bewährt
      - Verwendet von Netflix, PayPal, Uber
      - Ausgezeichnete Sicherheits-Library-Unterstützung

      **Datenbank:** MongoDB
      - Flexible Datenstruktur perfekt für medizinische Aufzeichnungen
      - Skaliert gut mit wachsenden Daten
      - Gut für komplexe medizinische Datenbeziehungen

      **Frontend:** Vue.js mit Vuetify
      - Moderne, schnelle Benutzeroberfläche
      - Große Community & ausgezeichnete Dokumentation
      - Schöne Material Design Komponenten (Google)
      **OpenAPI** 
      - Schnittstellendokumentation -> Auto generated Frotend API

      **Gesamter Code:** TypeScript
      - Erkennt Fehler vor ihrer Ausführung
      - Macht Code verlässlicher
      - Erleichtert Teamzusammenarbeit

      **Versioning** Git/Github

      **KI** ChatGPT-5-Mini, Claude-Sonnet-4

  ### Opensource Ausblick
    - Um die angedachte Brückenfunktion zwischen Öffentlicher Verwaltung und Akteuren des Open Source-Ökosystems auszufüllen, bedarf es einer ***agilen*** Organisation mit spezifischen Freiheitsgraden. Bund und Länder können und _sollen_ als Gesellschafter dieser neuen Organisation fungieren, kommunale Spitzenverbände sollen ebenfalls über entsprechende Governance-Strukturen eng eingebunden werden.

    - Der Aufbau des Zentrums erfolgt unter der Schirmherrschaft des Beauftragten der Bundesregierung für Informationstechnik (BfIT). Die Einbindung weiterer Stakeholder wie Länder, kommunale Spitzenverbände und öffentliche IT-Dienstleister soll dabei fortlaufend sichergestellt werden.

  ### Codegröße: (KI)
    #### Programmiersprache
    - Javascript + Typescript (Platz 1 & 3 auf Github)
    - 
    #### 1. Projekt
    - Echtes Code: ~35.7K Zeilen
    - Das ist ein **mittelgroßes Projekt**
    - Die Komplexität ist überschaubar

    #### 2. Backend ist proportional sehr gut getestet
    - 60.432 Zeilen Test-Code für 14.857 Zeilen Produktions-Code
    - Test-Ratio von 4.07:1 ist professionell
    - Zeigt reife Entwicklungspraxis

    #### 3. Frontend-Testing braucht Verbesserung
    - Nur 3.128 Zeilen Test-Code
    - Test-Ratio von 0.15:1 ist zu niedrig
    - Ziel sollte: mindestens 1:1 oder besser 0.5:1 sein

  ### Kostenanalyse (KI)

  **Backend Entwicklung (14.857 LOC):**
  - Entwicklungszeit: 6-8 Wochen (1 Senior Dev)
  - Kosten: €36.000 - €48.000
  - Rate: €600-800/Tag

  **Frontend Entwicklung (20.891 LOC handgeschrieben):**
  - Entwicklungszeit: 6-10 Wochen (1 Mid-Level Dev + 1 Junior)
  - Kosten: €32.000 - €48.000
  - Rate: €500-700/Tag

  **Gesamte Entwicklung:**
  - Mit 2er Team (1 Senior + 1 Mid-Level): **€68.000 - €96.000**
  - Dauer: 8-10 Wochen parallel
  - Puffer (10%): €6.800 - €9.600

## Zeitersparnis für die Entwicklung
  ### Eigenhändige Planung
    1. Festlegung der Schnittstellen (API)
    2. Notwendige Funktionalität
    3. Entscheidung für die Technologie
      - im Hintergrund (Backend)
      - Datenbank
      - Vordergrund (Frontend) - User experience
    - Freizeit / Hobby -> 2 Monate Planung, keine Codezeile geschrieben
  ### Entwicklung
    - initial schlechte Erfahrung mit der KI
    - Prompts waren nicht spezifisch genug. 
    - nach 2 Monate klassicher Entwicklung wurde die Nutzung der KI
      - zu unersetzbarem Tool
      - Katalysator der Entwicklung
      - Überblick über gesamten Code, blickt auch komplexe Zusammenhänge durch.

## Demo

## Bereitstellungsbeispiele für eine Praxis
  - on premise:
    - Hardware (bereits vorhanden)
    - Wer installiert es? 
    - Kompatibilität vor Ort? Sicherheitsrisiko?
  - Empfehlung für externe Bereitstellung
    - Im Keller oder Cloud
    - weniger Aufwand
    - Datenschutzrechtlich kaum Bedenken, da persönliche Daten (Patienten und Nutzer) nicht gespeichert werden
    - gleichzeitig ein Nachteil
  

## TODO
  - Datenexport - Format?
  - Datenimport
  - Backup - Format?
  - Diagnose/Prozedur basierte Statistik
  - Ausweitung der Nutzerrollen
  - Tutorials für die Bereitstellung
  ### Administration
    - frontend user management (CreateReadUpdateDelete)


Deployment
I want to create a public repository on github for the database, frontend and backend. Using this repository I want to deploy the app as version 0.2 on a Hetzner virtual server.  A bash script should be created to facilitate deployment, the script will ask
- on which domain the app will run; 
- if the database should be populated with demo data
- if default (mock data) users should be created, or even better ask directly for an admin.