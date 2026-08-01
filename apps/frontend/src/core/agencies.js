/** Agency id → Hebrew display name. UI labelling only, not dashboard data. */

const AGENCY_LABELS = {
  '5': 'דן', '3': 'אגד', '16': 'מטרופולין', '18': 'קווים',
  '14': 'נסיעות', '42': 'גלים', '91': 'רכבת', '7': 'דן בי"ש', '15': 'קווים',
};

export function agencyLabel(id) {
  return AGENCY_LABELS[String(id)] || `סוכנות ${id}`;
}
