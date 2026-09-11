import { useLocale } from '../context/LocaleContext';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

export default function Forbidden() {
  const { t } = useLocale();
  return (
    <EmptyState
      eyebrow="403"
      title={t('forbidden.title')}
      body={t('forbidden.body')}
      actions={<Button to="/">{t('forbidden.home')}</Button>}
    />
  );
}
