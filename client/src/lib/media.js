// Editorial imagery for the storefront. Swap these URLs for your own campaign
// photography. Size requests go through resizeUnsplash / unsplashSrcSet below.
const U = (id, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const media = {
  hero: U('1441984904996-e0b6ba687e04', 2000),
  editorialLeft: U('1490481651871-ab68de25d43d', 1400),
  editorialRight: U('1558769132-cb1aea458c5e', 1400),
  bands: {
    bags: U('1548036328-c9fa89d128fa', 2000),
    watches: U('1547996160-81dfa63595aa', 2000),
    apparel: U('1483985988355-763728e1935b', 2000),
  },
  atelier: U('1556905055-8f358a7a47b2', 1600),
};

// Home page only — black + gold art direction (Unsplash, free licence). The
// rest of the site keeps `media` above.
export const homeMedia = {
  // Black + gold throughout, and nothing with a legible third-party brand mark.
  hero: U('1708551452682-3f969fb4b38f', 2000), // gold watch, warm low light — highlights sit right, clear of the headline
  houseLogo: '/home/logo-gold.webp', // the gold monkey mark on black, beside "About us"
  bands: {
    bags: U('1746880223690-359948154c53', 2000), // tan leather bag, black handle, gold fitting
    watches: U('1697016938269-f9d10c14024e', 2000), // gold case, baguette-diamond bezel
    apparel: U('1618244965061-1d27b208d6e8', 2000), // camel coat against a dark green door
  },
  atelier: U('1681206659546-69d36dab5c8f', 1600), // sculpted gold clasp on black leather
  // Wide bands between the category rows; each subject sits right of centre so
  // the copy on the left stays on dark ground.
  banners: {
    watches: U('1605143185597-9fe1a8065fbb', 2000), // gold skeleton pocket watch, warm low light
    apparel: U('1619213117400-cd7f8e40381f', 2000), // woman in a dark coat, amber-lit tunnel
  },
};

// Product Care page — clean, logo-free care/detail shots (the existing bags/
// watches band photography shows visible third-party brand marks, wrong for a
// page about caring for a piece, so this gets its own small set instead).
export const productCareMedia = {
  hero: U('1732613839533-ac54fcee9d9c', 2000), // bag with a cleaning cloth and care kit, styled still life
  bags: U('1637759292654-a12cb2be085e', 1600), // tan leather bag, handle and stitching detail
  watches: U('1617317376997-8748e6862c01', 1600), // minimalist watch on dark fabric
  general: media.editorialLeft, // reuses the House section's own shot for a consistent, simple layout
};

export function resizeUnsplash(url, w) {
  if (!url || !url.includes('images.unsplash.com')) return url;
  return url.replace(/([?&])w=\d+/, `$1w=${w}`);
}

// A `srcSet` for an Unsplash URL, so the browser picks the smallest file that
// is still sharp for the slot — a phone grid cell no longer downloads the
// same 800px file a desktop does. Returns undefined for anything else (local
// files, uploaded images), which leaves the plain `src` in charge.
export function unsplashSrcSet(url, widths = [400, 600, 800, 1200]) {
  if (!url || !url.includes('images.unsplash.com') || !/[?&]w=\d+/.test(url)) return undefined;
  return widths.map((w) => `${resizeUnsplash(url, w)} ${w}w`).join(', ');
}
