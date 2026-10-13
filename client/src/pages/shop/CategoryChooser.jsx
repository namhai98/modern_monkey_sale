import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import CollectionCard from '../../components/CollectionCard';
import PageHero from '../../components/PageHero';
import Reveal from '../../components/Reveal';
import Section from '../../components/Section';
import SectionHeading from '../../components/SectionHeading';
import { useLocale } from '../../context/LocaleContext';
import { categoryLabel } from '../../lib/i18n';
import { homeMedia, media, resizeUnsplash } from '../../lib/media';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

function categoryImage(slug) {
  // The home page's logo-free set: the older band photos showed third-party
  // marks (a monogrammed bag, a branded dial).
  return homeMedia.bands[slug] || media.editorialRight;
}

/* "All" landing: pick a collection, or search. */
export function CategoryChooser({ categories }) {
  const { t, locale } = useLocale();
  useDocumentTitle(t('shop.collection'));
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function submit(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop?all=1');
  }

  return (
    <>
      <PageHero
        eyebrow={t('shop.allPieces')}
        title={t('shop.collection')}
        lead={t('shop.choose')}
        crumbs={[{ label: t('shop.collection') }]}
      >
        <form onSubmit={submit} className="mt-10 max-w-md">
          <label htmlFor="shop-search" className="micro mb-2 block text-muted">
            {t('shop.search')}
          </label>
          <input
            id="shop-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('shop.search')}
            className="field"
          />
        </form>
        <div className="mt-8 flex flex-wrap gap-5">
          <Button to="/shop?all=1">{t('shop.everything')}</Button>
          <Button to="/shop?sale=1" variant="outline">
            {t('nav.sale')}
          </Button>
        </div>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow={t('home.collections.eyebrow')}
          title={t('home.collections.title')}
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.1} className={i % 2 === 1 ? 'lg:mt-12' : ''}>
              <CollectionCard
                to={`/shop?category=${c.slug}`}
                label={categoryLabel(locale, c)}
                index={i}
                image={resizeUnsplash(categoryImage(c.slug), 1200)}
                meta={t('shop.pieces', { n: c.product_count })}
              />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
