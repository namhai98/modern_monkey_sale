import { useCallback, useEffect, useRef, useState } from 'react';
import client from '../api/client';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../context/ToastContext';
import Button from './Button';
import Skeleton from './Skeleton';

/* Pay a pending order with QPay, on its order page.

   The QR leads on a wide screen, where the shopper scans it with the phone in
   their hand; on a phone — which can't scan its own screen — the bank-app
   buttons lead, and the QR follows for paying from a second device.

   While the panel is open it asks the server every few seconds whether the
   money has landed (the server checks with QPay; QPay's callback does the same
   from the other side), so a shopper who pays never has to press anything. */

const POLL_MS = 5000;
const POLL_FOR_MS = 15 * 60 * 1000;
// QPay lists twenty-odd wallets and banks. Two rows of four keep the whole
// panel on one screen; the rest wait behind one tap.
const BANKS_SHOWN = 8;

// A bank's logo, hot-linked from QPay. If it can't load, the bank's initial
// stands in rather than a broken-image glyph.
function BankLogo({ src, label }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-sm text-muted">
        {(label || '?').trim().charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-9 w-9 rounded-lg object-contain"
    />
  );
}

export default function QPayPanel({ orderId, onPaid }) {
  const { t } = useLocale();
  const { success } = useToast();
  const [state, setState] = useState('loading'); // loading | ready | paid | error | off
  const [payment, setPayment] = useState(null);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const [allBanks, setAllBanks] = useState(false);
  // On a touch screen the bank buttons are the way to pay and the QR waits
  // behind a tap (it is for paying from a second device); with a mouse the
  // QR is always shown.
  const [showQr, setShowQr] = useState(false);
  const startedAt = useRef(Date.now());
  const done = useRef(false);

  const settle = useCallback(
    (data) => {
      setPayment(data.payment);
      if (data.payment?.status === 'paid' || data.order_status !== 'pending') {
        if (!done.current) {
          done.current = true;
          setState('paid');
          if (data.payment?.status === 'paid') success(t('qpay.paidToast'));
          onPaid?.();
        }
        return true;
      }
      return false;
    },
    [onPaid, success, t]
  );

  const start = useCallback(() => {
    setState('loading');
    client
      .post(`/payments/qpay/${orderId}`)
      .then(({ data }) => {
        if (!settle(data)) setState('ready');
      })
      .catch((err) => setState(err.response?.data?.code === 'PAYMENTS_DISABLED' ? 'off' : 'error'));
  }, [orderId, settle]);

  useEffect(() => {
    start();
  }, [start]);

  const check = useCallback(
    async ({ manual = false } = {}) => {
      if (manual) setChecking(true);
      try {
        const { data } = await client.get(`/payments/qpay/${orderId}`);
        const paid = settle(data);
        if (manual) setNotYet(!paid);
      } catch {
        if (manual) setNotYet(true);
      } finally {
        if (manual) setChecking(false);
      }
    },
    [orderId, settle]
  );

  // Poll while the invoice is open and the tab is in view.
  useEffect(() => {
    if (state !== 'ready') return undefined;
    const id = setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - startedAt.current > POLL_FOR_MS) return clearInterval(id);
      check();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [state, check]);

  if (state === 'off') return null;

  const frame = 'border border-gold/40 bg-surface p-6 md:p-8';

  if (state === 'loading') {
    return (
      <div className={frame} aria-busy="true">
        <p className="eyebrow">{t('qpay.eyebrow')}</p>
        <p className="mt-3 text-sm text-muted">{t('qpay.loading')}</p>
        <div className="mt-6 grid gap-6 md:grid-cols-[13rem_1fr]">
          <Skeleton className="aspect-square w-full max-w-[13rem]" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={frame}>
        <p className="eyebrow">{t('qpay.eyebrow')}</p>
        <p role="alert" className="mt-3 text-sm text-danger">
          {t('qpay.failed')}
        </p>
        <Button as="button" type="button" variant="outline-dark" size="sm" className="mt-5" onClick={start}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (state === 'paid') {
    return (
      <div className={frame} role="status">
        <p className="eyebrow">{t('qpay.eyebrow')}</p>
        <p className="heading-serif mt-3 text-2xl text-gold">{t('qpay.paid')}</p>
      </div>
    );
  }

  const amount = `${Number(payment?.amount_mnt || 0).toLocaleString('en-US')}₮`;
  const banks = (payment?.urls || []).filter((u) => u.link);
  const collapsed = !allBanks && banks.length > BANKS_SHOWN;

  return (
    // A container: the panel sits full width on a phone and in half a page on
    // a tablet or computer, so its columns follow its own width, not the screen's.
    <section className={`@container ${frame}`} aria-labelledby="qpay-title">
      <p id="qpay-title" className="eyebrow">
        {t('qpay.eyebrow')}
      </p>

      {/* Two columns only while the QR is on screen — a hidden QR must not
          leave its column behind. */}
      <div
        className={`mt-5 flex flex-col gap-6 @md:grid @md:gap-8 ${
          showQr ? '@md:grid-cols-[13rem_1fr]' : '@md:pointer-fine:grid-cols-[13rem_1fr]'
        }`}
      >
        {/* The QR on a white ground in both themes — a scanner reads dark on
            light. Second on a phone, first beside the amount on a tablet up. */}
        {payment?.qr_image && (
          <figure className={`order-last @md:order-none ${showQr ? '' : 'pointer-coarse:hidden'}`}>
            <img
              src={`data:image/png;base64,${payment.qr_image}`}
              alt={t('qpay.qrAlt', { id: orderId })}
              className="aspect-square w-full max-w-[13rem] border border-line bg-white p-3"
            />
            <figcaption className="micro mt-3 text-balance tracking-meta text-muted">{t('qpay.scan')}</figcaption>
          </figure>
        )}

        <div className="min-w-0">
          <p className="micro text-muted">{t('qpay.amount')}</p>
          <p className="heading-serif mt-2 text-3xl tabular-nums">{amount}</p>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="flex items-center gap-3 text-sm text-muted" role="status">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
              </span>
              {t('qpay.waiting')}
            </p>
            {payment?.qr_image && (
              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                aria-expanded={showQr}
                className="link-lux tap-area micro shrink-0 tracking-meta text-muted hover:text-gold pointer-fine:hidden"
              >
                {t('qpay.showQr')}
              </button>
            )}
          </div>

          {/* Bank apps open by deep link, which only a phone or tablet can
              follow — on a computer with a mouse the QR is the way, so the
              buttons step aside and the panel stays one screen tall. */}
          {banks.length > 0 && (
            <div className="pointer-fine:hidden">
              <p className="micro mt-6 text-muted">{t('qpay.banks')}</p>
              <ul className="mt-3 grid grid-cols-4 gap-1.5 @xl:grid-cols-8">
                {(collapsed ? banks.slice(0, BANKS_SHOWN - 1) : banks).map((b) => (
                  <li key={b.name}>
                    <a
                      href={b.link}
                      className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 border border-line p-1.5 text-center transition-colors duration-300 hover:border-gold/50"
                    >
                      <BankLogo src={b.logo} label={b.description || b.name} />
                      <span className="line-clamp-2 text-[0.65rem] leading-tight text-muted">{b.description || b.name}</span>
                    </a>
                  </li>
                ))}
                {/* The last cell of the second row opens the rest, so the
                    grid never grows a third row until asked. */}
                {collapsed && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setAllBanks(true)}
                      className="flex h-full min-h-[4.5rem] w-full items-center justify-center border border-dashed border-line p-1.5 text-[0.7rem] tracking-meta text-muted transition-colors duration-300 hover:border-gold/50 hover:text-gold"
                    >
                      {t('qpay.moreBanks', { n: banks.length - (BANKS_SHOWN - 1) })}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <Button
              as="button"
              type="button"
              variant="outline-dark"
              size="sm"
              disabled={checking}
              onClick={() => check({ manual: true })}
            >
              {checking ? t('qpay.checking') : t('qpay.check')}
            </Button>
          </div>
          {notYet && <p className="mt-3 text-sm text-muted">{t('qpay.notYet')}</p>}
        </div>
      </div>
    </section>
  );
}
