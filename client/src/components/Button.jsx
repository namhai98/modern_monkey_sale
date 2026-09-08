import { Link } from 'react-router-dom';

const base =
  'inline-flex items-center justify-center text-center eyebrow whitespace-nowrap ' +
  'transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
  'disabled:opacity-40 disabled:pointer-events-none select-none';

const variants = {
  // dark background, light text, subtle invert on hover
  primary: 'bg-ink text-canvas border border-ink hover:bg-canvas hover:text-ink',
  // transparent, hairline border, cleaner hover
  secondary: 'bg-transparent text-ink border border-line hover:border-ink',
  // for placing over dark imagery (hero)
  onDark: 'bg-transparent text-canvas border border-canvas/70 hover:bg-canvas hover:text-ink',
};

const sizes = {
  sm: 'h-9 px-6',
  md: 'h-11 px-8',
  lg: 'h-12 px-10',
};

export default function Button({
  to,
  href,
  as,
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  children,
  ...props
}) {
  const cls = [base, variants[variant], sizes[size], full ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    );
  }
  const Tag = as || 'button';
  return (
    <Tag className={cls} {...props}>
      {children}
    </Tag>
  );
}
