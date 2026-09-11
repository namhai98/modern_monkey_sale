import { site } from './site';

/* The privacy notice, kept here rather than in i18n.js because a legal document
   is prose in sections, not a flat list of interface labels — i18n.js is a key
   map for buttons and field names and would not survive sixty paragraphs.
   The page's own chrome (title, eyebrow, breadcrumb) does live in i18n.js.
 *
 * IMPORTANT: every claim below was checked against the code — the cookies and
 * localStorage keys actually set, the columns actually stored (including the
 * user_agent and IP on refresh_tokens), the absence of any analytics or payment
 * integration, and the four external hosts index.html reaches out to. If you
 * add analytics, a payment processor, a chat widget or any new third party,
 * this file has to change with it. A notice that describes something other
 * than the real behaviour is worse than none at all.
 *
 * This is a standard structure, not legal advice. Have it reviewed before you
 * rely on it, particularly against Mongolia's Law on Personal Data Protection.
 */

// Bump when the substance changes; both locales render it.
export const PRIVACY_UPDATED = '2026-09-11';

const CONTACT_EMAIL = 'privacy@modernmonkey.mn';

const en = {
  intro: `This notice explains what Modern Monkey collects when you use this online store, why, and what you can ask us to do about it. We have kept it specific: it describes how this particular store is built, not a generic template.`,

  sections: [
    {
      h: 'Who we are',
      p: [
        `Modern Monkey is a retail business in ${site.address.city}, ${site.address.country}. Our boutique is at ${site.address.lines.join(', ')}. We are the controller of the personal data described here.`,
        `For anything in this notice, write to ${CONTACT_EMAIL} or call ${site.phones.map((n) => `+976 ${n}`).join(' / ')}.`,
      ],
    },
    {
      h: 'What we collect',
      list: [
        ['Your account', 'Your name and email address. If you set a password we store only a bcrypt hash of it, never the password itself.'],
        ['Sign-in through Google or Facebook', 'If you use one of those buttons, the provider sends us your name, your email address and your account identifier at that provider. We store those three things and nothing else. We never receive your Google or Facebook password.'],
        ['Your orders', 'The items, sizes, quantities and prices you ordered, the delivery address you typed, and the history of each order\'s status.'],
        ['Your sessions', 'When you sign in we record a hashed session token together with your browser\'s user-agent string and IP address, so you can see and end your own sessions and so we can spot a stolen token being reused.'],
        ['Your bag', 'What you put in your bag is kept in your own browser, not on our servers, until you place an order.'],
      ],
    },
    {
      h: 'What we do NOT collect',
      p: [
        `We do not run analytics, advertising or tracking of any kind. There is no Google Analytics, no Meta pixel, no session recording and no third-party marketing script anywhere on this site.`,
        `We do not take payment online. Checkout creates a pending order for us to confirm with you — no card number, bank detail or payment credential is ever entered on or stored by this site.`,
        `We do not build profiles, make automated decisions about you, or sell or rent your data to anyone. Ever.`,
      ],
    },
    {
      h: 'Cookies and browser storage',
      p: [`We use no advertising or analytics cookies, so there is no consent banner to click away. What we do set is only what signing in requires:`],
      list: [
        ['mms_refresh', 'A cookie holding your sign-in session. It is httpOnly, so no script can read it, and Secure in production. It lasts 30 days or until you sign out.'],
        ['mms_oauth', 'A short-lived cookie, ten minutes, used only while you are being sent to Google or Facebook and back. It protects that round trip against cross-site request forgery.'],
        ['Local storage', 'Your access token and a cached copy of your own profile, your bag, and your language and theme choices. These stay in your browser and are cleared when you sign out.'],
      ],
    },
    {
      h: 'Who else sees your data',
      p: [`We keep the list of third parties as short as we can. Each one below is here because the store cannot work without it:`],
      list: [
        ['Neon', 'Hosts our database, in Singapore (ap-southeast-1). This is where your account and orders live.'],
        ['Render', 'Runs the application server that talks to that database.'],
        ['Netlify', 'Serves this website to your browser.'],
        ['Google and Meta', 'Only if you choose their sign-in button. Using it tells that provider you signed in here.'],
        ['Google Fonts', 'Serves the two typefaces this site is set in. Your browser requests them from Google, which means Google sees your IP address on page load.'],
        ['Unsplash', 'Serves some catalogue and editorial photography, and likewise sees your IP address when an image loads.'],
        ['Our email provider', 'Delivers order confirmations and password-reset links.'],
      ],
      after: [`We have no advertising partners and no data brokers. Nobody receives your data for their own marketing.`],
    },
    {
      h: 'How long we keep it',
      p: [
        `Your account and its order history stay while your account exists — order records are what let us handle a return or a warranty claim later, and Mongolian accounting rules require us to keep sale records for a period.`,
        `Session records expire after 30 days and password-reset links after 30 minutes. Ask us to close your account and we delete your account and its linked sign-in identities; order records are retained only as long as the law requires, and then removed.`,
      ],
    },
    {
      h: 'Your rights',
      p: [`You can ask us to:`],
      list: [
        ['See your data', 'We will send you everything we hold about you.'],
        ['Correct it', 'Your name is editable in your profile; write to us for anything else.'],
        ['Delete it', 'We will close your account and erase what we are not legally required to keep.'],
        ['Disconnect a provider', 'You can stop using Google or Facebook sign-in and set a password instead, from your profile.'],
        ['End your sessions', 'Your profile has a "log out of all devices" control that revokes every session immediately.'],
      ],
      after: [`Write to ${CONTACT_EMAIL}. We answer within 30 days. If you are not satisfied with our answer you may complain to the Mongolian National Human Rights Commission, which supervises personal data protection.`],
    },
    {
      h: 'Security',
      p: [
        `Passwords are stored as bcrypt hashes. Sign-in sessions use short-lived access tokens with rotating refresh tokens, and re-use of a retired token revokes the whole session family. Traffic is encrypted in transit, and the sign-in cookie is httpOnly and Secure in production.`,
        `No system is perfect. If you believe your account has been accessed by someone else, use "log out of all devices" in your profile, change your password, and tell us at ${CONTACT_EMAIL}.`,
      ],
    },
    {
      h: 'Children',
      p: [`This store is not intended for children under 16 and we do not knowingly collect their data. If you believe a child has created an account, tell us and we will remove it.`],
    },
    {
      h: 'Changes',
      p: [`If we change what we collect or who we share it with, we will update this page and the date at the top. Material changes will be notified by email to signed-in customers.`],
    },
  ],
};

