# Luxury E-commerce UI/UX Prompt (Claude Code / Cursor / v0-д зориулсан)

Доорх текстийг шууд хуулж аваад AI coding tool (Claude Code, Cursor, v0, Claude.ai гэх мэт) -д prompt болгон оруулаарай. Хэрэв танд өнөөгийн codebase байгаа бол эхэнд нь "Миний одоогийн стек: [Next.js/React/Tailwind г.м], хуудасны файлууд: [...]" гэж нэмж өгвөл AI илүү нарийвчлалтай ажиллана.

---

## PROMPT (хуулж ашиглах)

Чи бол luxury fashion e-commerce веб сайтын UI/UX-д мэргэшсэн senior frontend/product designer-engineer. Миний онлайн дэлгүүр гол төлөв **цүнх, цаг, хувцас** зардаг бөгөөд эдгээрийн UI/UX-ийг Louis Vuitton, Chanel, Dior, Hermès зэрэг дэлхийн тансаг зэрэглэлийн (luxury) брэндүүдийн вэбсайтын түвшинд хүргэж сайжруулах хэрэгтэй байна. Дараах зарчим, шаардлагын дагуу дизайн болон кодыг шинэчилж бич:

### 1. Ерөнхий эстетик, брэндийн мэдрэмж
- Хэт олон элемент, өнгө, badge, чимэглэлээс зайлсхийж, "quiet luxury" — цөөн боловч чанартай (less but better) зарчмаар хуудсуудыг цэвэрлэ.
- Their signature: их хэмжээний цагаан/сааралтай (whitespace) орон зай, том, өндөр чанарын зураг, нарийн (thin/light weight) типографи.
- Өнгөний палитр 2-3 үндсэн өнгөнд хязгаарла: neutral base (цагаан, ivory, бараан хар/шаргал хар) + 1 акцент өнгө (брэндийн лого өнгө). Огт "чанга" (saturated/neon) өнгө бүү хэрэглэ.
- Фонт: serif эсвэл нарийн sans-serif гарчиг (жишээ: Cormorant, Canela, Söhne, Helvetica Now), letter-spacing нэмэгдүүлсэн uppercase гарчгууд (жишээ нь "NEW ARRIVALS" биш "N E W  A R R I V A L S" маягийн tracking).
- Дуу чимээгүй, тайван хөдөлгөөн — animation бүр 300-600ms, ease-out/ease-in-out, hover дээр саарал биш зөөлөн fade/scale.

### 2. Homepage бүтэц
- Full-bleed hero video/зураг (100vh орчим), дээр нь маш цөөн текст (1 headline + 1 CTA), лого голд эсвэл зүүн дээд буланд minimal navbar.
- Editorial storytelling блокууд: том зураг + богино текст ээлжлэн (campaign/lookbook маягийн), бус "grid full of products" биш.
- Collection/Category-г карт биш, "full-width image band + title" маягаар танилцуул.
- Scroll хийхэд section бүр зөөлөн fade-in/slide-up хийж орж ирэх.
- Footer-д newsletter signup-ыг минимал нэг мөрөнд байрлуул (том форм биш).

### 3. Navigation & IA
- Sticky, transparent → scroll хийхэд цагаан/бараан болж хувирдаг header.
- Mega-menu ашиглах бол зурагтай, категори бүрт нэг тод lifestyle зураг + текст жагсаалт хослуулсан загвар.
- Search icon-г minimal, дарахад full-screen overlay search болгож нээ (жижиг dropdown биш).
- Cart icon дээр тоо badge нь маш жижиг, нарийн.

### 4. Product listing (PLP)
- Grid: 2-3 багана (desktop), их зайтай (gutter 24-40px), zoom эффект бага зэрэг hover дээр гарна.
- Sale/discount badge-г хэт том, улаан бүү хий — хэрвээ хямдрал байгаа бол нарийн текстээр л ("−20%") дурд.
- Filter/sort UI-г minimal sidebar эсвэл top bar-д нуугдмал (collapsible) байдлаар хий, "chips" маягийн олон товч бүү дэлгэ.
- Quick-add to cart биш — hover хийхэд зөвхөн "View" гэсэн нэг зөөлөн товч гарч ирнэ (luxury сайтууд импульс худалдан авалтыг тайван байдлаар урамшуулдаг).

