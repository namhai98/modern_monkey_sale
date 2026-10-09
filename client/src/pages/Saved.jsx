import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import PageHero from '../components/PageHero';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import Section from '../components/Section';
import { ProductGridSkeleton } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useWishlist } from '../context/WishlistContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';

/* Saved pieces. Products are fetched once and kept by id, so un-hearting one
   here removes its card at once without refetching the rest. Pieces the shop
   has since hidden or deleted simply don't come back from the API. */
export default function Saved() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { ids } = useWishlist();
  const [byId, setById] = useState({});
  const [loading, setLoading] = useState(true);
  useDocumentTitle(t('wishlist.title'));

  const missing = ids.filter((id) => !(id in byId));
  const missingKey = missing.join(',');

  useEffect(() => {
    if (!missingKey) {
      setLoading(false);
      return undefined;
    }
    let live = true;
    const want = missingKey.split(',').map(Number);
    setLoading(true);
    client
      .get('/products', { params: { ids: missingKey, limit: want.length } })
      .then((res) => {
        if (!live) return;
        setById((prev) => {
          const next = { ...prev };
          for (const id of want) next[id] = null; // asked for, not returned → gone
          for (const p of res.data.items) next[p.id] = p;
          return next;
        });
      })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [missingKey]);

  const items = ids.map((id) => byId[id]).filter(Boolean);

  return (
    <>
      <PageHero
        compact
        eyebrow={t('wishlist.eyebrow')}
        title={t('wishlist.title')}
        lead={!user && ids.length > 0 ? t('wishlist.guestNote') : undefined}
      />

      <Section pad="content">
        {loading && items.length === 0 ? (
          <ProductGridSkeleton count={Math.min(Math.max(ids.length, 4), 8)} />
        ) : items.length === 0 ? (
          <EmptyState
            inline
            title={t('wishlist.empty')}
            body={t('wishlist.emptyBody')}
            actions={<Button to="/shop?all=1">{t('wishlist.browse')}</Button>}
          />
        ) : (
          <>
            <p className="micro mb-10 tracking-meta text-muted">{t('wishlist.count', { n: items.length })}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
              {items.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 7) * 0.06}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
            {!user && (
              <p className="mt-16 text-center text-sm text-muted">
                <Link to="/login?redirect=%2Fsaved" className="link-lux text-gold">
                  {t('wishlist.signIn')}
                </Link>
              </p>
            )}
          </>
        )}
      </Section>
    </>
  );
}
