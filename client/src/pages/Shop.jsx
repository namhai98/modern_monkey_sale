import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { CategoryChooser } from './shop/CategoryChooser';
import { Listing } from './shop/Listing';

export default function Shop() {
  const [params] = useSearchParams();
  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const all = params.get('all') === '1';
  const sale = params.get('sale') === '1';
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    client
      .get('/categories')
      // A category with nothing in it is a dead end in the bar and the chooser,
      // so it stays hidden until it has products.
      .then((res) => setCategories(res.data.filter((c) => (c.product_count ?? 1) > 0)))
      .catch(() => { });
  }, []);

  if (!category && !q && !all && !sale) return <CategoryChooser categories={categories} />;
  return <Listing categories={categories} />;
}
