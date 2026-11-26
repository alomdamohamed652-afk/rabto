INSERT INTO "guide_entries" ("slug","topic","section","faq_ar","faq_en","answer_ar","answer_en","keywords","visible","sort_order") VALUES ('links','menus','links','فين أحط فيسبوك وتيك توك وواتساب؟','Where do I add Facebook, TikTok and WhatsApp?','من قسم «صفحة الروابط والسوشيال» اكتب اسمك ونبذة قصيرة (وصورة برابط https لو حابب)، واختار اللغة، وبعدين اضغط «إضافة حساب» واختار المنصة (واتساب، إنستجرام، فيسبوك، تيك توك، يوتيوب وغيرهم) وحط الرابط أو الرقم. تقدر تضيف رابط مخصص وترتب الأزرار فوق وتحت. اضغط «نشر» وافتح الصفحة المنشورة. دي الصفحة اللي بتفتح للزبون لما يلمس المنتج.','In "Links and social page" enter your name and a short bio (and an https photo link if you like), pick the language, then press "Add account" and choose the platform (WhatsApp, Instagram, Facebook, TikTok, YouTube and more) and enter the link or number. You can add a custom link and move buttons up or down. Press "Publish" and open the published page. This is the page a customer opens when they tap the product.','!سوشيال
!social
!فيسبوك
!facebook
!انستجرام
!instagram
!تيك
!tiktok
!linktree
حساباتي
حسابات
روابط
لينكات
links
bio
profile
بروفايل
نبذه',true,2) ON CONFLICT ("slug") DO NOTHING;
