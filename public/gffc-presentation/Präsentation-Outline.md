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
  - direkte Übersetzung in verschiedenen Sprachen möglich (KI)

  ### Kontra
    - zusätzliche Forms müssen direkt eingebaut werden
    - aber nur ein Mal

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
      - Erkennt Fehler vor der Ausführung
      - Macht Code verlässlicher
      - Erleichtert Teamzusammenarbeit

      **Versioning** Git/Github

      **KI** ChatGPT-5-Mini, Claude-Sonnet-4

  ### Opensource Ausblick
    - Um die angedachte Brückenfunktion zwischen Öffentlicher Verwaltung und Akteuren des Open Source-Ökosystems auszufüllen, bedarf es einer ***agilen*** Organisation mit spezifischen Freiheitsgraden. Bund und Länder können und _sollen_ als Gesellschafter dieser neuen Organisation fungieren, kommunale Spitzenverbände sollen ebenfalls über entsprechende Governance-Strukturen eng eingebunden werden.

    - Der Aufbau des Zentrums erfolgt unter der Schirmherrschaft des Beauftragten der Bundesregierung für Informationstechnik (BfIT). Die Einbindung weiterer Stakeholder wie Länder, kommunale Spitzenverbände und öffentliche IT-Dienstleister soll dabei fortlaufend sichergestellt werden.

  ### Codegröße: (KI - Claude Sonnet)
    #### Programmiersprache
    - Javascript + Typescript (Platz 1 & 3 auf Github)

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
    0. Beschreibung der Funktionalität
      Beginn nach dem letztjährigen GFFC Kongress, 
      Entscheidung für die Technologie
        - im Hintergrund (Backend)
        - Datenbank
        - Vordergrund (Frontend) - User experience
      - Freizeit / Hobby -> 1 Monat Planung, keine Codezeile geschrieben
      - Das sieht so aus ... #TODO 
    1. Festlegung der Schnittstellen (API)
      - 06.01.2025 Arbeit an UserAPI, PatientAPI and PatientCaseAPI
    2. Beginne Arbeit mit Copilot (10$/Monat)
      - 02.02.2025 ConsultationAPI
      - 26.04.2025 Add FormAPI and FormTemplateAPI
      - 07.05.2025 Add MockData, add tests
      - seit 02.09.2025 : Git commits und Analyse der Änderungen durch KI
      - 04.09.2025 : KioskUserAPI
      - 09.09.2025 Blueprint API
      - 25.09.2025 Add MOXFQ Formtemplate
      - 27.09.2025 fix: correct spelling of tourniquet field in surgery model
      - 04.10.2025 add scoring Data
      - 27.10.2025 remove age field from User
      - seit 13.11.2025 -> Vorbereitung für "GFFC" branch
  
  ### Entwicklung
    - initial schlechte Erfahrung mit der KI
    - Prompts waren nicht spezifisch genug. 
    - nach 2 Monaten klassicher Entwicklung wurde die Nutzung der KI
    - und spätestens seit Claude Sonnet 4 (22.05.2025) und Claude Sonnet 4.5 (09/2025)
      - zu unersetzbarem Tool
      - Katalysator der Entwicklung
      - Überblick über gesamten Code, blickt auch komplexe Zusammenhänge durch.
      - Effizient sehr häufig bei Fehlersuche.
      - Selten muss ich noch selber auf die Suche gehen.
  ### Dokumentierte Arbeitszeit
    - 131h
    - vergessene Stunden? 
    - kein Tracking mehr seit Juni, seitdem KI so gut geworden ist

## Was versteht der KI von dem was ich brauche und will?
  - Beispiel an der Entwicklung von Blaupausen
  - Workflow: Patient kommt in die Sprechstunde, ich stelle fest, er hat einen HV und vereinbare einen OP Termin. 
  - > Workflow 

## Demo

## Bereitstellungsbeispiele für eine Praxis
  - on premise:
    - Hardware (bereits vorhanden)
    - Wer installiert es? 
    - Kompatibilität vor Ort? Sicherheitsrisiko?
  - Empfehlung für externe Bereitstellung
    - Im Keller oder _Cloud_
    - 98% Zeit Internetverfügbarkeit
    - weniger Aufwand
    - Datenschutzrechtlich kaum Bedenken, da persönliche Daten (Patienten und Nutzer) nicht gespeichert werden
    - gleichzeitig ein Nachteil -> Backups
  - Deployment
    - Domain notwendig
    - script to deploy to Hetzner Server (KI generiert)
      - CX22 Server 
        - 2vCPU, 4 GB RAM, 40 GB Disk lokal
        - 3,92/mo; 48€/Jahr
    - initial setup with welcome script -> Demo

## TODO
  - Datenexport - Format?
  - Datenimport
  - Backup - Format?
  - Diagnose/Prozedur basierte Statistik
  - Ausweitung der Nutzerrollen
  - Tutorials für die Bereitstellung / Video / Schriftlich

  - Administration
    - frontend user management (CreateReadUpdateDelete)
    - 

