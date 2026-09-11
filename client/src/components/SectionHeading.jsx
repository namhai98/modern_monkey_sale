import Reveal from './Reveal';

/* Every section opener on the presentation site is this exact stack:
   gold eyebrow → serif h2 → optional lead, capped at max-w-2xl and revealed
   as one block. `dark` switches the copy colours for a fixed-dark band. */
export default function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  dark = false,
  className = '',
  as: Heading = 'h2',
  action,
}) {
  const centred = align === 'center';

  return (
    <Reveal
      className={[
        centred ? 'max-w-2xl mx-auto text-center' : 'max-w-2xl',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Heading
        className={`heading-serif mt-5 text-4xl leading-[1.08] md:text-5xl ${
          dark ? 'text-white' : 'text-foreground'
        }`}
      >
        {title}
      </Heading>
      {lead && (
        <p
          className={`mt-6 text-base leading-relaxed md:text-lg ${
            dark ? 'text-white/60' : 'text-muted'
          }`}
        >
          {lead}
        </p>
      )}
      {action && <div className={`mt-8 ${centred ? 'flex justify-center' : ''}`}>{action}</div>}
    </Reveal>
  );
}

/* A lighter opener for rows that need a heading and a "view all" on one line —
   the product strips on the home page and the related-products rail. */
export function RowHeading({ eyebrow, title, action, dark = false, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {title && (
          <h2
            className={`heading-serif mt-3 text-2xl md:text-3xl ${
              dark ? 'text-white' : 'text-foreground'
            }`}
          >
            {title}
          </h2>
        )}
      </div>
      {action}
    </div>
  );
}
