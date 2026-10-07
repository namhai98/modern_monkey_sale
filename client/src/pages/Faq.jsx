import { useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { faq } from '../lib/faq';
import { site, telHref } from '../lib/site';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Accordion from '../components/Accordion';
import Button from '../components/Button';
import PageHero from '../components/PageHero';
import Reveal from '../components/Reveal';
import Section from '../components/Section';
import SectionHeading from '../components/SectionHeading';
import TextButton from '../components/TextButton';

/* Questions grouped by topic: the group's name on the left at desktop width,
   its accordion on the right, hairlines between — the product page's care
   accordion at page scale. One question open at a time across the page. */
export default function Faq() {
  const { t, locale } = useLocale();
  const doc = faq[locale] || faq.en;
  const [open, setOpen] = useState('0-0');
  useDocumentTitle(doc.hero.title);

  return (
    <>
      <PageHero eyebrow={doc.hero.eyebrow} title={doc.hero.title} lead={doc.hero.lead} />

      <Section tone="theme">
        <div className="space-y-16 md:space-y-20">
          {doc.groups.map((group, g) => (
            <Reveal key={group.title}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
                <h2 className="eyebrow text-base tracking-label md:text-lg">{group.title}</h2>
                <div className="border-t border-line">
                  {group.items.map((item, i) => {
                    const key = `${g}-${i}`;
                    return (
                      <Accordion
                        key={key}
                        id={`faq-${key}`}
                        title={item.q}
                        open={open === key}
                        onToggle={() => setOpen(open === key ? null : key)}
                        bodyClassName="max-w-2xl"
                        body={
                          <>
                            <p>{item.a}</p>
                            {item.link && (
                              <TextButton
                                to={item.link.to}
                                href={item.link.href}
                                target={item.link.href ? '_blank' : undefined}
                                rel={item.link.href ? 'noopener noreferrer' : undefined}
                                tone="gold"
                                className="mt-4 inline-block"
                              >
                                {item.link.label}
                              </TextButton>
                            )}
                          </>
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeading align="center" title={t('faq.more.title')} lead={t('faq.more.lead')} />
        <Reveal delay={0.15} className="mt-10 flex flex-wrap justify-center gap-5">
          <Button href={telHref(site.phones[0])}>{t('home.visit.call')}</Button>
          <Button href={site.social.messenger} target="_blank" rel="noopener noreferrer" variant="outline">
            {t('float.messenger')}
          </Button>
        </Reveal>
      </Section>
    </>
  );
}
