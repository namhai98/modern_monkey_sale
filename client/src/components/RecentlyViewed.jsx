import { useEffect, useState } from 'react';
import client from '../api/client';
import ProductRow from './ProductRow';
import Section from './Section';
import { RowHeading } from './SectionHeading';
import { useLocale } from '../context/LocaleContext';
import { getRecent } from '../lib/recent';

/* "Recently viewed" — the pieces this visitor last opened, newest first.
   `excludeId` leaves out the product on screen; nothing renders until there
   are at least `min` pieces worth showing. */
export default function RecentlyViewed({ excludeId, min = 1, tone, limit = 4 }) {
  const { t } = useLocale();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const ids = getRecent(excludeId).slice(0, limit);
    if (ids.length < min) {
      setItems([]);
      return undefined;
    }
    let live = true;
    client
      .get('/products', { params: { ids: ids.join(','), limit: ids.length } })
      .then((res) => {
        if (!live) return;
        // The API returns its own order; put them back in viewing order.
        const byId = new Map(res.data.items.map((p) => [p.id, p]));
        setItems(ids.map((i) => byId.get(i)).filter(Boolean));
      })
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [excludeId, min, limit]);

  if (items.length < min) return null;

  return (
    <Section tone={tone} pad="content">
      <RowHeading eyebrow={t('recent.title')} />
      <ProductRow products={items} cols="md:grid-cols-2 lg:grid-cols-4" className="mt-10 md:mt-14" />
    </Section>
  );
}
