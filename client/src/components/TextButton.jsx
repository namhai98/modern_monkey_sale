import { Link } from 'react-router-dom';

/* The house text action: uppercase micro-type with the link-lux hairline
   sweep — "Close", "Remove", "Previous", "View all". It used to be written out
   by hand at every call site; this is that string in one place.

   The visible text is ~17px tall, far under a 44px tap target, so an
   invisible ::before box extends the hit area instead of padding — padding
   would move link-lux's underline away from the text and push surrounding
   layout around. (link-lux already makes the element position: relative.)

   tone="muted" for secondary actions, tone="gold" for the forward call to
   action at the end of a row (set one step wider, on the button rung), and
   tone="ink" on fixed-dark surfaces (overlays, the footer), where the
   theme-reactive muted grey would be too dark in the light theme. */
const BASE =
  "link-lux micro transition-colors duration-300 before:absolute before:-inset-x-2 before:-inset-y-3 before:content-[''] disabled:pointer-events-none disabled:opacity-40";
const TONES = {
  muted: 'text-muted hover:text-gold',
  gold: 'tracking-button text-gold',
  ink: 'text-white/60 hover:text-gold',
};

export default function TextButton({ to, href, tone = 'muted', className = '', type = 'button', ...rest }) {
  const cls = `${BASE} ${TONES[tone] || TONES.muted} ${className}`;
  if (to) return <Link to={to} className={cls} {...rest} />;
  if (href) return <a href={href} className={cls} {...rest} />;
  return <button type={type} className={cls} {...rest} />;
}
