// FAQ copy, kept here rather than in i18n.js for the same reason as
// productCare.js: prose grouped into sections, not flat interface labels.
//
// Every answer describes how this shop actually works today — the checkout
// flow, order statuses, sizes, pricing, the boutique. Policies the business
// has not confirmed (delivery times, returns, payment methods) are deliberately
// left out; add a group here once they are decided.
//
// An item may carry `link: { to, label }` (a page here) or `link: { href,
// label }` (another site, opened in a new tab), rendered after the answer.
import { site } from './site';

const address = site.address.lines.join(', ');
const phones = site.phones.join(', ');
const hours = `${site.hours.open}–${site.hours.close}`;

const en = {
  hero: {
    eyebrow: 'Help',
    title: 'Frequently asked questions',
    lead: 'How ordering, accounts and the boutique work. If your question is not here, call or message us.',
  },
  groups: [
    {
      title: 'Ordering',
      items: [
        {
          q: 'How do I place an order?',
          a: 'Open a piece, choose a size if it has one, and add it to your bag. From the bag, go to checkout, enter your details and delivery address, and place the order. You will see a confirmation straight away.',
        },
        {
          q: 'Do I need an account to order?',
          a: 'Yes — checkout asks you to sign in or create an account, so your orders are saved and you can follow them later.',
          link: { to: '/login', label: 'Sign in' },
        },
        {
          q: 'Am I charged when I place an order?',
          a: 'No payment is taken on the website. Your order is created as pending, and we contact you to confirm it.',
        },
        {
          q: 'How do I follow my order?',
          a: 'Every order is listed under My orders with its current status: pending, paid, shipped, delivered — or cancelled or refunded.',
          link: { to: '/orders', label: 'My orders' },
        },
      ],
    },
    {
      title: 'Products and prices',
      items: [
        {
          q: 'How do sizes work?',
          a: 'Each piece of clothing lists its sizes on the product page — choose one before adding it to your bag. A size that has sold out cannot be selected.',
        },
        {
          q: 'Which currency are prices in?',
          a: 'In Mongolian, prices are shown in tögrög (₮). In English they are shown in US dollars, converted at the current rate.',
        },
        {
          q: 'Where can I find discounted pieces?',
          a: 'Discounted pieces show both the original and the reduced price. The Sale link in the menu lists them all.',
          link: { to: '/shop?sale=1', label: 'Sale' },
        },
        {
          q: 'How should I care for my piece?',
          a: 'Our product care guide covers bags, watches and clothing.',
          link: { to: '/product-care', label: 'Product care' },
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          q: 'I forgot my password.',
          a: 'Use “Reset password” on the sign-in page. We email you a link to set a new one.',
          link: { to: '/forgot-password', label: 'Reset password' },
        },
        {
          q: 'Can I change my details?',
          a: 'Yes — your name, photo and password can be changed on your profile page.',
          link: { to: '/profile', label: 'Profile' },
        },
      ],
    },
    {
      title: 'The boutique',
      items: [
        {
          q: 'Where is the boutique?',
          a: `${address}. Open every day, ${hours}.`,
          link: { href: site.mapsUrl, label: 'Open in Google Maps' },
        },
        {
          q: 'How can I contact you?',
          a: `Call ${phones}, or message our Facebook page.`,
        },
      ],
    },
  ],
};

