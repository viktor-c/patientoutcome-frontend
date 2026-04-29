import type { FormTranslations } from '../../types'

export const translations: FormTranslations = {
  de: {
    'elsnerFeedback.title.description': 'Subjektives Feedback nach der Operation',
    'elsnerFeedback.hint':
      'Wie empfinden Sie das Ergebnis nach der Operation? Waehlen Sie einen Punkt oberhalb der blauen Linie, wenn das Ergebnis besser als erwartet ist, oder unterhalb der Linie, wenn das Ergebnis schlechter als erwartet ist.',
    'elsnerFeedback.currentWeek': 'Aktuelle postoperative Woche',
    'elsnerFeedback.selectedExpectation': 'Ihr subjektives Ergebnis',
    'elsnerFeedback.noWeek': 'Es konnte keine postoperative Woche ermittelt werden.',
    'elsnerFeedback.xAxis': 'Wochen postoperativ',
    'elsnerFeedback.yAxis': 'Patientenerwartung',
  },
  en: {
    'elsnerFeedback.title.description': 'Subjective feedback after surgery',
    'elsnerFeedback.hint':
      'How do you feel is the result after the surgery. Choose a point above the blue line if you feel the result is better than expected, or beneath the line if you feel the result is less than expected.',
    'elsnerFeedback.currentWeek': 'Current postoperative week',
    'elsnerFeedback.selectedExpectation': 'Your subjective outcome',
    'elsnerFeedback.noWeek': 'No postoperative week is available.',
    'elsnerFeedback.xAxis': 'Weeks postoperative',
    'elsnerFeedback.yAxis': 'Patient expectation',
  },
}