const mn = {
  intro: `Энэ мэдэгдэл нь Modern Monkey онлайн дэлгүүрийг хэрэглэхэд ямар мэдээллийг цуглуулж, яагаад цуглуулж, та түүнтэй холбоотой юу шаардаж болохыг тайлбарлана. Ерөнхий загвар биш — яг энэ дэлгүүр хэрхэн бүтсэнийг тодорхой бичсэн.`,

  sections: [
    {
      h: 'Бид хэн бэ',
      p: [
        `Modern Monkey нь Монгол Улсын Улаанбаатар хотод үйл ажиллагаа явуулдаг жижиглэн худалдааны бизнес. Дэлгүүрийн хаяг: ${site.address.lines.join(', ')}. Энд дурдсан хувийн мэдээллийн хяналт бидэнд хамаарна.`,
        `Энэ мэдэгдэлтэй холбоотой асуудлаар ${CONTACT_EMAIL} хаягаар бичих эсвэл ${site.phones.map((n) => `+976 ${n}`).join(' / ')} дугаарт холбогдоно уу.`,
      ],
    },
    {
      h: 'Бид юу цуглуулдаг',
      list: [
        ['Таны хаяг', 'Таны нэр болон и-мэйл хаяг. Нууц үг тохируулсан бол зөвхөн bcrypt hash-ыг хадгална, нууц үгийг өөрийг нь хэзээ ч хадгалахгүй.'],
        ['Google эсвэл Facebook-ээр нэвтрэх', 'Тэр товчийг хэрэглэвэл provider бидэнд таны нэр, и-мэйл хаяг, тэдгээрийн систем дэх таны хаягийн дугаарыг дамжуулна. Бид зөвхөн эдгээр гурвыг хадгална. Таны Google, Facebook-ийн нууц үг бидэнд хэзээ ч ирэхгүй.'],
        ['Таны захиалга', 'Захиалсан бараа, размер, тоо хэмжээ, үнэ, таны бичсэн хүргэлтийн хаяг, мөн захиалгын төлөвийн түүх.'],
        ['Таны session', 'Нэвтрэхэд hash хийсэн session token-ыг браузерын user-agent болон IP хаягтай хамт бүртгэнэ. Ингэснээр та өөрийн session-уудыг харж, хаах боломжтой болох ба хулгайлагдсан token-ыг дахин хэрэглэхийг бид илрүүлж чадна.'],
        ['Таны сагс', 'Сагсанд тавьсан бараа нь захиалга үүсгэх хүртэл бидний сервер дээр биш, таны браузер дотор хадгалагдана.'],
      ],
    },
    {
      h: 'Бид юу цуглуулдаггүй',
      p: [
        `Бид analytics, реклам, хяналтын ямар ч хэрэгсэл хэрэглэдэггүй. Энэ сайт дээр Google Analytics, Meta pixel, session recording, гуравдагч талын маркетингийн script нэг ч байхгүй.`,
        `Бид онлайнаар төлбөр авдаггүй. Checkout нь бидний тантай баталгаажуулах хүлээгдэж байгаа захиалга үүсгэдэг — карт, банкны мэдээлэл, төлбөрийн ямар ч мэдээлэл энэ сайт дээр орохгүй, хадгалагдахгүй.`,
        `Бид таны талаар профайл байгуулдаггүй, автоматжуулсан шийдвэр гаргадаггүй, мэдээллийг хэнд ч худалддаггүй, түрээслүүлдэггүй.`,
      ],
    },
    {
      h: 'Cookie ба браузерын хадгалалт',
      p: [`Реклам, analytics-ийн cookie хэрэглэдэггүй тул зөвшөөрлийн banner ч байхгүй. Зөвхөн нэвтрэлтэд шаардлагатайг л тавьдаг:`],
      list: [
        ['mms_refresh', 'Таны нэвтрэлтийн session-ыг хадгалах cookie. httpOnly — ямар ч script уншиж чадахгүй, production дээр Secure. 30 хоног эсвэл та гарах хүртэл.'],
        ['mms_oauth', 'Google/Facebook руу явж буцах хооронд л хэрэглэгддэг 10 минутын cookie. Тэр замыг cross-site request forgery-с хамгаална.'],
        ['Local storage', 'Таны access token, өөрийн профайлын хуулбар, сагс, хэл болон өнгөний сонголт. Эдгээр таны браузерт үлдэж, гарахад цэвэрлэгдэнэ.'],
      ],
    },
    {
      h: 'Өөр хэн таны мэдээллийг харах вэ',
      p: [`Гуравдагч талын тоог хамгийн бага байлгахыг хичээдэг. Доорх бүр нь дэлгүүр ажиллахад шаардлагатай:`],
      list: [
        ['Neon', 'Бидний мэдээллийн санг Сингапурт (ap-southeast-1) байршуулдаг. Таны хаяг, захиалга тэнд байна.'],
        ['Render', 'Тэр мэдээллийн сантай харьцдаг серверийг ажиллуулдаг.'],
        ['Netlify', 'Энэ вэб сайтыг таны браузерт хүргэдэг.'],
        ['Google ба Meta', 'Зөвхөн та тэдний нэвтрэх товчийг сонговол. Хэрэглэснээр та энд нэвтэрсэн гэдгийг тэр provider мэдэх болно.'],
        ['Google Fonts', 'Сайтын хоёр фонтыг хүргэдэг. Таны браузер Google-ээс хүсэлт тавьдаг тул хуудас ачаалахад Google таны IP хаягийг харна.'],
        ['Unsplash', 'Каталог болон зарим зургийг хүргэдэг, мөн зураг ачаалахад таны IP хаягийг харна.'],
        ['Имэйл үйлчилгээ', 'Захиалгын баталгаа болон нууц үг сэргээх холбоосыг илгээдэг.'],
      ],
      after: [`Бидэнд рекламын партнёр, дата брокер байхгүй. Хэн ч таны мэдээллийг өөрийн маркетингт хэрэглэхгүй.`],
    },
    {
      h: 'Хэр хугацаанд хадгалдаг',
      p: [
        `Таны хаяг болон захиалгын түүх нь хаяг байгаа хугацаанд хадгалагдана — захиалгын бүртгэл нь буцаалт, баталгаат хугацааны асуудлыг дараа шийдэхэд шаардлагатай, мөн Монголын бүртгэлийн журмаар борлуулалтын бүртгэлийг тодорхой хугацаанд хадгалах шаардлагатай.`,
        `Session-ийн бүртгэл 30 хоногийн дараа, нууц үг сэргээх холбоос 30 минутын дараа хүчингүй болно. Хаягаа хаахыг хүсвэл таны хаяг болон холбогдсон нэвтрэлтийн identity-уудыг устгана; захиалгын бүртгэлийг зөвхөн хуулиар шаардсан хугацаанд хадгалж, дараа нь устгана.`,
      ],
    },
    {
      h: 'Таны эрх',
      p: [`Та бидэнд дараахыг шаардаж болно:`],
      list: [
        ['Мэдээллээ харах', 'Бидэнд байгаа таны талаарх бүх мэдээллийг илгээнэ.'],
        ['Залруулах', 'Нэрээ профайлаасаа өөрөө засна; бусдыг бидэнд бичээрэй.'],
        ['Устгах', 'Хаягийг хааж, хуулиар хадгалах шаардлагагүй бүхнийг устгана.'],
        ['Provider-ийг салгах', 'Google, Facebook-ээр нэвтрэхийг болиод, профайлаасаа нууц үг тохируулж болно.'],
        ['Session-уудыг хаах', 'Профайл дээр "Бүх төхөөрөмжөөс гарах" товч байгаа — бүх session тэр даруй хүчингүй болно.'],
      ],
      after: [`${CONTACT_EMAIL} хаягаар бичнэ үү. Бид 30 хоногийн дотор хариулна. Хариунд сэтгэл хангалуун бус бол хувийн мэдээлэл хамгаалалтад хяналт тавьдаг Монгол Улсын Хүний эрхийн Үндэсний Комисст гомдол гаргах эрхтэй.`],
    },
    {
      h: 'Хамгаалалт',
      p: [
        `Нууц үгийг bcrypt hash хэлбэрээр хадгална. Нэвтрэлт нь богино хугацааны access token болон эргэлддэг refresh token хэрэглэдэг; хүчингүй болсон token-ыг дахин хэрэглэвэл тэр session-ийн бүх гишүүн хүчингүй болно. Дамжуулалт шифрлэгдсэн, нэвтрэлтийн cookie нь httpOnly, production дээр Secure.`,
        `Ямар ч систем төгс биш. Хаягт тань өөр хүн хандсан гэж үзвэл профайлаасаа "Бүх төхөөрөмжөөс гарах" дарж, нууц үгээ сольж, ${CONTACT_EMAIL} хаягаар бидэнд хэлээрэй.`,
      ],
    },
    {
      h: 'Хүүхэд',
      p: [`Энэ дэлгүүр 16-аас доош насны хүүхдэд зориулагдаагүй, бид тэдний мэдээллийг мэдсээр цуглуулдаггүй. Хүүхэд хаяг үүсгэсэн гэж үзвэл бидэнд хэлээрэй, устгана.`],
    },
    {
      h: 'Өөрчлөлт',
      p: [`Цуглуулдаг мэдээлэл эсвэл хуваалцдаг тал өөрчлөгдвөл энэ хуудас болон дээрх огноог шинэчилнэ. Үндсэн өөрчлөлтийг нэвтэрсэн харилцагчдад и-мэйлээр мэдэгдэнэ.`],
    },
  ],
};

export const privacy = { en, mn };
export const privacyContact = CONTACT_EMAIL;
