import { useLocale } from '../context/LocaleContext';

/* What the shop is pricing in, stated plainly next to the language switch.
   It is deliberately NOT a switcher: the catalogue has one price per product,
   quoted in tögrög at the day's live rate, so a dropdown offering a second
   currency would be an interface promising something the shop cannot do.

   It reads the same source the prices do, so it can never disagree with them —
   if the exchange feed is unreachable the storefront falls back to USD and this
   badge says USD in the same breath. */
export default function CurrencyBadge({ className = '' }) {
  const { mntRate, t } = useLocale();
  const live = Number.isFinite(Number(mntRate)) && Number(mntRate) > 0;

  const label = live ? '₮ MNT' : '$ USD';
  const title = live
    ? t('nav.currencyRate', {
        rate: Number(mntRate).toLocaleString('en-US', { maximumFractionDigits: 2 }),
      })
    : t('nav.currencyUsd');

  return (
    <span
      className={`micro cursor-default whitespace-nowrap tabular-nums opacity-50 ${className}`}
      title={title}
      aria-label={title}
    >
      {label}
    </span>
  );
}
