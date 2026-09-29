import { useLocale } from '../context/LocaleContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { productCare } from '../lib/productCare';
import { productCareMedia } from '../lib/media';
import PageHero from '../components/PageHero';
import Section from '../components/Section';
import SectionHeading from '../components/SectionHeading';
import Reveal, { RevealScale } from '../components/Reveal';
import ImageFallback from '../components/ImageFallback';
import Icon from '../components/Icon';
import Button from '../components/Button';

/* The care checklist under a section's lead — same gold-check vocabulary the
   craftsmanship band uses for its numbered steps, just as a list here. */
function CareList({ items }) {
  return (
    <ul className="mt-7 space-y-4 border-t border-line pt-7">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-muted">
          <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* One image + copy split, the same shape Home's <House> uses. `reverse` flips
   the image to the right on desktop so the two care sections don't repeat the
   same silhouette back to back. */
function CareSection({ eyebrow, title, lead, list, image, reverse, tone }) {
  return (
    <Section tone={tone}>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <RevealScale className={reverse ? 'lg:order-2' : ''}>
          <ImageFallback src={image} alt="" className="aspect-[4/5] w-full object-cover" />
        </RevealScale>
        <div className={reverse ? 'lg:order-1 lg:pr-6' : 'lg:pl-6'}>
          <SectionHeading eyebrow={eyebrow} title={title} lead={lead} />
          {list && <CareList items={list} />}
        </div>
      </div>
    </Section>
  );
}

export default function ProductCare() {
  const { t, locale } = useLocale();
  const doc = productCare[locale] || productCare.en;
  useDocumentTitle(doc.hero.title);

  return (
    <>
      <PageHero
        eyebrow={t('productCare.eyebrow')}
        title={doc.hero.title}
        lead={doc.hero.lead}
        crumbs={[{ label: doc.hero.title }]}
      />

      <CareSection
        tone="theme"
        eyebrow={doc.bags.eyebrow}
        title={doc.bags.title}
        lead={doc.bags.lead}
        list={doc.bags.list}
        image={productCareMedia.bags}
      />

      <CareSection
        tone="surface"
        eyebrow={doc.watches.eyebrow}
        title={doc.watches.title}
        lead={doc.watches.lead}
        list={doc.watches.list}
        image={productCareMedia.watches}
        reverse
      />

      <CareSection
        tone="theme"
        eyebrow={doc.general.eyebrow}
        title={doc.general.title}
        lead={doc.general.lead}
        image={productCareMedia.general}
      />

      <Section tone="surface">
        <SectionHeading
          align="center"
          title={doc.final.title}
          lead={doc.final.lead}
        />
        <Reveal delay={0.15} className="mt-10 flex justify-center">
          <Button to="/shop?all=1">{doc.final.cta}</Button>
        </Reveal>
      </Section>
    </>
  );
}
