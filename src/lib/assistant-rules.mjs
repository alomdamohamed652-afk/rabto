// Built-in help guide for the customer dashboard. No AI model, no network: it matches the question to curated
// answers that describe what the product does today. Anything outside the guide gets an honest "not covered".
const AR_MAP = { "أ": "ا", "إ": "ا", "آ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي" };
export function normalize(text) {
  return String(text ?? "").toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآىةؤئ]/g, (c) => AR_MAP[c])
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}
// Arabic proclitics (و ف ب ل ال ...) are stripped lightly so "بالمنيو" matches "منيو".
function stem(w) {
  let s = w;
  if (/^[\u0600-\u06FF]/.test(s) && s.length > 3) {
    s = s.replace(/^(وال|بال|كال|فال|لل|ال)/, "");
    if (s.length > 3) s = s.replace(/^[وفبل]/, "");
  }
  return s;
}
export const GUIDE = [
  { id: "menu", section: "menus",
    kw: ["منيو", "قايمه", "قائمه", "صنف", "اصناف", "menu", "item", "items", "section", "edit menu"],
    ar: "من قسم «المنيو والصفحات الرقمية» تعمل منيو جديد، وتضيف أقسام وأصناف (اسم، وصف، سعر، متاح أو لا). التعديل بيتحفظ كمسودة، والزبون مبيشوفش غير آخر نسخة منشورة. اضغط «حفظ المسودة» ثم «نشر».",
    en: "In \"Menus and digital pages\" you create a menu, add sections and items (name, description, price, available or not). Edits are saved as a draft, and guests only see the latest published version. Use \"Save draft\", then \"Publish\"." },
  { id: "publish", section: "menus",
    kw: ["!نشر", "!انشر", "!publish", "published", "draft", "مسوده", "live", "منشور"],
    ar: "المنيو بيفضل مسودة لحد ما تضغط «نشر». بعد النشر بتظهر نسخة جديدة للزبون، وأي تعديل بعدها بيظهر «فيه تعديلات لم تُنشر» لحد ما تنشره تاني. تقدر تفتح الصفحة المنشورة من زر «فتح الصفحة المنشورة».",
    en: "A menu stays a draft until you press \"Publish\". Publishing makes a new version visible to guests; later edits show \"Has unpublished changes\" until you publish again. Use \"Open published page\" to see the live page." },
  { id: "preview", section: "menus",
    kw: ["!معاينه", "!preview", "شكل", "هيظهر", "look"],
    ar: "زر «معاينة المنيو» بيعرض شكل المنيو زي ما الزبون هيشوفه بعد النشر، والأصناف المخفية مش بتظهر فيه.",
    en: "\"Preview menu\" shows the menu the way guests will see it after publishing. Hidden items are not shown." },
  { id: "photos", section: "menus",
    kw: ["!صوره", "!صور", "!photo", "!photos", "!image", "!images", "picture", "رفع", "upload"],
    ar: "حاليًا الصورة بتتحط كرابط https لصورة موجودة على النت (اختياري لكل صنف). رفع ملفات الصور من الجهاز مش متاح لسه.",
    en: "Right now a photo is an https link to an image that already exists online (optional per item). Uploading image files from your device is not available yet." },
  { id: "hide", section: "menus",
    kw: ["!اخفي", "!اخفاء", "!hide", "!hidden", "مخفي", "متاح", "نفد", "available", "unavailable", "sold out"],
    ar: "علشان تخفي صنف عن الزبون من غير ما تحذفه، شيل علامة «متاح» عنده واحفظ ثم انشر. الصنف المخفي مبيظهرش في الصفحة المنشورة.",
    en: "To hide an item from guests without deleting it, untick \"Available\", save, then publish. A hidden item is not shown on the published page." },
  { id: "plan", section: "plan",
    kw: ["باقه", "باقات", "خطه", "حد", "حدود", "plan", "plans", "limit", "limits", "entitlement", "subscription"],
    ar: "قسم الباقة بيعرض باقتك وحدودها زي ما اتحددت من فريق RABTO. صفحة /plans العامة بتعرض الباقات المنشورة للمقارنة. الأسعار والتجديد مش مفعّلين من خلال النظام حاليًا.",
    en: "The plan section shows your plan and its limits as set by the RABTO team. The public /plans page shows the published plans for comparison. Prices and renewals are not handled through the system at the moment." },
  { id: "credits", section: "products",
    kw: ["رصيد", "كريديت", "credit", "credits", "balance", "نقاط"],
    ar: "رصيد كل كود ظاهر في قائمة منتجاتك لو متسجل. خصم الرصيد تلقائيًا مع الاستخدام لسه مش مفعّل، والإيداعات مجرد سجلات.",
    en: "Each code's balance is listed in your products when one is recorded. Automatic credit deduction with usage is not active yet, and deposits are records only." },
  { id: "products", section: "products",
    kw: ["منتج", "منتجات", "كود", "اكواد", "nfc", "qr", "product", "products", "code", "codes", "sticker", "scan"],
    ar: "قسم «منتجاتي» بيعرض المنتجات المربوطة بمساحة عملك مع كود NFC وQR ورابط كل كود وحالته. المنتجات بتتجهز وتتربط بمساحتك من فريق RABTO.",
    en: "\"My products\" lists the products linked to your workspace with their NFC and QR codes, the link for each code and its status. The RABTO team prepares and links products to your workspace." },
  { id: "analytics", section: "insights",
    kw: ["تحليلات", "احصائيات", "مسح", "زيارات", "analytics", "stats", "insights", "scans", "views"],
    ar: "قسم «التحليلات» بيعرض أرقام المسح والزيارات لمساحة عملك. التحليلات متاحة حسب باقتك.",
    en: "\"Analytics\" shows scan and visit numbers for your workspace. Analytics availability depends on your plan." },
  { id: "support", section: "support",
    kw: ["دعم", "مشكله", "تيكيت", "تذكره", "تذاكر", "support", "ticket", "tickets", "help", "problem", "issue", "contact"],
    ar: "لو عندك مشكلة افتح تذكرة من قسم «تذاكر الدعم»: اكتب الموضوع والرسالة، وهتتابع الرد في نفس التذكرة. التذاكر مشتركة بين أعضاء نفس مساحة العمل.",
    en: "If something is wrong, open a ticket in \"Support tickets\": write a subject and message, and follow the reply in the same ticket. Tickets are shared between members of the same workspace." },
  { id: "verify", section: "verify",
    kw: ["تاكيد", "تفعيل", "ايميل", "بريد", "verify", "verification", "email"],
    ar: "تأكيد البريد بيتم بكود من 6 أرقام صالح 10 دقايق، و5 محاولات للكود. الخدمة ممكن تكون لسه غير مفعّلة لو إرسال البريد مش متضبط.",
    en: "Email confirmation uses a 6-digit code valid for 10 minutes, with 5 attempts per code. It may show as not active yet if mail sending is not set up." },
  { id: "reset", section: "login",
    kw: ["نسيت", "كلمه", "سر", "باسورد", "password", "reset", "forgot", "استرجاع"],
    ar: "من صفحة «نسيت كلمة السر» تقدر تطلب كود على بريدك المؤكد. لو الخدمة مش مفعّلة هتظهر رسالة بكده، وساعتها تقدر تبعت طلب استرداد الحساب ليراجعه فريق الدعم يدويًا. أي طلب استرداد مبيغيّرش كلمة السر بنفسه.",
    en: "On the \"Forgot password\" page you can request a code to your confirmed email. If the service is not active you will see a message saying so, and you can send an account recovery request for the support team to review by hand. A recovery request does not change the password by itself." },
  { id: "phone", section: "phone",
    kw: ["تليفون", "هاتف", "رقم", "موبايل", "phone", "mobile", "number"],
    ar: "تقدر تضيف رقم هاتفك من قسم الهاتف، وبيساعد في صفحة استرداد الحساب.",
    en: "You can add your phone number in the phone section; it helps with account recovery." },
  { id: "language", section: "language",
    kw: ["لغه", "عربي", "انجليزي", "english", "arabic", "language", "rtl"],
    ar: "زر اللغة في أعلى الصفحة بيبدّل بين العربي (من اليمين لليسار) والإنجليزي.",
    en: "The language button at the top switches between Arabic (right to left) and English." },
  { id: "orders", section: "none",
    kw: ["طلب", "طلبات", "اوردر", "دفع", "payment", "order", "orders", "pay", "checkout", "online"],
    ar: "الطلب والدفع أونلاين مش متاحين في النظام حاليًا. المنيو بيعرض الأصناف والأسعار للمعلومات فقط.",
    en: "Online ordering and payment are not available in the system at the moment. The menu shows items and prices for information only." },
];
export const FALLBACK = {
  ar: "مش لاقي إجابة لسؤالك في الدليل المدمج. جرّب كلمات أبسط زي: منيو، نشر، باقة، تحليلات، دعم، كلمة السر. ولو الموضوع لسه مش واضح، افتح تذكرة دعم من قسم «تذاكر الدعم».",
  en: "I could not find an answer in the built-in guide. Try simpler words like: menu, publish, plan, analytics, support, password. If it is still unclear, open a ticket in \"Support tickets\".",
};
// A leading "!" marks a strong intent word (it outweighs generic topic words such as "menu").
const INDEX = GUIDE.map((g) => ({ g, kws: g.kw.map((k) => { const strong = k.startsWith("!"); return { w: normalize(k.replace(/^!/, "")).split(" ").map(stem).join(" "), strong }; }) }));
export function answer(question, lang = "ar") {
  const L = lang === "en" ? "en" : "ar";
  const words = normalize(question).split(" ").filter(Boolean).map(stem);
  const text = " " + words.join(" ") + " ";
  let best = null; let bestScore = 0;
  for (const { g, kws } of INDEX) {
    let score = 0;
    for (const { w: k, strong } of kws) {
      if (k.includes(" ") ? text.includes(" " + k + " ") : words.includes(k)) score += (strong ? 3 : 1) + (k.includes(" ") ? 1 : 0);
    }
    if (score > bestScore) { best = g; bestScore = score; }
  }
  if (!best) return { matched: false, id: null, section: null, text: FALLBACK[L] };
  return { matched: true, id: best.id, section: best.section, text: best[L] };
}
export function validateQuestion(body) {
  const q = typeof body?.question === "string" ? body.question.trim() : "";
  if (!q || q.length > 300) return { ok: false };
  return { ok: true, question: q, lang: body?.lang === "en" ? "en" : "ar" };
}
