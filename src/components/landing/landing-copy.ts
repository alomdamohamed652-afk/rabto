export type LandingLang = "ar" | "en";

type Copy = {
  nav: { how: string; uses: string; platform: string; login: string; skip: string };
  hero: { eyebrow: string; title: string; accent: string; body: string; primary: string; secondary: string; chips: string[] };
  scene: { tap: string; scan: string; code: string; page: string; caption: string };
  uses: { eyebrow: string; title: string; accent: string; items: { k: string; t: string; d: string }[] };
  demo: { eyebrow: string; title: string; accent: string; body: string; code: string; label: string; options: { id: string; t: string; host: string; line: string }[]; tap: string; tapped: string; note: string; current: string };
  how: { eyebrow: string; title: string; accent: string; steps: { t: string; d: string }[] };
  platform: { eyebrow: string; title: string; accent: string; items: { t: string; d: string }[] };
  cta: { eyebrow: string; title: string; accent: string; body: string; login: string; how: string };
  footer: { line: string; rights: string };
};

export const landingCopy: Record<LandingLang, Copy> = {
  ar: {
    nav: { how: "كيف يعمل", uses: "الاستخدامات", platform: "المنصة", login: "تسجيل الدخول", skip: "تخطَّ إلى المحتوى" },
    hero: {
      eyebrow: "منتجات مادية، تجارب رقمية",
      title: "خلّي كل منتج",
      accent: "يفتح عالمه الرقمي.",
      body: "RABTO منصة تربط منتجاتك الملموسة بـ NFC وQR بتجربة رقمية تديرها بنفسك. الكود المطبوع ثابت، والوجهة تتغير وقت ما تحتاج.",
      primary: "شوف طريقة العمل",
      secondary: "الاستخدامات",
      chips: ["NFC", "QR", "صفحات رقمية", "مساحات عمل"]
    },
    scene: { tap: "قرّب", scan: "امسح", code: "كود المنتج", page: "الصفحة الرقمية", caption: "توضيحي" },
    uses: {
      eyebrow: "مناسب لـ",
      title: "منتج واحد،",
      accent: "استخدامات كتير.",
      items: [
        { k: "01", t: "كروت البيزنس", d: "كارت يفتح ملفك وروابطك، وتحدّثها من غير ما تطبع تاني." },
        { k: "02", t: "منيوهات المطاعم والكافيهات", d: "كود على الترابيزة يوصل لأحدث منيو." },
        { k: "03", t: "الشركات والمحلات", d: "صفحة تعريف بنشاطك ومنتجاتك وطرق التواصل." },
        { k: "04", t: "صناع المحتوى والحملات", d: "غيّر وجهة الكود حسب الحملة الحالية." }
      ]
    },
    demo: {
      eyebrow: "جرّبها بنفسك",
      title: "الكود ثابت،",
      accent: "والوجهة بتتغير.",
      body: "اختار وجهة، وقرّب الكارت. نفس الكود المطبوع هيفتح الوجهة الجديدة. ده مثال توضيحي، مش منتج حقيقي.",
      code: "الكود المطبوع",
      label: "الوجهة الحالية",
      options: [
        { id: "menu", t: "منيو", host: "صفحة رقمية", line: "أحدث منيو للمكان" },
        { id: "social", t: "حساب اجتماعي", host: "رابط خارجي", line: "صفحتك على السوشيال ميديا" },
        { id: "offer", t: "عرض", host: "صفحة رقمية", line: "عرض الموسم الحالي" }
      ],
      tap: "قرّب الكارت",
      tapped: "اتفتحت الوجهة",
      note: "توضيحي فقط",
      current: "الوجهة"
    },
    how: {
      eyebrow: "ببساطة، ثلاث خطوات",
      title: "من منتجك",
      accent: "إلى عالمه الرقمي.",
      steps: [
        { t: "ابدأ بمنتجك", d: "النظام بيخصص لكل منتج كود NFC وكود QR مستقلين، وتربطهم بالمنتج الفعلي بعد تجهيزه." },
        { t: "فعّله واربطه", d: "فعّل المنتج على حسابك، واختار يفتح رابط خارجي أو صفحة رقمية." },
        { t: "حدّث وقت ما تحتاج", d: "غيّر الوجهة وتابع الأداء، والكود المطبوع زي ما هو." }
      ]
    },
    platform: {
      eyebrow: "داخل المنصة",
      title: "كل اللي تحتاجه،",
      accent: "في مساحة عمل.",
      items: [
        { t: "كودان مستقلان لكل منتج", d: "NFC وQR يوصّلوا لنفس المنتج، وكل واحد له رابطه." },
        { t: "صفحات رقمية بنسخ منشورة", d: "اكتب مسودة، وانشرها لما تكون جاهزة. كل نشر بيتحفظ كنسخة." },
        { t: "مساحات عمل منفصلة", d: "كل نشاط له منتجاته وفريقه وبياناته." },
        { t: "تحليلات المسح", d: "عدد المسحات يوميًا لكل منتج، بتتحسب في الخلفية. بتظهر حسب باقتك." },
        { t: "منيو رقمي للمطاعم", d: "أقسام وأصناف وأسعار وصور (بروابط https)، وتعرضه للزبون بنفس الكود. للعرض فقط، من غير طلبات أو دفع." },
        { t: "سجل رصيد قابل للمراجعة", d: "كل حركة رصيد بتتسجل وبتفضل محفوظة، وخصم الرصيد التلقائي لسه غير مفعّل." }
      ]
    },
    cta: { eyebrow: "ابدأ", title: "منتجك يستحق", accent: "تجربة متصلة.", body: "لو عندك حساب في RABTO، سجّل دخولك. غير كده، الحسابات بتتفعّل بدعوة من فريق RABTO.", login: "تسجيل الدخول", how: "كيف يعمل" },
    footer: { line: "اربط منتجك بتجربة تتطور معاه.", rights: "جميع الحقوق محفوظة." }
  },
  en: {
    nav: { how: "How it works", uses: "Use cases", platform: "Platform", login: "Log in", skip: "Skip to content" },
    hero: {
      eyebrow: "Physical products, digital experiences",
      title: "Let every product",
      accent: "open its digital world.",
      body: "RABTO connects your NFC and QR products to a digital experience you manage yourself. The printed code stays the same. The destination changes whenever you need it to.",
      primary: "See how it works",
      secondary: "Use cases",
      chips: ["NFC", "QR", "Digital pages", "Workspaces"]
    },
    scene: { tap: "Tap", scan: "Scan", code: "Product code", page: "Digital page", caption: "Illustration" },
    uses: {
      eyebrow: "Made for",
      title: "One product,",
      accent: "many uses.",
      items: [
        { k: "01", t: "Business cards", d: "A card that opens your profile and links. Update them without reprinting." },
        { k: "02", t: "Restaurant and cafe menus", d: "A code on the table that opens the latest menu." },
        { k: "03", t: "Companies and shops", d: "A page about your business, products and contact options." },
        { k: "04", t: "Creators and campaigns", d: "Point the same code at whatever campaign is running now." }
      ]
    },
    demo: {
      eyebrow: "Try it",
      title: "The code stays.",
      accent: "The destination moves.",
      body: "Pick a destination, then tap the card. The same printed code opens the new one. This is an illustration, not a real product.",
      code: "Printed code",
      label: "Current destination",
      options: [
        { id: "menu", t: "Menu", host: "Digital page", line: "The venue's latest menu" },
        { id: "social", t: "Social profile", host: "External link", line: "Your profile on social media" },
        { id: "offer", t: "Offer", host: "Digital page", line: "This season's offer" }
      ],
      tap: "Tap the card",
      tapped: "Destination opened",
      note: "Illustration only",
      current: "Destination"
    },
    how: {
      eyebrow: "Three simple steps",
      title: "From your product",
      accent: "to its digital world.",
      steps: [
        { t: "Start with your product", d: "Each product is prepared with its own NFC code and QR code." },
        { t: "Activate and connect", d: "Activate it on your account, then choose an external link or a digital page." },
        { t: "Update any time", d: "Change the destination and follow performance. The printed code stays as it is." }
      ]
    },
    platform: {
      eyebrow: "Inside the platform",
      title: "Everything you need,",
      accent: "in one workspace.",
      items: [
        { t: "Two independent codes per product", d: "The system assigns each product its own NFC code and QR code, to link to the physical item once it is prepared." },
        { t: "Digital pages with published versions", d: "Write a draft and publish when ready. Every publish is saved as a version." },
        { t: "Separate workspaces", d: "Each business has its own products, team and data." },
        { t: "Scan analytics", d: "Daily scan counts per product, processed in the background. Shown depending on your plan." },
        { t: "Digital menus for restaurants", d: "Sections, items, prices and photos (https links), shown to guests through the same code. Display only, no ordering or payment." },
        { t: "An auditable credit ledger", d: "Every credit movement is recorded and kept. Automatic credit deduction is not active yet." }
      ]
    },
    cta: { eyebrow: "Get started", title: "Your product deserves", accent: "a connected experience.", body: "If you have a RABTO account, log in. Otherwise accounts are activated by invitation from the RABTO team.", login: "Log in", how: "How it works" },
    footer: { line: "Connect your product to an experience that evolves.", rights: "All rights reserved." }
  }
};
