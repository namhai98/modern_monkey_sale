// Product Care page copy, kept here rather than in i18n.js because this is
// prose in sections with lists, not a flat set of interface labels — same
// reasoning as legal.js. The page's own chrome (eyebrow) lives in i18n.js.

const en = {
  hero: {
    title: 'Product Care',
    lead: 'Caring for your piece properly keeps its quality and finish looking their best for longer.',
  },
  bags: {
    eyebrow: 'Bag Care',
    title: 'Caring for your bag',
    lead: "The right storage and regular care keep a bag's colour and shape for years.",
    list: [
      'Keep it away from water and moisture as much as possible',
      'Protect it from extreme heat and direct sunlight',
      'Store it in its dust bag when not in use',
      'Avoid resting heavy items on it that could distort its shape',
      'Clean gently with a soft, clean cloth when soiled',
    ],
  },
  watches: {
    eyebrow: 'Watch Care',
    title: 'Caring for your watch',
    lead: "Keeping the case and strap clean and dry helps preserve the watch's appearance.",
    list: [
      "Match your care to the piece's water-resistance rating",
      'Keep it away from chemicals, perfume and cosmetics',
      'Wipe it regularly with a soft cloth',
      'Protect it from strong impacts and drops',
      'Store it somewhere dry and safe when not worn for a long time',
    ],
  },
  general: {
    eyebrow: 'General Guidance',
    title: 'Care that lasts',
    lead: 'Every piece has its own care needs depending on its material and construction. We recommend caring for it with that material in mind.',
  },
  final: {
    title: 'Proper care, lasting wear',
    lead: 'Caring for your piece properly helps keep its look and quality for longer.',
    cta: 'Shop products',
  },
};

const mn = {
  hero: {
    title: 'Барааны арчилгаа',
    lead: 'Бүтээгдэхүүнийхээ чанар, өнгө төрхийг удаан хадгалахын тулд зөв арчлах нь чухал.',
  },
  bags: {
    eyebrow: 'Цүнхний арчилгаа',
    title: 'Цүнхээ зөв арчлах',
    lead: 'Цүнхийг удаан хугацаанд өнгө, хэлбэрээ хадгалахад зөв хадгалалт болон тогтмол арчилгаа чухал.',
    list: [
      'Ус, чийгээс аль болох хол байлгах',
      'Хэт халуун болон нарны шууд тусгалаас хамгаалах',
      'Хэрэглэхгүй үедээ зориулалтын уутанд хадгалах',
      'Хүнд зүйл хийж хэлбэрийг нь алдагдуулахгүй байх',
      'Бохирдсон үед зөөлөн, цэвэр даавуугаар болгоомжтой цэвэрлэх',
    ],
  },
  watches: {
    eyebrow: 'Цагны арчилгаа',
    title: 'Цагаа зөв арчлах',
    lead: 'Цагны гадаргуу болон оосрыг цэвэр, хуурай байлгах нь бүтээгдэхүүний үзэмжийг хадгалахад тусална.',
    list: [
      'Усны хамгаалалтын түвшинг бүтээгдэхүүний онцлогт тохируулан анхаарах',
      'Химийн бодис, үнэртэй ус болон гоо сайхны бүтээгдэхүүнээс хол байлгах',
      'Зөөлөн даавуугаар тогтмол арчих',
      'Хүчтэй цохилт, уналтаас хамгаалах',
      'Удаан хугацаагаар хэрэглэхгүй үедээ хуурай, аюулгүй газар хадгалах',
    ],
  },
  general: {
    eyebrow: 'Ерөнхий зөвлөмж',
    title: 'Удаан хугацаанд хадгалах зөвлөмж',
    lead: 'Бүтээгдэхүүн бүр өөрийн материал, хийцээс хамааран арчилгааны онцлогтой. Тухайн бүтээгдэхүүний материалыг харгалзан арчилгааг хийхийг зөвлөж байна.',
  },
  final: {
    title: 'Зөв арчилгаа — удаан хэрэглээ',
    lead: 'Бүтээгдэхүүнээ зөв арчилснаар түүний өнгө төрх, чанарыг илүү удаан хадгалах боломжтой.',
    cta: 'Бүтээгдэхүүн үзэх',
  },
};

export const productCare = { en, mn };
