import { useLocale } from '../context/LocaleContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { Craftsmanship, House, Statement, Visit } from '../components/BrandSections';
import PageHero from '../components/PageHero';

/* "About us" — the maison's story told with the home page's own brand
   sections, in reading order: who we are, what we believe, how a piece is
   made, then the boutique. The footer's About link lands here. */
export default function Story() {
  const { t } = useLocale();
  useDocumentTitle(t('footer.house.story'));

  return (
    <>
      <PageHero eyebrow={t('home.house.eyebrow')} title={t('footer.house.story')} lead={t('footer.blurb')} />
      <House />
      <Statement />
      <Craftsmanship />
      <Visit />
    </>
  );
}
