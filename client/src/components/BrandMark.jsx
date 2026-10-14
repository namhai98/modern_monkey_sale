// Third-party brand logos — the one exception to "every icon is lucide",
// used on the sign-in buttons and the link to the boutique's Facebook page.
// lucide ships no brand marks, and Google's and Meta's sign-in guidelines ask
// for their own logo on their buttons. Drawn in one colour (currentColor), at
// the same size and stroke as the lucide icons around them, so the two
// sign-in buttons stay inside the house palette.
const MARKS = {
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  // A single-stroke G: the four-segment silhouette turns to mush at 16px when
  // drawn as an outline rather than filled.
  google: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.49-6.01" />
      <path d="M20.5 12H13" />
    </>
  ),
};

export const isBrandMark = (name) => Object.hasOwn(MARKS, name);

export default function BrandMark({ name, className = 'h-4 w-4', strokeWidth = 1.5 }) {
  const mark = MARKS[name];
  if (!mark) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {mark}
    </svg>
  );
}
