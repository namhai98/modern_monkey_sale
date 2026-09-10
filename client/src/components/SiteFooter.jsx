import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import LangSwitch from './LangSwitch';

export default function SiteFooter({ flush = false }) {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <footer className={`bg-ivory text-ink ${flush ? '' : 'mt-20 md:mt-32'}`}>
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="max-w-md">
          <p className="eyebrow text-ink/60">{t('footer.letter.eyebrow')}</p>
          <h3 className="font-display text-3xl mt-3 mb-6">{t('footer.letter.title')}</h3>
          {done ? (
            <p className="text-ink/70 text-sm">{t('footer.letter.thanks')}</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDone(true);
              }}
              className="flex items-center gap-4 border-b border-ink/30 pb-2"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.letter.placeholder')}
                className="flex-1 bg-transparent text-sm placeholder:text-ink/40 focus:outline-none"
              />
              <button type="submit" className="eyebrow text-ink/80 hover:text-ink">
                {t('footer.letter.subscribe')}
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-14 md:mt-20 text-sm text-ink/60">
          <div className="space-y-2">
            <p className="eyebrow text-ink/40 mb-3">{t('footer.col.shop')}</p>
            <Link to="/shop?category=bags" className="block hover:text-ink">{t('nav.bags')}</Link>
            <Link to="/shop?category=watches" className="block hover:text-ink">{t('nav.watches')}</Link>
            <Link to="/shop?category=apparel" className="block hover:text-ink">{t('nav.apparel')}</Link>
          </div>
          <div className="space-y-2">
            <p className="eyebrow text-ink/40 mb-3">{t('footer.col.care')}</p>
            <span className="block">{t('footer.care.shipping')}</span>
            <span className="block">{t('footer.care.product')}</span>
            <span className="block">{t('footer.care.contact')}</span>
          </div>
          <div className="space-y-2">
            <p className="eyebrow text-ink/40 mb-3">{t('footer.col.house')}</p>
            <span className="block">{t('footer.house.story')}</span>
            <span className="block">{t('footer.house.craft')}</span>
            <span className="block">{t('footer.house.sustain')}</span>
          </div>
          <div className="space-y-2">
            <p className="eyebrow text-ink/40 mb-3">{t('footer.col.account')}</p>
            <Link to="/orders" className="block hover:text-ink">{t('nav.orders')}</Link>
            <Link to="/profile" className="block hover:text-ink">{t('nav.profile')}</Link>
          </div>
        </div>

        <div className="mt-14 md:mt-20 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-ink/40">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <LangSwitch className="text-ink" />
        </div>
      </div>
    </footer>
  );
}
