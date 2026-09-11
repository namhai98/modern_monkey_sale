import { useLocale } from '../context/LocaleContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

export default function NotFound() {
  const { t } = useLocale();
  useDocumentTitle(t('notFound.title'));
  return (
    <EmptyState
      eyebrow="404"
      title={t('notFound.title')}
      body={t('notFound.body')}
      actions={
        <>
          <Button to="/">{t('notFound.home')}</Button>
          <Button to="/shop?all=1" variant="outline">
            {t('notFound.shop')}
          </Button>
        </>
      }
    />
  );
}
