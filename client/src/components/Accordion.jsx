import Icon from './Icon';

/* A hairline-divided accordion — the same shape as the presentation site's FAQ:
   micro-type title, a plus that rotates into an × as it opens, and the open row
   in gold. The body stays in the DOM and is collapsed with grid-template-rows,
   so it is always findable by in-page search and never JS-gated.

   `body` may be a string or a node (FAQ answers carry links). `id` ties the
   button to its panel for assistive tech. */
export default function Accordion({ id, title, body, open, onToggle, bodyClassName = 'max-w-md' }) {
  const panelId = id ? `${id}-panel` : undefined;
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`micro flex min-h-11 w-full items-center justify-between gap-4 py-5 text-left transition-colors duration-300 ${
          open ? 'text-gold' : 'text-foreground hover:text-gold'
        }`}
      >
        {title}
        {/* A lucide plus that turns into an ×: a typed "+" sat a pixel or two
            off-centre depending on the font's metrics. */}
        <Icon
          name="plus"
          className={`h-4 w-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
        />
      </button>
      <div
        id={panelId}
        className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className={`pb-6 text-sm leading-relaxed text-muted ${bodyClassName}`}>{body}</div>
        </div>
      </div>
    </div>
  );
}
