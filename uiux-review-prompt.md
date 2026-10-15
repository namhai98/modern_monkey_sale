# Modern Monkey — UI/UX сайжруулах prompt (2026-10-13 review)

Доорх "PROMPT" хэсгийг бүтнээр нь хуулж Claude Code (эсвэл Cursor)-д энэ repo-г нээгээд өгнө үү.
Review-г `client/src` кодыг уншиж хийсэн (commit 3473154).

---

## PROMPT

Чи бол luxury fashion e-commerce-д мэргэшсэн senior product designer + frontend engineer.
Энэ repo бол **Modern Monkey** — Монголд цүнх, цаг, хувцас зардаг жижиг тансаг "maison"-ы дэлгүүр.
Stack: React 19 + Vite + Tailwind v4 (`client/`), Express + PostgreSQL (`server/`). Хэл: MN (үндсэн) + EN, dark (үндсэн) + light theme.

### Ажиллах дүрэм
1. Эхлээд `client/src/index.css` (design tokens), `components/Button.jsx`, `components/ProductCard.jsx`, `pages/Home.jsx`, `pages/ProductDetail.jsx`, `pages/Shop.jsx`, `pages/Checkout.jsx`, `lib/i18n.js`-г уншиж одоогийн design system-ийг ойлго.
2. **Одоо байгаа систем дотор ажилла**: token (`--color-gold`, `--tracking-*`, `container-lux`, `link-lux`, `eyebrow`, `micro`), Button-ий variant-ууд, кодын тайлбар (comment)-ын хэв маягийг хадгал. Шинэ өнгө/хэмжээг call site дээр hard-code хийхгүй — token нэм.
3. Текст бүрийг `lib/i18n.js`-ийн **MN ба EN хоёуланд** нь нэм/засна. Монгол текст англиас ~2 дахин урт гэдгийг 375px дээр шалга.
4. Доорх ажлуудыг **P0 → P1 → P2** дарааллаар, нэг бүлэг бүрийг тусад нь commit хий. Backend-ийн API хэлбэрийг өөрчлөх шаардлагатай бол эхлээд надаас асуу.
5. Бүлэг бүрийн дараа `npm run build` + `npm run lint` ажиллуулж, 375 / 768 / 1280 / 1440px дээр dark ба light, MN ба EN-ээр screenshot авч шалга.

---

### P0 — Борлуулалтад шууд нөлөөлөх

**1. Guest checkout**
- Одоо `App.jsx`-д `/checkout` нь `ProtectedRoute` дотор байгаа тул худалдан авагч заавал бүртгүүлж/нэвтэрч байж захиална. Тансаг брэндүүд (LV, Hermès) guest checkout зөвшөөрдөг.
- Нэвтрээгүй хэрэглэгчид checkout дээр "Зочноор үргэлжлүүлэх" (утас + имэйл) ба "Нэвтрэх" гэсэн хоёр замыг ижил жинтэйгээр санал болго. Захиалгын дараа "Бүртгэл үүсгэвэл захиалгаа хянах боломжтой" гэж санал болго.
- Server талын `POST /orders` guest-ийг дэмжихгүй бол юу өөрчлөх хэрэгтэйг тоймлоод надаас асуу.

**2. Монгол хаягийн form**
- `Checkout.jsx` одоо Postcode ба Country-г **заавал** бөглүүлдэг — Монголд шуудангийн кодыг бараг хэн ч мэддэггүй, улс нь бараг үргэлж Монгол.
- Шинэ бүтэц: Хот/Аймаг (select, Улаанбаатар default) → Дүүрэг/Сум (select) → Хороо/Баг → Байр, орц, тоот → Нэмэлт тайлбар (жишээ: "орцны код 1234", "ажлын цагаар"). Postcode-г хасах эсвэл optional болго; Country-г нуух (EN locale дээр л харуулж болно).
- Утасны дугаарыг 8 оронтой Монгол формат (`9911 2233`) болгон автоматаар форматла, буруу бол field дээр нь ойлгомжтой алдаа харуул.
- `shipping_address` free-text рүү нийлүүлэх одоогийн логикийг хадгал (backend өөрчлөхгүй).

**3. Төлбөр ба дараагийн алхмыг тодорхой болгох**
- Step rail нь "Сагс — Мэдээлэл — Баталгаажуулалт" гэж 3 алхам харуулдаг ч бодит байдал дээр нэг л хуудас. Алхмуудыг бодит болго эсвэл rail-ыг хас.
- `checkout.demoNote` ("Вэбсайт дээр төлбөр авахгүй...") нь саарал жижиг box дотор нуугдсан. Захиалгын товчны яг дээр "Захиалсны дараа юу болох вэ" гэсэн 3 алхамт тодорхой блок болго: (1) бид 30 минутад залгана → (2) QPay / дансаар төлнө → (3) хүргэлт X хоногт. Тоо, хугацааг `lib/site.js`-д нэг газар тохируулдаг болго.
- `OrderDetail` (`?placed=1`) хуудсанд захиалгын дугаар, дараагийн алхам, холбоо барих утсыг тод харуул.

