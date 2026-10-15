import { useSkin } from '../context/SkinContext';
import Icon from './Icon';
import TextButton from './TextButton';

/* Previous · 3 / 12 · Next — the one pager for every paged list (the shop
   listing and the admin tables). Text actions on the house hairline, the
   current page in gold; renders nothing when there's only one page.
   In the admin it is Flowbite's pagination: the page count on the left, a
   joined pair of bordered buttons on the right.
   `onChange` receives the page number to go to. */
export default function Pager({ page, totalPages, onChange, prevLabel, nextLabel, className = '' }) {
  const admin = useSkin() === 'admin';
  if (totalPages <= 1) return null;
  if (admin) {
    const btn =
      'inline-flex h-9 items-center gap-1.5 border border-admin-field-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-admin-hover disabled:pointer-events-none disabled:opacity-50';
    return (
      <div className={`flex items-center justify-between gap-4 ${className}`}>
        <span className="text-sm text-muted tabular-nums" aria-live="polite">
          <span className="font-semibold text-foreground">{page}</span> / {totalPages}
        </span>
        <div className="inline-flex -space-x-px">
          <button type="button" className={`${btn} rounded-s-lg`} onClick={() => onChange(page - 1)} disabled={page <= 1}>
            <Icon name="arrowLeft" className="h-4 w-4" />
            {prevLabel}
          </button>
          <button type="button" className={`${btn} rounded-e-lg`} onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
            {nextLabel}
            <Icon name="arrowRight" className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center gap-8 ${className}`}>
      <TextButton onClick={() => onChange(page - 1)} disabled={page <= 1}>
        {prevLabel}
      </TextButton>
      <span className="micro tabular-nums" aria-live="polite">
        <span className="text-gold">{page}</span>
        <span className="text-muted"> / {totalPages}</span>
      </span>
      <TextButton onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        {nextLabel}
      </TextButton>
    </div>
  );
}
