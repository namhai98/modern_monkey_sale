import TextButton from './TextButton';

/* Previous · 3 / 12 · Next — the one pager for every paged list (the shop
   listing and the admin tables). Text actions on the house hairline, the
   current page in gold; renders nothing when there's only one page.
   `onChange` receives the page number to go to. */
export default function Pager({ page, totalPages, onChange, prevLabel, nextLabel, className = '' }) {
  if (totalPages <= 1) return null;
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