const mn = {
  hero: {
    eyebrow: 'Тусламж',
    title: 'Түгээмэл асуулт',
    lead: 'Захиалга, бүртгэл болон бутикийн талаарх мэдээлэл. Хариултаа олоогүй бол бидэнтэй утсаар эсвэл чатаар холбогдоорой.',
  },
  groups: [
    {
      title: 'Захиалга',
      items: [
        {
          q: 'Хэрхэн захиалга хийх вэ?',
          a: 'Бүтээгдэхүүнээ нээж, хэмжээтэй бол хэмжээгээ сонгоод сагсандаа нэмнэ. Сагснаас төлбөрийн хэсэг рүү орж, мэдээлэл болон хүргэлтийн хаягаа оруулаад захиалгаа илгээнэ. Баталгаажуулалт тэр даруй харагдана.',
        },
        {
          q: 'Захиалахад бүртгэл шаардлагатай юу?',
          a: 'Тийм — захиалга хийхдээ нэвтрэх эсвэл бүртгэл үүсгэх шаардлагатай. Ингэснээр захиалгууд тань хадгалагдаж, дараа нь хянах боломжтой.',
          link: { to: '/login', label: 'Нэвтрэх' },
        },
        {
          q: 'Захиалга хийхэд төлбөр шууд авагдах уу?',
          a: 'Вэбсайт дээр төлбөр авахгүй. Таны захиалга хүлээгдэж буй төлөвт үүсэх бөгөөд бид тантай холбогдож баталгаажуулна.',
        },
        {
          q: 'Захиалгаа хэрхэн хянах вэ?',
          a: '“Миний захиалга” хэсэгт захиалга бүр одоогийн төлөвтэйгээ харагдана: хүлээгдэж буй, төлөгдсөн, илгээгдсэн, хүргэгдсэн — эсвэл цуцлагдсан, буцаан олгосон.',
          link: { to: '/orders', label: 'Миний захиалга' },
        },
      ],
    },
    {
      title: 'Бүтээгдэхүүн ба үнэ',
      items: [
        {
          q: 'Хэмжээг хэрхэн сонгох вэ?',
          a: 'Хувцас бүрийн хэмжээ бүтээгдэхүүний хуудсан дээр харагдана — сагсанд нэмэхээсээ өмнө нэгийг сонгоно. Дууссан хэмжээг сонгох боломжгүй.',
        },
        {
          q: 'Үнэ ямар валютаар харагдах вэ?',
          a: 'Монгол хэл дээр үнэ төгрөгөөр (₮) харагдана. Англи хэл дээр одоогийн ханшаар АНУ-ын доллар руу хөрвүүлж харуулна.',
        },
        {
          q: 'Хямдралтай бүтээгдэхүүнийг хаанаас олох вэ?',
          a: 'Хямдралтай бүтээгдэхүүн анхны болон хямдарсан үнээ хоёуланг нь харуулна. Цэсний “Хямдрал” холбоос бүгдийг нь жагсаана.',
          link: { to: '/shop?sale=1', label: 'Хямдрал' },
        },
        {
          q: 'Бүтээгдэхүүнээ хэрхэн арчлах вэ?',
          a: 'Цүнх, цаг, хувцасны арчилгааны зааврыг манай арчилгааны хуудаснаас үзнэ үү.',
          link: { to: '/product-care', label: 'Барааны арчилгаа' },
        },
      ],
    },
    {
      title: 'Бүртгэл',
      items: [
        {
          q: 'Нууц үгээ мартсан.',
          a: 'Нэвтрэх хуудасны “Нууц үг сэргээх” холбоосыг ашиглана уу. Шинэ нууц үг тохируулах холбоосыг таны имэйл рүү илгээнэ.',
          link: { to: '/forgot-password', label: 'Нууц үг сэргээх' },
        },
        {
          q: 'Мэдээллээ өөрчилж болох уу?',
          a: 'Тийм — нэр, зураг, нууц үгээ профайл хуудаснаасаа өөрчилнө.',
          link: { to: '/profile', label: 'Профайл' },
        },
      ],
    },
    {
      title: 'Бутик',
      items: [
        {
          q: 'Бутик хаана байрладаг вэ?',
          a: `${address}. Өдөр бүр ${hours} цагт ажиллана.`,
          link: { href: site.mapsUrl, label: 'Газрын зураг дээр харах' },
        },
        {
          q: 'Тантай хэрхэн холбогдох вэ?',
          a: `${phones} дугаарт залгах эсвэл Facebook хуудсаар маань бичээрэй.`,
        },
      ],
    },
  ],
};

export const faq = { en, mn };
