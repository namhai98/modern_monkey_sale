import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function NotFound() {
  const { t } = useLocale();
  useDocumentTitle(t('notFound.title'));
  return (
    <div className="max-w-2xl mx-auto px-6 py-32 md:py-44 text-center">
      <p className="font-display text-7xl md:text-9xl text-mist leading-none">404</p>
      <h1 className="font-display text-3xl md:text-4xl mt-6">{t('notFound.title')}</h1>
      <p className="text-stone text-sm mt-4 max-w-md mx-auto">{t('notFound.body')}</p>
      <div className="mt-10 flex items-center justify-center gap-8">
        <Link to="/" className="eyebrow link-underline">{t('notFound.home')}</Link>
        <Link to="/shop" className="eyebrow link-underline">{t('notFound.shop')}</Link>
      </div>
    </div>
  );
}
