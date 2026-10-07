/* A hover/focus label for icon-only controls — black chip, small arrow, white
   type, after a short delay so it never flickers as the pointer crosses the
   header. Replaces the browser's native `title` bubble, which is slow, unstyled
   and can't be themed.

   Visual only: the control keeps its own aria-label, so the chip is
   aria-hidden and screen readers hear the label once. Tailwind's hover variant
   only fires on devices that can hover, so phones never see a stuck tooltip;
   keyboard users get it on :focus-visible.

   side  — 'bottom' (header, the default) or 'top' (controls near the page end)
   align — 'center', or 'end' to pin the chip's right edge to the control so it
           can't run off the right side of the screen */
const SIDE = {
  bottom: 'top-full mt-2',
  top: 'bottom-full mb-2',
};
const ALIGN = {
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};
const ARROW_SIDE = {
  bottom: 'bottom-full border-b-black',
  top: 'top-full border-t-black',
};
const ARROW_ALIGN = {
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-[calc(1.375rem-5px)]',
};

export default function Tooltip({ label, side = 'bottom', align = 'center', disabled = false, className = '', children }) {
  return (
    <span className={`group/tip relative inline-flex ${className}`}>
      {children}
      {!disabled && label && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute z-50 whitespace-nowrap bg-black px-2.5 py-1.5 font-sans text-xs font-medium normal-case tracking-normal text-white opacity-0 shadow-lg shadow-black/40 transition-opacity duration-200 group-hover/tip:opacity-100 group-hover/tip:delay-300 group-has-[:focus-visible]/tip:opacity-100 ${SIDE[side]} ${ALIGN[align]}`}
        >
          {label}
          <span className={`absolute border-[5px] border-transparent ${ARROW_SIDE[side]} ${ARROW_ALIGN[align]}`} />
        </span>
      )}
    </span>
  );
}
