import TaxonomyPage from './Taxonomy';

// Category names have shop-facing translations (Bags → Цүнх), shown under the name.
export default function AdminCategories() {
  return <TaxonomyPage endpoint="categories" ns="categories" localize />;
}
