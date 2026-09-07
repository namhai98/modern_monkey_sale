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

export function resizeUnsplash(url, w) {
  if (!url || !url.includes('images.unsplash.com')) return url;
  return url.replace(/([?&])w=\d+/, `$1w=${w}`);
}
