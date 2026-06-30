/**
 * Constant-Murley Shoulder Score Translations
 * EN and DE
 */

import type { FormTranslations } from '../../types'

export const translations: FormTranslations = {
  de: {
    'form.header': '# Constant-Murley Schulter-Score\n## Klinische Beurteilung der Schulterfunktion\nBitte füllen Sie die folgenden Felder zur Schulterfunktion des Patienten aus.',
    'form.footer': '## Constant-Score erfasst\n## Vielen Dank!',
    'constant.title': 'Constant-Murley Schulter-Score',
    'constant.instructions': 'Bewertung der Schulterfunktion durch den Untersucher. Alle Angaben beziehen sich auf die betroffene Schulter.',

    // Pain
    'constant.section.pain': 'Schmerz (0–15 Punkte)',
    'constant.pain.label': 'Schmerzstärke (stärkster Schmerz im Alltag)',
    'constant.pain.hint': '15 = kein Schmerz · 0 = stärkste Schmerzen',

    // ADL
    'constant.section.adl': 'Alltagsaktivitäten (0–20 Punkte)',
    'constant.adlWork.label': 'Arbeitsfähigkeit (0–4)',
    'constant.adlLeisure.label': 'Freizeit- / Sportfähigkeit (0–4)',
    'constant.adlSleep.label': 'Schlaffähigkeit (0–2)',
    'constant.adlHandReach.label': 'Handreichweite (schmerzlose Bewegung möglich bis …)',
    'constant.adlHandReach.belt': 'Gürtellinie (2 Pkt.)',
    'constant.adlHandReach.xiphoid': 'Xiphoid (4 Pkt.)',
    'constant.adlHandReach.neck': 'Hals (6 Pkt.)',
    'constant.adlHandReach.head': 'Scheitel (8 Pkt.)',
    'constant.adlHandReach.overhead': 'Über den Kopf hinaus (10 Pkt.)',

    // ROM
    'constant.section.rom': 'Motilität – Beweglichkeit (0–40 Punkte)',
    'constant.flexion.label': 'Flexion (Anteversion) – Messwinkel in Grad',
    'constant.abduction.label': 'Abduktion – Messwinkel in Grad',
    'constant.er.label': 'Außenrotation (je erreichbare Position = +2 Pkt.)',
    'constant.er1.label': 'Hand auf dem Scheitel, Ellenbogen nach vorne',
    'constant.er2.label': 'Hand auf dem Scheitel, Ellenbogen zur Seite',
    'constant.er3.label': 'Hand am Hinterkopf, Ellenbogen nach vorne',
    'constant.er4.label': 'Hand am Hinterkopf, Ellenbogen zur Seite',
    'constant.er5.label': 'Uneingeschränkte Überkopfbeweglichkeit',
    'constant.internalRotation.label': 'Innenrotation – höchste erreichbare Position',
    'constant.ir.thigh': 'Handrücken auf Außenseite des Oberschenkels (0 Pkt.)',
    'constant.ir.buttock': 'Handrücken auf Gesäß (2 Pkt.)',
    'constant.ir.lumbosacral': 'Handrücken auf lumbosacralem Übergang (4 Pkt.)',
    'constant.ir.waist': 'Handrücken auf Gürtellinie / 3. LWK (6 Pkt.)',
    'constant.ir.t12': 'Handrücken auf 12. Brustwirbel (8 Pkt.)',
    'constant.ir.scapula': 'Handrücken zwischen den Schulterblättern (10 Pkt.)',

    // Strength
    'constant.section.strength': 'Kraft (0–25 Punkte)',
    'constant.strengthKg.label': 'Abduktionskraft in kg (90° Abduktion in der Scapularebene, Hand proniert)',
    'constant.strengthKg.hint': '1 Punkt = 1 Pfund = 0,45 kg · Maximum: 25 Punkte (11,25 kg)',

    // Common
    'constant.yes': 'Ja (+2 Pkt.)',
    'constant.no': 'Nein (0 Pkt.)',
    'constant.points': 'Punkte',
  },

  en: {
    'form.header': '# Constant-Murley Shoulder Score\n## Clinical Assessment of Shoulder Function\nPlease complete the following fields to assess shoulder function.',
    'form.footer': '## Constant Score recorded\n## Thank you!',
    'constant.title': 'Constant-Murley Shoulder Score',
    'constant.instructions': 'Clinician-administered assessment of shoulder function. All items refer to the affected shoulder.',

    // Pain
    'constant.section.pain': 'Pain (0–15 points)',
    'constant.pain.label': 'Pain level (maximum pain during daily activities)',
    'constant.pain.hint': '15 = no pain · 0 = maximum pain',

    // ADL
    'constant.section.adl': 'Activities of Daily Living (0–20 points)',
    'constant.adlWork.label': 'Work capacity (0–4)',
    'constant.adlLeisure.label': 'Leisure / sport capacity (0–4)',
    'constant.adlSleep.label': 'Sleep (0–2)',
    'constant.adlHandReach.label': 'Hand positioning (highest pain-free reach)',
    'constant.adlHandReach.belt': 'Up to waist / belt (2 pts)',
    'constant.adlHandReach.xiphoid': 'Up to xiphoid (4 pts)',
    'constant.adlHandReach.neck': 'Up to neck (6 pts)',
    'constant.adlHandReach.head': 'Up to top of head (8 pts)',
    'constant.adlHandReach.overhead': 'Above head (10 pts)',

    // ROM
    'constant.section.rom': 'Range of Motion (0–40 points)',
    'constant.flexion.label': 'Forward flexion – measured angle in degrees',
    'constant.abduction.label': 'Abduction – measured angle in degrees',
    'constant.er.label': 'External rotation (each achievable position = +2 pts)',
    'constant.er1.label': 'Hand on top of head, elbow forward',
    'constant.er2.label': 'Hand on top of head, elbow to side',
    'constant.er3.label': 'Hand behind head, elbow forward',
    'constant.er4.label': 'Hand behind head, elbow to side',
    'constant.er5.label': 'Full unrestricted overhead movement',
    'constant.internalRotation.label': 'Internal rotation – highest achievable position',
    'constant.ir.thigh': 'Back of hand to outer thigh (0 pts)',
    'constant.ir.buttock': 'Back of hand to buttock (2 pts)',
    'constant.ir.lumbosacral': 'Back of hand to lumbosacral junction (4 pts)',
    'constant.ir.waist': 'Back of hand to belt line / L3 (6 pts)',
    'constant.ir.t12': 'Back of hand to T12 (8 pts)',
    'constant.ir.scapula': 'Back of hand between shoulder blades (10 pts)',

    // Strength
    'constant.section.strength': 'Strength (0–25 points)',
    'constant.strengthKg.label': 'Abduction strength in kg (90° abduction in scapular plane, hand pronated)',
    'constant.strengthKg.hint': '1 point = 1 pound = 0.45 kg · Maximum: 25 points (11.25 kg)',

    // Common
    'constant.yes': 'Yes (+2 pts)',
    'constant.no': 'No (0 pts)',
    'constant.points': 'points',
  },
}
