// TRANSIT IQ — Agency ID → Hebrew display name
// Shared lookup table (UI labeling only, not dashboard data) used by
// app.js and neighbourhood.js.
const AGENCY_LABELS = {
  '5': 'דן', '3': 'אגד', '16': 'מטרופולין', '18': 'קווים',
  '14': 'נסיעות', '42': 'גלים', '91': 'רכבת', '7': 'דן בי"ש', '15': 'קווים'
};
function agencyLabel(id) { return AGENCY_LABELS[String(id)] || `סוכנות ${id}`; }
