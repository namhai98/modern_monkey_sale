/* Business facts for the maison — the same values the presentation site keeps
   in lib/site.ts, so the storefront's navbar, footer, floating contact and
   "visit the boutique" band quote one address, one set of hours and one pair of
   phone numbers. Change them here, nowhere else. */
export const site = {
  name: 'Modern Monkey',
  address: {
    lines: ['Хүнсний 4-р дэлгүүр', 'Gem Castle худалдааны төв', '5 давхар, 512–513 тоот'],
    city: 'Ulaanbaatar',
    country: 'Mongolia',
  },
  hours: { open: '10:00', close: '20:00' },
  phones: ['99819141', '88039140'],
  social: {
    facebook: 'https://www.facebook.com/modernmonkey.mn',
    instagram: 'https://www.instagram.com/modernmonkey.mn',
    messenger: 'https://m.me/modernmonkey.mn',
  },
  mapQuery: 'Gem Castle Center, Ulaanbaatar, Mongolia',
};

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  site.mapQuery
)}`;

export const telHref = (phone) => `tel:+976${phone}`;
