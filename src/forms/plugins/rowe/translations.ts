/**
 * Rowe Shoulder Instability Score Translations
 * EN and DE
 */

import type { FormTranslations } from '../../types'

export const translations: FormTranslations = {
  de: {
    'form.header': '# Rowe Schulter-Instabilitäts-Score\n## Klinische Beurteilung der Schulterinstabilität',
    'form.footer': '## Rowe-Score erfasst\n## Vielen Dank!',
    'rowe.title': 'Rowe Schulter-Instabilitäts-Score',
    'rowe.instructions': 'Klinische Beurteilung durch den Untersucher. Bewertung nach Operation oder konservativer Therapie bei Schulterinstabilität.',

    'rowe.section.stability': 'Stabilität (0–50 Punkte)',
    'rowe.section.motion': 'Beweglichkeit (0–20 Punkte)',
    'rowe.section.function': 'Funktion (0–30 Punkte)',

    'rowe.stability.label': 'Schulterstabilität',
    'rowe.stability.none': 'Keine Wiederluxation, Subluxation oder Apprehension (50 Pkt.)',
    'rowe.stability.apprehension': 'Apprehension in bestimmten Armpositionen (30 Pkt.)',
    'rowe.stability.subluxation': 'Subluxation (10 Pkt.)',
    'rowe.stability.reluxation': 'Rezidivluxation (0 Pkt.)',

    'rowe.motion.label': 'Beweglichkeit im Vergleich zur Gegenseite',
    'rowe.motion.full': '100 % von normaler Außen-, Innenrotation und Elevation (20 Pkt.)',
    'rowe.motion.reduced75': '75 % von normaler Außenrotation, normale Elevation und Innenrotation (15 Pkt.)',
    'rowe.motion.reduced50': '50 % von normaler Außenrotation, 75 % von normaler Elevation und Innenrotation (5 Pkt.)',
    'rowe.motion.none': 'Keine Außenrotation, 50 % von normaler Elevation und Innenrotation (0 Pkt.)',

    'rowe.function.label': 'Funktionseinschränkung und Beschwerden',
    'rowe.function.none': 'Keine Einschränkung in Arbeit und Sport, geringes oder kein Unbehagen (30 Pkt.)',
    'rowe.function.slight': 'Geringe Einschränkung und leichtes Unbehagen (25 Pkt.)',
    'rowe.function.moderate': 'Mäßige Einschränkung (Überkopfarbeit, Heben, Werfen, Schwimmen) und mäßige Schmerzhaftigkeit (10 Pkt.)',
    'rowe.function.severe': 'Deutliche Einschränkung (keine Überkopfarbeit, Heben, Werfen, kein Tennis/Schwimmen) und chronische Schmerzen (0 Pkt.)',

    'rowe.interpretation.excellent': 'Exzellent (90–100)',
    'rowe.interpretation.good': 'Gut (75–89)',
    'rowe.interpretation.fair': 'Befriedigend (51–74)',
    'rowe.interpretation.poor': 'Schlecht (≤ 50)',
  },

  en: {
    'form.header': '# Rowe Shoulder Instability Score\n## Clinical Assessment of Shoulder Stability',
    'form.footer': '## Rowe Score recorded\n## Thank you!',
    'rowe.title': 'Rowe Shoulder Instability Score',
    'rowe.instructions': 'Clinician-administered assessment after surgery or conservative treatment for shoulder instability.',

    'rowe.section.stability': 'Stability (0–50 points)',
    'rowe.section.motion': 'Motion (0–20 points)',
    'rowe.section.function': 'Function (0–30 points)',

    'rowe.stability.label': 'Shoulder stability',
    'rowe.stability.none': 'No re-dislocation, subluxation, or apprehension (50 pts)',
    'rowe.stability.apprehension': 'Apprehension in certain arm positions (30 pts)',
    'rowe.stability.subluxation': 'Subluxation (10 pts)',
    'rowe.stability.reluxation': 'Re-dislocation (0 pts)',

    'rowe.motion.label': 'Range of motion compared to normal',
    'rowe.motion.full': '100% of normal external/internal rotation and elevation (20 pts)',
    'rowe.motion.reduced75': '75% of normal external rotation, normal elevation and internal rotation (15 pts)',
    'rowe.motion.reduced50': '50% of normal external rotation, 75% of normal elevation and internal rotation (5 pts)',
    'rowe.motion.none': 'No external rotation, 50% of normal elevation and internal rotation (0 pts)',

    'rowe.function.label': 'Functional restriction and discomfort',
    'rowe.function.none': 'No restriction in work or sport, minimal or no discomfort (30 pts)',
    'rowe.function.slight': 'Slight restriction and mild discomfort (25 pts)',
    'rowe.function.moderate': 'Moderate restriction (overhead work, heavy loads, throwing, swimming) and moderate pain (10 pts)',
    'rowe.function.severe': 'Significant restriction (unable to perform overhead work, lift, throw; no tennis or swimming) and chronic pain (0 pts)',

    'rowe.interpretation.excellent': 'Excellent (90–100)',
    'rowe.interpretation.good': 'Good (75–89)',
    'rowe.interpretation.fair': 'Fair (51–74)',
    'rowe.interpretation.poor': 'Poor (≤ 50)',
  },
}
