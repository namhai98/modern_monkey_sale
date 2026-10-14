// An order's delivery address is one block of text (see Checkout): the name,
// "Утас: …", the city/district/khoroo line, the detail, then an optional
// "Хаягийн нэр: …". Older orders used other labels or put the phone elsewhere,
// so this reads what it can and leaves the rest as plain lines.

const PHONE = /^(?:Утас|Утасны дугаар|Phone number|Phone)\s*:\s*(.+)$/i;
const LABEL = /^(?:Хаягийн нэр|Address name)\s*:\s*(.+)$/i;
const AREA = /(дүүрэг|сум)\b/i;

export function parseShippingAddress(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  let phone = null;
  let label = null;
  const rest = [];
  for (const l of lines) {
    const p = l.match(PHONE);
    const n = l.match(LABEL);
    if (p && !phone) phone = p[1].trim();
    else if (n && !label) label = n[1].trim();
    else rest.push(l);
  }
  const name = rest.length > 1 ? rest[0] : null;
  const body = name ? rest.slice(1) : rest;
  const area = body.find((l) => AREA.test(l)) || null;
  return { name, phone, area, label, lines: body };
}

// Digits only, for a tel: link.
export const telLink = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
