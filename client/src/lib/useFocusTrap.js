import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Rendered and not display:none — getClientRects is empty for hidden elements,
// and unlike offsetParent it still works inside position: fixed layers.
const visible = (el) => el.getClientRects().length > 0;

/* Keep keyboard focus inside a layer while it is open, and hand it back to
   whatever opened it when it closes.

   `const ref = useFocusTrap(open, { initialFocus })` — attach `ref` to the
   layer's root (give it tabIndex={-1} so it can take focus itself when it has
   nothing focusable yet). Tab and Shift+Tab wrap at the ends; focus that has
   escaped the layer is pulled back on the next Tab. */
export function useFocusTrap(active, { initialFocus } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return undefined;

    const opener = document.activeElement;
    const focusables = () => [...root.querySelectorAll(FOCUSABLE)].filter(visible);

    // Immediately, not on a requestAnimationFrame: effects run after the
    // commit that made the layer visible (inert lifted, overlay mounted), so
    // its controls can already take focus — and rAF never fires in a
    // background tab, which left focus outside the layer there.
    const target = initialFocus?.current || focusables()[0] || root;
    target.focus({ preventScroll: true });

    function onKey(e) {
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const inside = root.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
    // initialFocus is a ref object — stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return ref;
}
