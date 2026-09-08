// Editorial imagery for the storefront. Swap these URLs for your own campaign
// photography — every consumer uses `img()` so sizing stays consistent.
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

// Home page only — black + yellow art direction. Local campaign shots live in
// client/public/home/ ; the rest of the site keeps `media` above.
export const homeMedia = {
  hero: '/home/hero.jpg', // model + bag, black / gold
  editorialLeft: U('1490114538077-0a7f8cb49891', 1400), // dark plaid + leather
  bands: {
    bags: '/home/bag.jpg', // model + black bag, cream / gold
    watches: U('1469334031218-e382a71b716b', 2000),
    apparel: U('1495121605193-b116b5b9c5fe', 2000),
  },
  atelier: '/home/banner.jpg', // wide product still-life
};

export function resizeUnsplash(url, w) {
  if (!url || !url.includes('images.unsplash.com')) return url;
  return url.replace(/([?&])w=\d+/, `$1w=${w}`);
}