### 5. Product detail page (PDP)
- Зурган галерей нь хуудасны 55-65%-ийг эзэлнэ, өндөр чанартай, zoom-on-hover эсвэл click-to-zoom lightbox.
- Мэдээлэл (нэр, үнэ, тайлбар) баруун талд цэвэрхэн, их зайтай байрлана. Үнийг том, тод бус — нарийн, тайван фонтоор.
- Size selector-г товч, minimal chip маягаар, сонголт хийгдэхэд зөөлөн border highlight.
- "Add to Bag" товч full-width, бараан өнгөтэй, hover дээр зөөлөн invert эффект.
- Материал, арчилгаа, хүргэлтийн мэдээллийг accordion (collapsible) болгож нуу — хуудсыг бөглөрүүлж болохгүй.
- Related/"You may also like" section-ийг доод хэсэгт цөөхөн (3-4) бүтээгдэхүүнтэй, том зурагтай харуул.

#### 5.1 Барааны төрлөөс хамаарсан тусгай харуулалт
- **Цүнх**: олон өнцгөөс авсан зураг (гадна, дотор, материалын якsan, тэнхлэгийн хэмжээ diagram), заавал "хэмжээ, багтаамж" хэсгийг тод харуул; boutique-ийн адил "craftsmanship" (гар урлал, материал) тухай богино дэд хэсэг нэм.
- **Цаг**: макро зураг (механизм, шил, бариул), 360° rotate/spin viewer нэмвэл сайн; техникийн үзүүлэлт (диаметр, материал, water resistance) хүснэгт хэлбэрээр биш, цэвэрхэн list хэлбэрээр харуул.
- **Хувцас**: model дээр өмссөн зураг + flat lay зураг хосол, size guide-ыг modal/drawer-аар нээ, materials & care-ийг accordion дотор.
- Гурван төрлийн бүтээгдэхүүн бүрт ижил PDP template ашигла — зөвхөн галерейн зурган контент, тайлбарын дэд-хэсгүүд ялгаатай байна (ингэснээр код дахин ашиглагдана).

### 6. Cart & Checkout
- Cart-ыг side-drawer (slide-in panel) байдлаар хий, бүтэн хуудас руу шилжихгүй.
- Checkout-ыг 1-3 алхамтай, progress indicator-той, гадны сэрэмжлүүлэг/чимэглэл багатай, итгэлтэй мэдрэмж төрүүлэх (trust badges минимал, доод хэсэгт).
- Guest checkout-ыг нүүрэн дээр нь санал болго.

### 7. Micro-interactions & motion
- Framer Motion (эсвэл CSS transitions) ашиглан page transition, image hover scale (1.0 → 1.03-1.05), fade-in on scroll (Intersection Observer) нэмэх.
- Cursor-ийг custom (жижиг цэг эсвэл "View" текст дагадаг) болгож болно — гэхдээ perfomance-д сөргөөр нөлөөлөхгүй байх.
- Loading үед skeleton screen ашигла, spinner биш.

### 8. Responsive & Performance
- Mobile-first, гэхдээ mobile дээр ч гэсэн их зайтай, цэвэрхэн байдлыг хадгал (жижиг текст, олон элемент шахах биш).
- Зургийг next/image (эсвэл lazy-loading + WebP/AVIF) ашиглаж оптимизац хий, Lighthouse score 90+ байхаар.
- Font loading-ийг FOUT/FOIT багатай болгож `font-display: swap` ашигла.

### 9. Хүртээмж (Accessibility)
- Contrast ratio WCAG AA стандартад нийцүүлэх (нарийн/цайвар фонт ашиглах үед анхаарал зүйл).
- Бүх интерактив элементэд keyboard navigation, aria-label нэмэх.

### 10. Техник шаардлага (шаардлагатай бол засварла)
- Стек: [Next.js 14 + TypeScript + Tailwind CSS + Framer Motion] — эсвэл миний одоогийн стек: ______
- Одоо байгаа компонентуудыг дахин ашиглаж болох бол дахин бичихийн оронд өргөтгө.
- Дизайн систем/tokens (өнгө, spacing, typography scale) тусдаа `theme` файлд тодорхойл, бүх компонент үүнийг ашиглана.

### Гаралт
Эхлээд header/navigation, homepage hero, PLP grid, PDP layout-ын шинэчилсэн код/дизайныг харуул. Дараа нь cart drawer болон checkout урсгалыг хий. Хэрэв асуух зүйл байвал эхлээд асуу, дараа нь код бичиж эхэл.

---

### Хэрхэн ашиглах вэ
1. Дээрх "PROMPT" хэсгийг бүхэлд нь хуулна.
2. Claude Code/Cursor/v0 дээр нээлттэй байгаа project-даа буулгаад, эхэнд одоогийн стек, файлын бүтцээ 1-2 өгүүлбэрээр нэмнэ.
3. Хэсэг бүрийг (homepage → PLP → PDP → cart/checkout) дараалалтай хийлгэвэл AI илүү сайн, нарийвчлалтай гүйцэтгэнэ.
