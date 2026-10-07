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
    facebook: 'https://www.facebook.com/modern.monkey.time',
    // m.me/<page username> opens a chat with that page, so this has to track
    // the Facebook page's username above.
    messenger: 'https://m.me/modern.monkey.time',
  },
  // The boutique's own Google Maps pin (Gem Castle shopping mall). Every
  // address on the site links here.
  mapsUrl: 'https://maps.app.goo.gl/nFwzkh7mXHujgmYR7',
};

export const telHref = (phone) => `tel:+976${phone}`;