# Feedback
  Willkommen ! 


# Ist KI mein Freund? 
  + Thank you! I have to go to sleep, can we continue later?

  + Of course! Have a good night's sleep! 😴

  - When you return, we'll have the blueprint functionality fully implemented for both the patient case and surgery forms. The system is now ready for you to:
    - Test the blueprint dropdown in the surgery dialog
    - Verify the integration between patient case → surgery blueprint flow
    - Continue with the consultation blueprint implementation if needed
  Everything should be working smoothly when you get back. Sweet dreams! 🌙

# Victor beim Debuggen nach 4 Stunden
  - funny image with burning head


# Vive coding
 - Vibe Coding, Steve Yegge, Gene Kim
• We need fast feedback loops— faster than ever—to match AI-accelerated code generation.
• We need to work within software architectures that give us independence of action more than ever, we need to be able to develop, test, and deploy software independently.
• We need a climate for learning, especially given the idiosyncratic nature of AI and its rapid rate of advance.
- DORA - DevOps Research and Assessment group
  - 90% adoption
  - 30% vertrauen AI Code nicht
# AI Halluzinationen
  - Der Begriff "Halluzination" nimmt in der künstlichen Intelligenz (KI) eine neue und spannende Bedeutung an. Im Gegensatz zu seiner Bedeutung in der menschlichen Psychologie, wo er sich auf irreführende Sinneswahrnehmungen bezieht, bezieht sich die KI-Halluzination auf KI-Systeme, die imaginative, _neuartige_ oder unerwartete Ausgaben generieren
  - Anstatt zu fragen "Wird künstliche Intelligenz Softwareentwickler/Ärzte ersetzen?" sollte man fragen
    - "Wie wird KI die Softwareentwicklung umformen" oder "Wie wird sie die Patientenbehandlung verändern?"
    - KI entscheidet sich oft für rohe, Brechstangenlösungen, wo ein menschlicher Entwickler einen effizienteren Ansatz wählen würde




## Still having problems
Patient Case, Surgery and Consultation workflow are looking excellent. But I still have some problems. After creating a surgery, the form shows me the create surgery form again. Then I can correctly select the consultation blueprints, but after that the dialog does not move to the next step.

### Claude Sonnet 4:
Now I can see the issues:

Problem 1: After surgery creation, the step is not being advanced. The handleSurgerySubmit function should advance to step 3, but it's not doing that.

Problem 2: The consultation blueprint selection dialog is separate from the stepper flow, so when it's confirmed, it should advance the stepper step.

## Further on
__Prompt on the backend__
A surgery blueprint should also have a field called "consultations". This holds the ids for consultation blueprints, which should then be selected by default when using the surgery blueprint in the frontend.
__Claude Sonnet 4__
Now I can see the surgery blueprint content. I need to add a "consultations" field to the surgery blueprint that holds IDs for consultation blueprints. Looking at the current MICA Surgery template (ID: "68c08903290365a33d085fcc"), I'll add the consultations field with references to the consultation blueprint IDs.
This will allow the frontend to automatically select these consultation templates when a user chooses to use the MICA Surgery blueprint, providing a complete workflow that includes the surgery and all the planned follow-up consultations.

The change is now ready and should help streamline the process of creating surgery cases with their associated consultation schedules.

## On the frontend:
__Prompt on the frontend__
The surgery blueprint can have a property "content.consultations". This contains an array of id's for consultation blueprints, which should be selected by default when adding consultations on step 3 of the workflow.

__Claude Sonnet 4:__
I understand. You want to modify the surgery blueprint handling so that when a surgery blueprint contains content.consultations (an array of consultation blueprint IDs), those consultation blueprints should be pre-selected in step 3 of the workflow.
Let me first check the current PatientCaseView to understand how the consultation blueprint selection is currently handled, then implement this feature.

__Prompt on the frontend__
#file:ConsultationBlueprintSelectionDialog.vue seems to be mounted before processing of consultation ids from surgery blueprint is done, so it has no knowledge of blueprints it should already select.

__Claude sonnet 4__
You're right! The issue is that ConsultationBlueprintSelectionDialog.vue is mounted and loads blueprints before it receives the consultation blueprint IDs from the surgery blueprint processing. Let me check how the consultation blueprint IDs are passed to this dialog and fix the timing issue.



# Funny

+ Thank you! I have to go to sleep, can we continue later?

+ Of course! Have a good night's sleep! 😴

- When you return, we'll have the blueprint functionality fully implemented for both the patient case and surgery forms. The system is now ready for you to:

  - Test the blueprint dropdown in the surgery dialog
  - Verify the integration between patient case → surgery blueprint flow
  - Continue with the consultation blueprint implementation if needed
Everything should be working smoothly when you get back. Sweet dreams! 🌙