import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';

export default function Forbidden() {
  const { t } = useLocale();
  return (
    <div className="max-w-md mx-auto px-6 py-32 text-center">
      <p className="eyebrow text-stone">403</p>
      <h1 className="font-display text-4xl mt-3 mb-4">{t('forbidden.title')}</h1>
      <p className="text-stone mb-8">{t('forbidden.body')}</p>
      <Link to="/" className="eyebrow link-underline">
        {t('forbidden.home')}
      </Link>
    </div>
  );
}