**4. Light theme дээрх gold текстийн contrast (WCAG AA fail)**
- `#c8a24a` gold нь цагаан (#fff) дээр ~2.4:1 contrast — жижиг текстэд 4.5:1 шаардлагатай. `text-gold` кодонд ~140 газар, eyebrow, үнэ, хямдралын хувь, link-үүд бүгд light theme дээр уншигдахад хэцүү.
- Theme-reactive `--accent-text` token нэм (dark: `#c8a24a`, light: ~`#8a6a1f` орчим, ≥4.5:1 болохыг шалга) ба текстэд хэрэглэгддэг `text-gold`-ийг үүн рүү шилжүүл. Gold **дэвсгэр** (Button gold variant, selection, scrollbar)-ийг өөрчлөхгүй.
- `muted` өнгийг хоёр theme дээр `surface` дэвсгэр дээр бас шалга.

---

### P1 — Брэндийн мэдрэмж ("quiet luxury")

**5. Lobster script font-ыг солих**
- `gold-script` utility нь Lobster ашигладаг — энэ нь 1950-иад оны retro, хөгжилтэй script бөгөөд Montserrat-тай хослоод "тансаг maison" биш "кафе/bakery" мэдрэмж төрүүлдэг.
- Кирилл дэмждэг нарийн serif italic-аар соль (санал: **Cormorant Garamond Italic 500** эсвэл **Playfair Display Italic**). `--font-script` token-ийг л солиход хангалттай байх ёстой; `index.html` дахь Google Fonts линкийг шинэчил. Хэмжээ, line-height-ийг hero, CategoryBanner, Statement дээр дахин тохируул.
- Гарчгийн font (Montserrat) хэвээр үлдэх эсэхийг screenshot-оор харьцуулж, 2 хувилбар санал болго — шийдвэрийг надад үлдээ.

**6. Hero-г цэвэрлэх**
- Hero дээр "Цуглуулга үзэх" ба **"Хямдрал"** хоёр CTA зэрэгцэн байна. Тансаг брэнд нүүр хуудасныхаа хамгийн том дэлгэц дээр хямдрал зардаггүй. "Хямдрал"-ыг hero-оос хасаад nav/shop filter-т үлдээ; hero-д ганц primary CTA (+ хүсвэл "Түүх" рүү text-link).
- Hero гарчгийг богиносгож нэг санаа болго; support мөр 1 өгүүлбэр.

**7. Copy / хэлний алдаа**
- `home.hero.title2` (MN): "Тансаг Байдлыг Зөвхөн **Таньд**" → "Танд" (зөв бичиг), Монгол хэлэнд Title Case хэрэглэхгүй → "тансаг байдлыг зөвхөн танд".
- `home.hero.support` (MN): "зэрэглэ**лл**ийн" → "зэрэглэлийн".
- `lib/i18n.js`-ийн MN текстийг бүхэлд нь зөв бичгийн дүрэм, Title Case, англи үгийн шууд орчуулгын хувьд шалгаж, олдсон бүх засварын жагсаалтыг надад харуул.
- `index.html`-д canonical / og:url нь `modernmoney.netlify.app` ("monkey" биш "money") — бодит домэйнтэй тулгаж, буруу бол засах эсэхийг надаас асуу.

**8. Product card**
- Hover дээр доороос гарч ирдэг "Үзэх" caption panel нь утсан дээр огт харагдахгүй, desktop дээр зураг дээр илүүдэл давхарга нэмдэг. Хас — hover зураг солигдох нь хангалттай дохио.
- Хямдралын % ба "Цөөхөн үлдсэн" хоёр badge нэг зураг дээр хоёр буланд зэрэг гарч болно. Нэг л badge (давуу эрэмбэ: Sold out > Low stock > Sale) харуул, хямдралыг үнийн мөрөнд л үлдээ.

---

### P2 — Navigation, PDP, нарийн ширийн

**9. Shop entry**
- `/shop` (параметргүй) нь `CategoryChooser` — бүтээгдэхүүн харахаас өмнө нэг нэмэлт click. Nav-ын "Shop"/footer линкүүд хаашаа очдогийг шалга; шууд listing (`?all=1`) + дээд талын category bar хангалттай эсэхийг үнэл. Chooser-ыг хадгалах бол дор нь шинэ/онцлох бүтээгдэхүүний мөр нэм.

**10. Product detail page**
- Add-to-bag товчны дор хүргэлтийн хугацаа ("Улаанбаатарт 24–48 цагт"), буцаалт, жинхэнэ эсэхийн баталгааг 3 жижиг мөрөөр харуул (accordion-д нуулгүй).
- Gallery ба info хоёулаа `lg:sticky` — урт description/accordion нээгдэхэд scroll зөрөхгүй байгааг 1280×720 дээр шалга.
- Хэмжээ сонгоогүй үед товч "Хэмжээ сонгох" болдог нь зөв; товч дээр дарахад хэмжээний хэсэг рүү scroll + богино highlight хий (одоо disabled тул дарахад юу ч болохгүй).

**11. Floating contact**
- Desktop дээр 3 дугуй товч (FB, Messenger, утас) байнга харагддаг нь "quiet luxury"-д хэт чанга. Desktop дээр ч mobile шиг нэг "Холбогдох" товч болгож нээгддэг болго.

**12. Accessibility шалгалт**
- Keyboard-оор: mega menu, search overlay, cart drawer, size guide, mobile menu — focus trap, Esc, focus буцаалт.
- `prefers-reduced-motion` бүх reveal/parallax/line-in анимацид үйлчилж байгааг шалга.
- Touch target ≥ 44px (heart, quantity stepper, filter checkbox).

---

### Хүлээлгэн өгөх зүйл
- Бүлэг бүрт: юу өөрчилсөн, яагаад, өмнө/дараа screenshot.
- Надаас шийдвэр хүссэн зүйлсийн жагсаалт (guest checkout backend, гарчгийн font, canonical домэйн, shop entry).
- Хийгээгүй/хойшлуулсан зүйл байвал шалтгаантай нь.
