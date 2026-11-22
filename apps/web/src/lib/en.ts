// English display helpers for Arabic data fields (locale === "en").
// Grades and work titles are mapped; anything unmapped falls back to the
// Arabic source string rather than a fabricated translation.

const GRADE_MAP: [RegExp, string][] = [
  [/شديد الضعف|ضعيف جدا/, "Very weak (da'if jiddan)"],
  [/متهم بالوضع/, "Accused of fabrication (muttaham bil-wad')"],
  [/موضوع/, "Fabricated (mawdu')"],
  [/مكذوب|كذب/, "Rejected as a lie (makdhub)"],
  [/بدون سند|بلا سند|لا سند/, "No isnad"],
  [/صحيح لغيره/, "Sahih li-ghayrihi (authentic via support)"],
  [/حسن لغيره/, "Hasan li-ghayrihi"],
  [/صحيح الإسناد/, "Authentic chain (sahih al-isnad)"],
  [/حسن الإسناد/, "Fair chain (hasan al-isnad)"],
  [/صحيح/, "Sahih (authentic)"],
  [/حسن صحيح/, "Hasan-sahih"],
  [/حسن/, "Hasan (fair)"],
  [/ضعيف/, "Da'if (weak)"],
  [/مرسل/, "Mursal (untraced)"],
  [/منقطع/, "Munqati' (interrupted)"],
  [/معلق/, "Mu'allaq (suspended)"],
  [/موقوف/, "Mawquf (companion report)"],
  [/منكر/, "Munkar (denounced)"],
  [/مقبول/, "Maqbul (acceptable)"],
  [/متروك/, "Matruk (abandoned)"],
  [/مجهول/, "Majhul (unknown)"],
  [/ثقة/, "Thiqa (trustworthy)"],
  [/صدوق/, "Saduq (truthful)"],
  [/غريب/, "Gharib (strange)"],
  [/موقف|معروف/, "Ma'ruf (known)"],
  [/متشابه/, "Mutashabih"],
  [/قدسي/, "Qudsi"],
];

export function gradeEn(hukm: string | null | undefined): string | null {
  if (!hukm) return null;
  for (const [re, en] of GRADE_MAP) if (re.test(hukm)) return en;
  return transliterateAr(hukm);
}

const WORK_EN: Record<string, string> = {
  "صحيح البخاري": "Sahih al-Bukhari",
  "صحيح مسلم": "Sahih Muslim",
  "جامع الترمذي": "Jami' at-Tirmidhi",
  "سنن أبي داود": "Sunan Abi Dawud",
  "سنن النسائى الصغرى": "Sunan an-Nasa'i (al-Sughra)",
  "السنن الكبرى للنسائي": "al-Sunan al-Kubra of al-Nasa'i",
  "سنن ابن ماجه": "Sunan Ibn Majah",
  "سنن الدارمي": "Sunan al-Darimi",
  "سنن الدارقطني": "Sunan al-Daraqutni",
  "مسند أحمد بن حنبل": "Musnad Ahmad ibn Hanbal",
  "موطأ مالك رواية يحيى الليثي": "Muwatta of Malik (riwayat Yahya al-Laythi)",
  "موطأ مالك برواية محمد بن الحسن الشيباني": "Muwatta of Malik (riwayat Muhammad al-Shaybani)",
  "موطأ مالك برواية أبي مصعب الزهري": "Muwatta of Malik (riwayat Abu Mus'ab al-Zuhri)",
  "مصنف ابن أبي شيبة": "Musannaf of Ibn Abi Shayba",
  "مصنف عبد الرزاق": "Musannaf of 'Abd al-Razzaq",
  "صحيح ابن خزيمة": "Sahih Ibn Khuzaymah",
  "صحيح ابن حبان": "Sahih Ibn Hibban",
  "المستدرك على الصحيحين": "al-Mustadrak 'ala al-Sahihayn (al-Hakim)",
  "مستخرج أبي عوانة": "Mustakhraj Abi 'Awanah",
  "المعجم الكبير للطبراني": "al-Mu'jam al-Kabir of al-Tabarani",
  "المعجم الأوسط للطبراني": "al-Mu'jam al-Awsat of al-Tabarani",
  "المعجم الصغير للطبراني": "al-Mu'jam al-Saghir of al-Tabarani",
  "مسند الشاميين للطبراني": "Musnad al-Shamiyyin of al-Tabarani",
  "الدعاء للطبراني": "al-Du'a' of al-Tabarani",
  "السنن الكبرى للبيهقي": "al-Sunan al-Kubra of al-Bayhaqi",
  "السنن الصغير للبيهقي": "al-Sunan al-Saghir of al-Bayhaqi",
  "شعب الإيمان  للبيهقي": "Shu'ab al-Iman of al-Bayhaqi",
  "شعب الإيمان للبيهقي": "Shu'ab al-Iman of al-Bayhaqi",
  "معرفة السنن والآثار للبيهقي": "Ma'rifat al-Sunan wa-l-Athar of al-Bayhaqi",
  "دلائل النبوة للبيهقي": "Dala'il al-Nubuwwah of al-Bayhaqi",
  "الأسماء والصفات للبيهقي": "al-Asma' wa-l-Sifat of al-Bayhaqi",
  "الزهد الكبير للبيهقي": "al-Zuhd al-Kabir of al-Bayhaqi",
  "الآداب للبيهقي": "al-Adab of al-Bayhaqi",
  "الاعتقاد إلى سبيل الرشاد للبيهقي": "al-I'tiqad 'ala Sabil al-Rashad of al-Bayhaqi",
  "الأربعون الصغرى للبيهقي": "al-Arba'un al-Sughra of al-Bayhaqi",
  "المدخل إلى السنن الكبرى للبيهقي": "al-Madkhal ila al-Sunan al-Kubra (Bayhaqi)",
  "مسند أبي داود الطيالسي": "Musnad Abi Dawud al-Tayalisi",
  "مسند أبي يعلى الموصلي": "Musnad Abi Ya'la al-Mawsili",
  "مسند الحميدي": "Musnad al-Humaydi",
  "مسند إسحاق بن راهويه": "Musnad Ishaq ibn Rahwayh",
  "مسند الشهاب": "Musnad al-Shihab",
  "مسند الشافعي": "Musnad al-Shafi'i",
  "مسند الإمام الشافعي ( ترتيب سنجر )": "Musnad al-Shafi'i (Sinjar arrangement)",
  "مسند ابن الجعد": "Musnad Ibn al-Ja'd",
  "مسند عبد بن حميد": "Musnad 'Abd ibn Humayd",
  "مسند الروياني": "Musnad al-Ruyani",
  "مسند السراج": "Musnad al-Sarraj",
  "مسند أبي حنيفة رواية أبي نعيم": "Musnad Abi Hanifa (riwayat Abi Nu'aym)",
  "مسند الربيع بن حبيب": "Musnad al-Rabi' ibn Habib",
  "مسند زيد": "Musnad Zayd",
  "مسند ابن أبي شيبة": "Musnad Ibn Abi Shayba",
  "سنن سعيد بن منصور": "Sunan Sa'id ibn Mansur",
  "البحر الزخار بمسند البزار": "al-Bahr al-Zakhkhar — Musnad al-Bazzar",
  "البحر الزخار بمسند البزار 10-13": "al-Bahr al-Zakhkhar — Musnad al-Bazzar (vols. 10–13)",
  "مسند الموطأ للجوهري": "Musnad al-Muwatta of al-Jawhari",
  "جامع البيان عن تأويل آي القرآن": "Jami' al-Bayan (Tafsir al-Tabari)",
  "تفسير ابن أبي حاتم": "Tafsir Ibn Abi Hatim",
  "تفسير القرآن لعبد الرزاق الصنعاني": "Tafsir 'Abd al-Razzaq al-San'ani",
  "تفسير مجاهد": "Tafsir Mujahid",
  "تفسير سفيان الثوري": "Tafsir Sufyan al-Thawri",
  "تفسير القرآن لابن المنذر": "Tafsir Ibn al-Mundhir",
  "معالم التنزيل تفسير البغوي": "Ma'alim al-Tanzil (Tafsir al-Baghawi)",
  "الوسيط في تفسير القرآن المجيد": "al-Wasit fi Tafsir al-Qur'an al-Majid",
  "التفسير من سنن سعيد بن منصور": "al-Tafsir from Sunan Sa'id ibn Mansur",
  "تاريخ بغداد للخطيب البغدادي": "Tarikh Baghdad of al-Khatib al-Baghdadi",
  "تاريخ دمشق لابن عساكر": "Tarikh Dimashq of Ibn 'Asakir",
  "تاريخ الإسلام الذهبي": "Tarikh al-Islam of al-Dhahabi",
  "سير أعلام النبلاء الذهبي": "Siyar A'lam al-Nubala' of al-Dhahabi",
  "التاريخ الكبير للبخاري": "al-Tarikh al-Kabir of al-Bukhari",
  "تاريخ ابن أبي خيثمة": "Tarikh Ibn Abi Khaythama",
  "تاريخ المدينة لابن شبة": "Tarikh al-Madina of Ibn Shabba",
  "تاريخ الطبري": "Tarikh al-Tabari",
  "تاريخ أبي زرعة الدمشقي": "Tarikh Abi Zur'a al-Dimashqi",
  "تاريخ جرجان للسهمي": "Tarikh Jurjan of al-Sahmi",
  "تاريخ واسط لأسلم بن سهل الرزاز": "Tarikh Wasit of Aslam ibn Sahl",
  "التدوين في أخبار قزوين للرافعي": "al-Tadwin fi Akhbar Qazwin of al-Rafi'i",
  "ذيل تاريخ بغداد لابن النجار": "Dhayl Tarikh Baghdad of Ibn al-Najjar",
  "المنتظم في تاريخ الأمم لابن الجوزي": "al-Muntazam fi Tarikh al-Umam of Ibn al-Jawzi",
  "أخبار مكة للفاكهي": "Akhbar Makka of al-Fakihi",
  "أخبار مكة للأزرقي": "Akhbar Makka of al-Azraqi",
  "أخبار أصبهان لأبي نعيم": "Akhbar Asbahan of Abu Nu'aym",
  "أنساب الأشراف للبلاذري": "Ansab al-Ashraf of al-Baladhuri",
  "البلدان وفتوحها وأحكامها للبلاذري": "al-Buldan wa-Futuhiha of al-Baladhuri",
  "الطبقات الكبرى لابن سعد": "al-Tabaqat al-Kubra of Ibn Sa'd",
  "طبقات المحدثين بأصبهان والواردين عليها": "Tabaqat al-Muhaddithin bi-Asbahan",
  "طبقات الشافعية الكبرى": "al-Tabaqat al-Shafi'iyya al-Kubra",
  "معرفة الصحابة لأبي نعيم": "Ma'rifat al-Sahaba of Abu Nu'aym",
  "حلية الأولياء لأبي نعيم": "Hilyat al-Awliya' of Abu Nu'aym",
  "الكني والأسماء للدولابي": "al-Kuna wa-l-Asma' of al-Dulabi",
  "الإرشاد في معرفة علماء الحديث لأبي يعلى الخليلي": "al-Irshad fi Ma'rifat 'Ulama' al-Hadith (al-Khalili)",
  "التهذيب الكمال للمزي": "Tahdhib al-Kamal of al-Mizzi",
  "الكامل في ضعفاء الرجال": "al-Kamil fi Du'afa' al-Rijal",
  "المجروحين لابن حبان": "al-Majruhin of Ibn Hibban",
  "الثقات لابن حبان": "al-Thiqat of Ibn Hibban",
  "الضعفاء الكبير للعقيلي": "al-Du'afa' al-Kabir of al-'Uqayli",
  "غوامض الأسماء المبهمة لابن بشكوال": "Ghawamid al-Asma' al-Mubhama of Ibn Bashkuwal",
  "العلل لابن أبي حاتم": "al-'Ilal of Ibn Abi Hatim",
  "العلل الواردة في الأحاديث النبوية للدارقطني": "al-'Ilal al-Warida of al-Daraqutni",
  "العلل المتناهية لابن الجوزي": "al-'Ilal al-Mutanahiya of Ibn al-Jawzi",
  "المراسيل لابن أبي حاتم": "al-Marasil of Ibn Abi Hatim",
  "جرح والتعديل": "al-Jarh wa-l-Ta'dil",
  "الجرح والتعديل": "al-Jarh wa-l-Ta'dil",
  "الجامع لأخلاق الراوي وآداب السامع للخطيب": "al-Jami' li-Akhlaq al-Rawi (al-Khatib)",
  "الفقيه والمتفقه للخطيب": "al-Faqih wa-l-Mutafaqqih of al-Khatib",
  "المحدث الفاصل بين الراوي والواعي": "al-Muhaddith al-Fasil bayn al-Rawi wa-l-Wa'i",
  "الإلماع إلى علم أصول الرواية لقاضي عياض": "al-Ilma' ila Ma'rifat Usul al-Riwaya (Qadi 'Iyad)",
  "المدخل إلى السنن الكبرى": "al-Madkhal ila al-Sunan al-Kubra",
  "غريب الحديث للخطابي": "Gharib al-Hadith of al-Khattabi",
  "غريب الحديث للحربي": "Gharib al-Hadith of al-Harbi",
  "الدلائل في غريب الحديث": "al-Dala'il fi Gharib al-Hadith",
  "معجم ابن الأعرابي": "Mu'jam Ibn al-A'rabi",
  "معجم ابن المقرئ": "Mu'jam Ibn al-Muqri",
  "معجم الصحابة لابن قانع": "Mu'jam al-Sahaba of Ibn Qani'",
  "معجم الشيوخ الكبير للذهبي": "Mu'jam al-Shuyukh al-Kabir of al-Dhahabi",
  "معجم الشيوخ لتاج الدين السبكي": "Mu'jam al-Shuyukh of Taj al-Din al-Subki",
  "معجم الشيوخ لابن جميع الصيداوي": "Mu'jam al-Shuyukh of Ibn Jumay' al-Saydawi",
  "معجم السفر للسلفي": "Mu'jam al-Safar of al-Salafi",
  "مشيخة ابن جماعة": "Mashyakhat Ibn Jama'a",
  "مشيخة ابن البخاري": "Mashyakhat Ibn al-Bukhari",
  "مشيخة محمد الرازي ابن الحطاب": "Mashyakhat Muhammad al-Razi Ibn al-Khattab",
  "أمالي ابن بشران": "Amali Ibn Bishran",
  "أمالي ابن بشران ( مجالس أخرى )": "Amali Ibn Bishran (other sessions)",
  "الأمالي الخميسية للشجري": "al-Amali al-Khamisiyya of al-Shajari",
  "المجالسة وجواهر العلم للدينوري": "al-Mujalasa wa-Jawahir al-'Ilm of al-Dinawari",
  "فوائد تمام الرازي": "Fawa'id Tamam al-Razi",
  "الفوائد الشهير بالغيلانيات لأبي بكر الشافعي": "al-Fawa'id (al-Ghaylaniyyat) of Abu Bakr al-Shafi'i",
  "الفوائد المجموعة للشوكاني": "al-Fawa'id al-Majmu'a of al-Shawkani",
  "الطيوريات": "al-Tuyuriyyat",
  "نظم الآلي بالمائة العوالي": "Nazm al-'Ali — the Hundred 'Awali",
  "عوالي مالك بن أنس لأبي أحمد الحاكم": "'Awali Malik ibn Anas of Abu Ahmad al-Hakim",
  "إتحاف الخيرة المهرة بزوائد المسانيد العشرة": "Ithaf al-Khayra al-Mahara (Zawa'id al-Masanid al-'Ashara)",
  "المطالب العالية بزوائد المسانيد الثمانية لابن حجر": "al-Matalib al-'Aliya bi-Zawa'id al-Masanid al-Thamaniya (Ibn Hajar)",
  "كشف الأستار": "Kashf al-Astar",
  "بغية الباحث عن زوائد مسند الحارث": "Bughyat al-Bahith 'an Zawa'id Musnad al-Harith",
  "المقصد العلي في زوائد أبي يعلى الموصلي جزء": "al-Maqsad al-'Ali fi Zawa'id Abi Ya'la",
  "طرح التثريب للعراقي": "Tarh al-Tathrib of al-'Iraqi",
  "الأحاديث المختارة": "al-Ahadith al-Mukhtara",
  "تلخيص المتشابه في الرسم": "Talkhis al-Mutashabih fi al-Rasm",
  "تغليق التعليق  لابن حجر": "Taghliq al-Ta'liq of Ibn Hajar",
  "التمهيد لابن عبد البر": "al-Tamhid of Ibn 'Abd al-Barr",
  "الاستذكار": "al-Istidhkar",
  "جامع بيان العلم وفضله لابن عبد البر": "Jami' Bayan al-'Ilm of Ibn 'Abd al-Barr",
  "الأوسط في السنن والإجماع والاختلاف لابن المنذر": "al-Awsat fi al-Sunan wa-l-Ijma' (Ibn al-Mundhir)",
  "الإقناع لابن المنذر": "al-Iqna' of Ibn al-Mundhir",
  "شرح السنة": "Sharh al-Sunnah (al-Barbahari)",
  "شرح معاني الآثار للطحاوي": "Sharh Ma'ani al-Athar of al-Tahawi",
  "مشكل الآثار للطحاوي": "Mushkil al-Athar of al-Tahawi",
  "أحكام القرآن الكريم للطحاوي": "Ahkam al-Qur'an of al-Tahawi",
  "المحلى بالآثار لابن حزم": "al-Muhalla bil-Athar of Ibn Hazm",
  "التحقيق في مسائل الخلاف لابن الجوزي": "al-Tahqiq fi Masa'il al-Khilaf of Ibn al-Jawzi",
  "الإبانة الكبرى لابن بطة": "al-Ibana al-Kubra of Ibn Batta",
  "الشريعة للآجري": "al-Shari'a of al-Ajurri",
  "شرح أصول اعتقاد أهل السنة والجماعة للالكائي": "Sharh Usul I'tiqad Ahl al-Sunna of al-Lalaka'i",
  "السنة لأبي بكر بن الخلال": "al-Sunna of Abu Bakr ibn al-Khallal",
  "السنة لعبد الله بن أحمد": "al-Sunna of 'Abdullah ibn Ahmad",
  "السنة لابن أبي عاصم": "al-Sunna of Ibn Abi 'Asim",
  "العظمة": "al-'Azama of Abu al-Shaykh",
  "التوحيد لابن منده": "al-Tawhid of Ibn Mandah",
  "الإيمان لابن منده": "al-Iman of Ibn Mandah",
  "فضائل الصحابة لأحمد بن حنبل": "Fada'il al-Sahaba of Ahmad ibn Hanbal",
  "الزهد لأحمد بن حنبل": "al-Zuhd of Ahmad ibn Hanbal",
  "الزهد والرقائق لابن المبارك": "al-Zuhd wa-l-Raqa'iq of Ibn al-Mubarak",
  "الزهد لوكيع بن الجراح": "al-Zuhd of Waki' ibn al-Jarrah",
  "الزهد لهناد بن السري": "al-Zuhd of Hannad ibn al-Sari",
  "الزهد لابن أبي عاصم": "al-Zuhd of Ibn Abi 'Asim",
  "الفتن لنعيم بن حماد": "al-Fitan of Nu'aym ibn Hammad",
  "السنن الواردة في الفتن للداني": "al-Sunan al-Warida fi al-Fitan (al-Dani)",
  "الأموال لابن زنجويه": "al-Amwal of Ibn Zanjwayh",
  "الأموال للقاسم بن سلام": "al-Amwal of al-Qasim ibn Salam",
  "المصاحف لابن أبي داود": "al-Masahif of Ibn Abi Dawud",
  "الآحاد والمثاني لابن أبي عاصم": "al-Ahad wa-l-Mathani of Ibn Abi 'Asim",
  "الآثار لأبي يوسف": "al-Athar of Abu Yusuf",
  "الجامع في الحديث لابن وهب": "al-Jami' fi al-Hadith of Ibn Wahb",
  "الجامع لمعمر بن راشد": "al-Jami' of Ma'mar ibn Rashid",
  "ذم الكلام وأهله لعبد الله الأنصاري": "Dhamm al-Kalam of 'Abdullah al-Ansari",
  "مكارم الأخلاق للخرائطي": "Makarim al-Akhlaq of al-Khara'iti",
  "مساوئ الأخلاق للخرائطي": "Masa'wi al-Akhlaq of al-Khara'iti",
  "اعتلال القلوب للخرائطي": "I'tilal al-Qulub of al-Khara'iti",
  "أخلاق النبي لأبي الشيخ الأصبهاني": "Akhlaq al-Nabi of Abu al-Shaykh",
  "الأدب المفرد للبخاري": "al-Adab al-Mufrad of al-Bukhari",
  "عمل اليوم والليلة لابن السني": "'Amal al-Yawm wa-l-Layla of Ibn al-Sunni",
  "تعظيم قدر الصلاة للمروزي": "Ta'zim Qadr al-Salah of al-Marwazi",
  "الأنوار في شمائل النبي المختار": "al-Anwar fi Shama'il al-Nabi al-Mukhtar",
  "فضائل القرآن للقاسم بن سلام": "Fada'il al-Qur'an of al-Qasim ibn Salam",
  "أسد الغابة": "Asad al-Ghaba of Ibn al-Athir",
  "اللآلئ المصنوعة فِي الأحاديث الموضوعة للسيوطي": "al-La'ali' al-Masnu'a fi al-Ahadith al-Mawdu'a (al-Suyuti)",
  "تذكرة الموضوعات للفتني": "Tadhkirat al-Mawdu'at of al-Fatni",
  "الأسرار المرفوعة في الأخبار الموضوعة": "al-Asrar al-Marfu'a fi al-Akhbar al-Mawdu'a",
  "المنار المنيف في الصحيح والضعيف": "al-Manar al-Munif fi al-Sahih wa-l-Da'if",
  "الفصل للوصل المدرج في النقل": "al-Fasl lil-Wasl al-Mudraj fi al-Naql",
  "موضح أوهام الجمع والتفريق للخطيب": "Mawdih Awham al-Jam' wa-l-Tafriq (al-Khatib)",
  "المسند المستخرج على صحيح مسلم لأبي نعيم": "al-Musnad al-Mustakhraj 'ala Sahih Muslim (Abu Nu'aym)",
  "مختصر الأحكام المستخرج على جامع الترمذي": "Mukhtasar al-Ahkam al-Mustakhraj 'ala Jami' al-Tirmidhi",
  "المنتقى من السنن المسندة": "al-Muntaqa min al-Sunan al-Musnada",
  "معرفة الصحابة لأبي نعيم ": "Ma'rifat al-Sahaba of Abu Nu'aym",
  "الجامع في العلوم ومعرفة الرجال لأحمد بن حنبل": "al-Jami' fi al-'Ulum wa-Ma'rifat al-Rijal (Ahmad)",
  "الإرشاد في معرفة علماء الحديث": "al-Irshad fi Ma'rifat 'Ulama' al-Hadith",
  "إثارة الفوائد": "Itharat al-Fawa'id",
  "جزء من حديث أبي بكر بن المقرئ": "Juz' min Hadith Abi Bakr ibn al-Muqri",
  "الأربعين المرتبة على طبقات الأربعين لابن المفضل المقدسي": "al-Arba'in al-Murattaba of Ibn al-Mufaddal al-Maqdisi",
  "العيال": "al-'Iyyal of Ibn Abi al-Dunya",
  "الصمت وآداب اللسان": "al-Samt wa-Adab al-Lisan",
  "صفوة التصوف": "Safwat al-Tasawwuf",
  "الجليس الصالح الكافي والأنيس الناصح الشافي المعافى بن زكريا": "al-Jalis al-Salih al-Kafi of Ibn Zakariya",
  "تهذيب الآثار للطبري": "Tahdhib al-Athar of al-Tabari",
  "الأم للشافعي": "al-Umm of al-Shafi'i",
  "المسند للشاشي": "al-Musnad of al-Shashi",
  "مسند أبي بكر الصديق للمروزي": "Musnad Abi Bakr al-Siddiq of al-Marwazi",
  "مسند أبي حنيفة رواية الحصكفي": "Musnad Abi Hanifa (riwayat al-Haskafi)",
  "مسند عقبة بن عامر": "Musnad 'Uqba ibn 'Amir",
  "موطأ عبد الله بن وهب": "Muwatta of 'Abdullah ibn Wahb",
  "تهذيب الكمال للمزي": "Tahdhib al-Kamal of al-Mizzi",
  "المعرفة والتاريخ ليعقوب بن سفيان": "al-Ma'rifa wa-l-Tarikh of Ya'qub ibn Sufyan",
  "الجامع في العلل ومعرفة الرجال لأحمد بن حنبل": "al-Jami' fi al-'Ilal wa-Ma'rifat al-Rijal (Ahmad)",
  "حديث أبي الفضل الزهري": "Hadith Abi al-Fadl al-Zuhri",
  "ذم الهوى لابن الجوزي": "Dhamm al-Hawa of Ibn al-Jawzi",
  "الأغاني لأبي الفرج الأصفهاني": "al-Aghani of Abu al-Faraj al-Isfahani",
  "التوحيد لابن خزيمة": "al-Tawhid of Ibn Khuzaymah",
  "البعث والنشور للبيهقي": "al-Ba'th wa-l-Nushur of al-Bayhaqi",
  "معرفة الصحابة": "Ma'rifat al-Sahaba",
  "الورع لأحمد  رواية المروزي": "al-Wara' of Ahmad (riwayat al-Marwazi)",
  "الخراج ليحيى بن آدم": "al-Kharaj of Yahya ibn Adam",
  "ناسخ الحديث ومنسوخه لابن شاهين": "Nasikh al-Hadith wa-Mansukhuh of Ibn Shahin",
  "القضاء والقدر للبيهقي": "al-Qada' wa-l-Qadar of al-Bayhaqi",
  "أحكام القرآن للجصاص": "Ahkam al-Qur'an of al-Jassas",
  "الأباطيل والمناكير والمشاهير للجورقاني": "al-Abatil wa-l-Manakir wa-l-Mashahir of al-Juraqani",
  "الزهد لأبي داود": "al-Zuhd of Abu Dawud",
  "الناسخ والمنسوخ للنحاس": "al-Nasikh wa-l-Mansukh of al-Nahhas",
  "الأسماء المبهمة والأنباء المحكمة": "al-Asma' al-Mubhama wa-l-Anba' al-Muhkama",
  "تاريخ خليفة بن خياط": "Tarikh Khalifa ibn Khayyat",
  "دلائل النبوة لأبي نعيم": "Dala'il al-Nubuwwa of Abu Nu'aym",
  "السنن المأثورة رواية المزني": "al-Sunan al-Ma'thura (riwayat al-Muzani)",
  "المدونة الكبرى لمالك بن أنس": "al-Mudawwana al-Kubra of Malik ibn Anas",
  "إصلاح المال لابن أبي الدنيا": "Islah al-Mal of Ibn Abi al-Dunya",
  "حجة الوداع لابن حزم": "Hajjat al-Wada' of Ibn Hazm",
  "الاعتبار في الناسخ والمنسوخ من الآثار للحازمي": "al-I'tibar fi al-Nasikh wa-l-Mansukh (al-Hazimi)",
  "الزهد لابن أبي الدنيا": "al-Zuhd of Ibn Abi al-Dunya",
  "الترغيب في فضائل الأعمال لابن شاهين": "al-Targhib fi Fada'il al-A'mal of Ibn Shahin",
  "الناسخ والمنسوخ للقاسم بن سلام": "al-Nasikh wa-l-Mansukh of al-Qasim ibn Salam",
  "فوائد ابن أخي ميمي الدقاق": "Fawa'id Ibn Akhi Mimi al-Daqqaq",
  "الإشراف في منازل الأشراف": "al-Ishraf fi Manazil al-Ashraf",
  "أمالي المحاملي رواية ابن يحيى البيع": "Amali al-Mahamili (riwayat Ibn Yahya al-Bay')",
  "تفسير يحيى بن سلام": "Tafsir Yahya ibn Sallam",
  "صفة الجنة لأبي نعيم": "Sifat al-Janna of Abu Nu'aym",
  "التهجد وقيام الليل لابن أبي الدنيا": "al-Tahajjud wa-Qiyam al-Layl of Ibn Abi al-Dunya",
  "مكارم الأخلاق لابن أبي الدنيا": "Makarim al-Akhlaq of Ibn Abi al-Dunya",
  "الحجة في بيان المحجة وشرح عقيدة أهل السنة 2": "al-Hujja fi Bayan al-Mahajja (vol. 2)",
  "الزهد لنعيم بن حماد": "al-Zuhd of Nu'aym ibn Hammad",
  "الأدب لابن أبي شيبة": "al-Adab of Ibn Abi Shayba",
  "الاستيعاب في معرفة الأصحاب لابن عبد البر": "al-Isti'ab fi Ma'rifat al-Ashab of Ibn 'Abd al-Barr",
  "حديث إسماعيل بن جعفر": "Hadith Isma'il ibn Ja'far",
  "الزيادات على كتاب المزني": "al-Ziyadat 'ala Kitab al-Muzani",
  "الدعوات الكبير للبيهقي": "al-Da'awat al-Kabir of al-Bayhaqi",
  "نواسخ القرآن لابن الجوزي": "Nawasikh al-Qur'an of Ibn al-Jawzi",
  "كتاب الولاة وكتاب القضاة للكندي": "Kitab al-Wulat wa-Kitab al-Qudat of al-Kindi",
  "تنبيه الغافلين بأحاديث سيد الأنبياء والمرسلين لسمرقندي": "Tanbih al-Ghafilin of al-Samarqandi",
  "تبيين كذب المفتري فيما نسب إلى الأشعري": "Tabyin Kadhib al-Muftari (of Ibn 'Asakir)",
  "المراسيل مع الأسانيد لأبي داود": "al-Marasil ma'a al-Asanid of Abu Dawud",
  "القراءة خلف الإمام للبيهقي": "al-Qira'a khalf al-Imam of al-Bayhaqi",
  "البر والصلة لابن الجوزي": "al-Birr wa-l-Sila of Ibn al-Jawzi",
  "الطهور للقاسم بن سلام": "al-Tuhur of al-Qasim ibn Salam",
  "معرفة علوم الحديث للحاكم": "Ma'rifat 'Ulum al-Hadith of al-Hakim",
  "التاريخ الأوسط": "al-Tarikh al-Awsat",
  "معجم أسامي شيوخ أبي بكر الإسماعيلي": "Mu'jam Asami Shuyukh Abi Bakr al-Isma'ili",
  "أسباب النزول الواحدي": "Asbab al-Nuzul of al-Wahidi",
  "القدر للفريابي": "al-Qadar of al-Firyabi",
  "المحتضرين لابن أبي الدنيا": "al-Muhtadarin of Ibn Abi al-Dunya",
  "الرقة والبكاء لابن أبي الدنيا": "al-Riqa wa-l-Buka' of Ibn Abi al-Dunya",
  "كتاب اللطائف من علوم المعارف": "Kitab al-Lata'if min 'Ulum al-Ma'arif",
  "الصحابة لابن قانع": "Mu'jam al-Sahaba of Ibn Qani'",
  "مسند الإمام الشافعي ( ترتيب سنجر)": "Musnad al-Imam al-Shafi'i (Sinjar ordering)",
  "المحدث الفاصل بين الرواي والواعي": "al-Muhaddith al-Fasil bayn al-Rawi wa-l-Wa'i (al-Ramahurmuzi)",
  "خلق أفعال العباد للبخاري": "Khalq Af'al al-'Ibad of al-Bukhari",
  "الرد على الجهمية للدارمي": "al-Radd 'ala al-Jahmiyya of al-Darimi",
  "الأمر بالمعروف والنهي عن المنكر للخلال": "al-Amr bil-Ma'ruf of al-Khallal",
  "حديث يحيى بن معين رواية أبي بكر المروزي": "Hadith Yahya ibn Ma'in (riwayat Abi Bakr al-Marwazi)",
  "الأشربة لأحمد بن حنبل": "al-Ashriba of Ahmad ibn Hanbal",
  "الإخوان لابن أبي الدنيا": "al-Ikhwan of Ibn Abi al-Dunya",
  "الجامع في تفسير القرآن": "al-Jami' fi Tafsir al-Qur'an",
  "تفسير القرآن العزيز": "Tafsir al-Qur'an al-'Aziz",
  "مسند عبد الله بن المبارك": "Musnad 'Abdullah ibn al-Mubarak",
  "معجم أبي يعلى الموصلي": "Musnad Abi Ya'la al-Mawsili",
  "أحاديث عفان بن مسلم": "Ahadith 'Affan ibn Muslim",
  "فوائد أبي محمد الفاكهي": "Fawa'id Abi Muhammad al-Fakihi",
  "تثبيت الإمامة وترتيب الخلافة لأبي نعيم": "Tathbit al-Imama wa-Tartib al-Khilafa (Abu Nu'aym)",
  "التواضع والخمول لابن أبي الدنيا": "al-Tawadu' wa-l-Khumul of Ibn Abi al-Dunya",
  "الوقوف من مسائل الإمام أحمد": "al-Wuquf min Masa'il al-Imam Ahmad",
  "الجزء الأول من الفوائد المنتقاة لابن أبي الفوارس": "al-Fawa'id al-Muntaqat (Ibn Abi al-Fawaris), vol. 1",
  "أمالي ابن سمعون الواعظ": "Amali Ibn Sam'un al-Wa'iz",
  "مجالس من أمالي أبي عبد الله بن منده": "Majalis from the Amali of Ibn Mandah",
  "آداب الشافعي ومناقبه": "Adab al-Shafi'i wa-Manaqibuh",
  "مثير الغرام الساكن إلى أشرف الأماكن لابن الجوزي": "Muthir al-Gharam of Ibn al-Jawzi",
  "إعلام العالم بعد رسوخه بناسخ الحديث ومنسوخه": "I'lam al-'Alam bi-Nasikh al-Hadith wa-Mansukhuh",
  "الكفاية في علم الرواية للخطيب": "al-Kifaya fi 'Ilm al-Riwaya of al-Khatib",
  "شرف أصحاب الحديث للخطيب": "Sharaf Ashab al-Hadith of al-Khatib",
  "البخلاء للخطيب البغدادي": "al-Bukhala' of al-Khatib al-Baghdadi",
  "السير لأبي إسحاق الفزاري": "al-Siyar of Abu Ishaq al-Fazari",
  "تعليقات الدارقطني على المجروحين لابن حبان": "Ta'liqat al-Daraqutni 'ala al-Majruhin (Ibn Hibban)",
  "الجزء الرابع من حديث ابن البختري": "Hadith Ibn al-Bukhtari, vol. 4",
  "الرابع من علل الدارقطني": "'Ilal al-Daraqutni, vol. 4",
  "الأوسط في السنن": "al-Awsat fi al-Sunan (Ibn al-Mundhir)",
  "التوبيخ والتنبيه": "al-Tawbikh wa-l-Tanbih",
};

// Pattern fallback for "Title لـAuthor" shaped names the map doesn't cover.
const TITLE_WORD: [RegExp, string][] = [
  [/^مسند/, "Musnad"], [/^مصنف/, "Musannaf"], [/^سنن/, "Sunan"],
  [/^السنن/, "al-Sunan"], [/^جامع/, "Jami'"], [/^الجامع/, "al-Jami'"],
  [/^تفسير/, "Tafsir"], [/^الزهد/, "al-Zuhd"], [/^تاريخ/, "Tarikh"],
  [/^المعجم/, "al-Mu'jam"], [/^معجم/, "Mu'jam"], [/^أمالي/, "Amali"],
  [/^الأمالي/, "al-Amali"], [/^فوائد/, "Fawa'id"], [/^الفوائد/, "al-Fawa'id"],
  [/^الطبقات/, "al-Tabaqat"], [/^مشيخة/, "Mashyakhat"], [/^الإيمان/, "al-Iman"],
  [/^التوحيد/, "al-Tawhid"], [/^السنة/, "al-Sunna"], [/^الأدب/, "al-Adab"],
  [/^أحكام/, "Ahkam"], [/^دلائل/, "Dala'il"], [/^الفتن/, "al-Fitan"],
  [/^الأموال/, "al-Amwal"], [/^العيال/, "al-'Iyyal"], [/^صفة/, "Sifat"],
  [/^أخلاق/, "Akhlaq"], [/^الإبانة/, "al-Ibana"], [/^الشريعة/, "al-Shari'a"],
  [/^الشمائل/, "al-Shama'il"], [/^فضائل/, "Fada'il"],
  [/^العلو/, "al-'Uluww"], [/^العقوبات/, "al-'Uqubat"], [/^الجوع/, "al-Ju'"],
  [/^المنامات/, "al-Manamat"], [/^البدع/, "al-Bid'"], [/^الخراج/, "al-Kharaj"],
  [/^العلل/, "al-'Ilal"], [/^مجالس/, "Majalis"], [/^أمثال/, "Amthal"],
  [/^البر والصلة/, "al-Birr wa-l-Sila"], [/^قصر الأمل/, "Qasr al-Amal"],
  [/^مختصر/, "Mukhtasar"], [/^بحر الفوائد/, "Bahr al-Fawa'id"],
  [/^آداب/, "Adab"], [/^القدر/, "al-Qadar"], [/^القراءة/, "al-Qira'a"],
  [/^إصلاح/, "Islah"], [/^نواسخ/, "Nawasikh"],
  [/^الدعوات/, "al-Da'awat"], [/^الزيادات/, "al-Ziyadat"],
  [/^مكارم/, "Makarim"], [/^مساوئ/, "Masa'wi"], [/^اعتلال/, "I'tilal"],
  [/^عمل/, "'Amal"], [/^تعظيم/, "Ta'zim"], [/^الأنوار/, "al-Anwar"],
  [/^أسد/, "Asad"], [/^اللآلئ/, "al-La'ali'"], [/^تذكرة/, "Tadhkirat"],
  [/^الأسرار/, "al-Asrar"], [/^المنار/, "al-Manar"], [/^الفصل/, "al-Fasl"],
  [/^موضح/, "Mawdih"], [/^ذيل/, "Dhayl"],
  [/^أخبار/, "Akhbar"], [/^أنساب/, "Ansab"], [/^البلدان/, "al-Buldan"],
  [/^حلية/, "Hilyat"], [/^الكني/, "al-Kuna"], [/^الإرشاد/, "al-Irshad"],
  [/^التهذيب/, "al-Tahdhib"], [/^تهذيب/, "Tahdhib"], [/^الكامل/, "al-Kamil"],
  [/^المجروحين/, "al-Majruhin"], [/^الثقات/, "al-Thiqat"],
  [/^الضعفاء/, "al-Du'afa'"], [/^غوامض/, "Ghawamid"], [/^المراسيل/, "al-Marasil"],
  [/^الجرح/, "al-Jarh"], [/^الفقيه/, "al-Faqih"], [/^المحدث/, "al-Muhaddith"],
  [/^الإلماع/, "al-Ilma'"], [/^المدخل/, "al-Madkhal"], [/^غريب/, "Gharib"],
  [/^الدلائل/, "al-Dala'il"], [/^إثارة/, "Itharat"], [/^جزء/, "Juz'"],
  [/^الأربعين/, "al-Arba'in"], [/^الأربعون/, "al-Arba'un"],
  [/^الصمت/, "al-Samt"], [/^صفوة/, "Safwat"], [/^الجليس/, "al-Jalis"],
  [/^حجة/, "Hujjat"], [/^الحجة/, "al-Hujja"], [/^المدونة/, "al-Mudawwana"],
  [/^الاستيعاب/, "al-Isti'ab"], [/^الاستذكار/, "al-Istidhkar"],
  [/^تنبيه/, "Tanbih"], [/^تبيين/, "Tabyin"],
  [/^الطيوريات/, "al-Tuyuriyyat"], [/^نظم/, "Nazm"], [/^عوالي/, "'Awali"],
  [/^إتحاف/, "Ithaf"], [/^المطالب/, "al-Matalib"], [/^كشف/, "Kashf"],
  [/^بغية/, "Bughyat"], [/^المقصد/, "al-Maqsad"], [/^طرح/, "Tarh"],
  [/^الأحاديث/, "al-Ahadith"], [/^تلخيص/, "Talkhis"], [/^تغليق/, "Taghliq"],
  [/^التمهيد/, "al-Tamhid"], [/^الأوسط/, "al-Awsat"], [/^الإقناع/, "al-Iqna'"],
  [/^شرح/, "Sharh"], [/^المحلى/, "al-Muhalla"], [/^التحقيق/, "al-Tahqiq"],
  [/^المنتظم/, "al-Muntazam"], [/^المنتقى/, "al-Muntaqa"],
  [/^الورع/, "al-Wara'"], [/^ناسخ/, "Nasikh"], [/^الناسخ/, "al-Nasikh"],
  [/^الأسماء/, "al-Asma'"], [/^المصاحف/, "al-Masahif"],
  [/^الآحاد/, "al-Ahad"], [/^الآثار/, "al-Athar"], [/^أخلاق النبي/, "Akhlaq al-Nabi"],
  [/^الأدب المفرد/, "al-Adab al-Mufrad"], [/^مشكل/, "Mushkil"],
  [/^الأغاني/, "al-Aghani"], [/^البعث/, "al-Ba'th"],
  [/^معرفة/, "Ma'rifat"], [/^حجة الوداع/, "Hajjat al-Wada'"],
  [/^الاعتبار/, "al-I'tibar"], [/^الترغيب/, "al-Targhib"], [/^الإشراف/, "al-Ishraf"],
  [/^التهجد/, "al-Tahajjud"],
  [/^الطهور/, "al-Tuhur"], [/^التاريخ/, "al-Tarikh"], [/^معجم أسامي/, "Mu'jam Asami"],
  [/^أسباب النزول/, "Asbab al-Nuzul"], [/^المحتضرين/, "al-Muhtadarin"],
  [/^الرقة/, "al-Riqa"], [/^كتاب/, "Kitab"], [/^اللطائف/, "al-Lata'if"],
  [/^الموطأ/, "al-Muwatta"], [/^موطأ/, "Muwatta"],
  [/^الجهاد/, "al-Jihad"], [/^الديات/, "al-Diyat"], [/^الرؤيا/, "al-Ru'ya"],
  [/^الأهوال/, "al-Ahwal"], [/^التواضع/, "al-Tawadu'"], [/^البخلاء/, "al-Bukhala'"],
  [/^السير/, "al-Siyar"], [/^المرض/, "al-Marad"], [/^الكفاية/, "al-Kifaya"],
  [/^شرف/, "Sharaf"], [/^تعليقات/, "Ta'liqat"], [/^العزلة/, "al-'Uzla"],
  [/^الوقوف/, "al-Wuquf"], [/^الجزء/, "al-Juz'"], [/^أحاديث/, "Ahadith"],
  [/^إعلام/, "I'lam"], [/^الخصال/, "al-Khisal"], [/^الخصائص/, "al-Khasa'is"],
  [/^الدعاء/, "al-Du'a'"], [/^الكبائر/, "al-Kaba'ir"], [/^الصلاة/, "al-Salah"],
  [/^الصيام/, "al-Siyam"], [/^الحج/, "al-Hajj"], [/^الطهارة/, "al-Tahara"],
  [/^الصحيح/, "al-Sahih"], [/^المنتخب/, "al-Muntakhab"], [/^الغرائب/, "al-Ghara'ib"],
  [/^التعليق/, "al-Ta'liq"], [/^الحث/, "al-Hathth"], [/^المعرفة/, "al-Ma'rifa"],
  [/^التقريب/, "al-Taqrib"], [/^الاكتفاء/, "al-Iktifa'"], [/^الوحدان/, "al-Wuhdan"],
  [/^المفردات/, "al-Mufradat"], [/^الطرق/, "al-Turuq"], [/^العلل/, "al-'Ilal"],
  [/^المتفق/, "al-Muttafaq"], [/^المقارنة/, "al-Muqarana"], [/^الإكمال/, "al-Ikmal"],
  [/^الصحابة/, "al-Sahaba"], [/^الإسناد/, "al-Isnad"], [/^المنهج/, "al-Manhaj"],
  [/^الفردوس/, "al-Firdaws"], [/^الشفاء/, "al-Shifa'"], [/^الإصابة/, "al-Isaba"],
  [/^الخصم/, "al-Khasm"], [/^العباس/, "al-'Abbas"], [/^الفضائل/, "al-Fada'il"],
  [/^المعين/, "al-Mu'in"], [/^الإحكام/, "al-Ihkam"], [/^مفردات/, "Mufradat"],
  [/^غوامض/, "Ghawamid"], [/^المنتقى/, "al-Muntaqa"], [/^الاستغناء/, "al-Istighna'"],
  [/^الإحسان/, "al-Ihsan"], [/^النصيحة/, "al-Nasiha"], [/^الرفق/, "al-Rifq"],
  [/^الترجمة/, "al-Tarjama"], [/^الشواهد/, "al-Shawahid"], [/^الشهادات/, "al-Shahadat"],
  [/^مناقب/, "Manaqib"], [/^المناقب/, "al-Manaqib"], [/^معارج/, "Ma'arij"],
  [/^الحجج/, "al-Hujaj"], [/^الصحاح/, "al-Sihah"], [/^النسب/, "al-Nasab"],
  [/^الطريق/, "al-Tariq"], [/^الإحياء/, "al-Ihya'"], [/^الأولياء/, "al-Awliya'"],
  [/^الفرد/, "al-Fard"], [/^مشكل/, "Mushkil"], [/^النبوة/, "al-Nubuwwa"],
];

const AUTHOR_EN: [RegExp, string][] = [
  [/البيهقي/, "al-Bayhaqi"], [/ابن حزم/, "Ibn Hazm"], [/ابن الجوزي/, "Ibn al-Jawzi"],
  [/ابن أبي الدنيا/, "Ibn Abi al-Dunya"], [/ابن أبي شيبة/, "Ibn Abi Shayba"],
  [/ابن أبي حاتم/, "Ibn Abi Hatim"], [/ابن أبي خيثمة/, "Ibn Abi Khaythama"],
  [/ابن أبي عاصم/, "Ibn Abi 'Asim"], [/ابن حبان/, "Ibn Hibban"],
  [/ابن خزيمة/, "Ibn Khuzaymah"], [/ابن عبد البر/, "Ibn 'Abd al-Barr"],
  [/ابن المنذر/, "Ibn al-Mundhir"], [/ابن منده/, "Ibn Mandah"],
  [/ابن عساكر/, "Ibn 'Asakir"], [/ابن الجعد/, "Ibn Ibn al-Ja'd"],
  [/أبي نعيم/, "Abu Nu'aym"], [/الطبراني/, "al-Tabarani"], [/النسائي/, "al-Nasa'i"],
  [/الطحاوي/, "al-Tahawi"], [/الدارقطني/, "al-Daraqutni"], [/البغوي/, "al-Baghawi"],
  [/الطيالسي/, "al-Tayalisi"], [/الحاكم/, "al-Hakim"], [/الخطابي/, "al-Khattabi"],
  [/الخطيب/, "al-Khatib"], [/المزي/, "al-Mizzi"], [/الذهبي/, "al-Dhahabi"],
  [/الدارمي/, "al-Darimi"], [/البلاذري/, "al-Baladhuri"], [/الآجري/, "al-Ajurri"],
  [/القاسم بن سلام/, "al-Qasim ibn Salam"], [/يحيى بن آدم/, "Yahya ibn Adam"],
  [/أحمد بن حنبل/, "Ahmad ibn Hanbal"], [/أحمد/, "Ahmad"], [/ابن شاهين/, "Ibn Shahin"],
  [/العراقي/, "al-'Iraqi"], [/السيوطي/, "al-Suyuti"], [/الخرائطي/, "al-Khara'iti"],
  [/ابن الجوزي/, "Ibn al-Jawzi"], [/الجصاص/, "al-Jassas"], [/النحاس/, "al-Nahhas"],
  [/الفاكهي/, "al-Fakihi"], [/الأزرقي/, "al-Azraqi"], [/الواحدي/, "al-Wahidi"],
  [/العقيلي/, "al-'Uqayli"], [/الدولابي/, "al-Dulabi"], [/الدينوري/, "al-Dinawari"],
  [/الترمذي/, "al-Tirmidhi"], [/المروزي/, "al-Marwazi"], [/أبي الشيخ/, "Abu al-Shaykh"],
  [/ابن حجر/, "Ibn Hajar"], [/قوام السنة/, "Quwwam al-Sunna (al-Isbahani)"],
  [/البخاري/, "al-Bukhari"], [/الشافعي/, "al-Shafi'i"], [/الشاشي/, "al-Shashi"],
  [/الجوهري/, "al-Jawhari"], [/الحصكفي/, "al-Haskafi"], [/الفارسي/, "al-Farsi"],
  [/ابن الضريس/, "Ibn al-Durays"], [/ابن وضاح/, "Ibn Waddah"], [/أبي يوسف/, "Abu Yusuf"],
  [/الفضل بن دكين/, "al-Fadl ibn Dukayn"], [/الكلاباذي/, "al-Kalabadhi"],
  [/ابن سمعون/, "Ibn Sam'un"], [/ابن القطان/, "Ibn al-Qattan"], [/الفتني/, "al-Fatni"],
  [/الشجري/, "al-Shajari"], [/السبكي/, "al-Subki"], [/الصيداوي/, "al-Saydawi"],
  [/السلفي/, "al-Salafi"], [/جماعة/, "Jama'a"], [/الحطاب/, "al-Khattab"],
  [/الرفاعي|الرافعي/, "al-Rafi'i"], [/السهمي/, "al-Sahmi"], [/الرزاز/, "al-Razzaz"],
  [/الكندي/, "al-Kindi"], [/سمرقندي|السمرقندي/, "al-Samarqandi"],
  [/الحازمي/, "al-Hazimi"], [/النحاس/, "al-Nahhas"], [/الإسماعيلي/, "al-Isma'ili"],
  [/الفريابي/, "al-Firyabi"], [/الأنصاري/, "al-Ansari"], [/الشوكاني/, "al-Shawkani"],
  [/الحميدي/, "al-Humaydi"], [/راهويه/, "Rahwayh"], [/إسحاق/, "Ishaq"],
  [/يحيى بن سلام/, "Yahya ibn Sallam"], [/الفراء/, "al-Farra'"],
  [/اللالكائي|الالكائي/, "al-Lalaka'i"], [/ابن الخلال/, "Ibn al-Khallal"],
  [/عبد الله بن أحمد/, "'Abdullah ibn Ahmad"], [/محمد بن الحسن/, "Muhammad ibn al-Hasan"],
  [/يحيى الليثي/, "Yahya al-Laythi"], [/أبي مصعب/, "Abu Mus'ab"],
  [/عبد الرزاق/, "'Abd al-Razzaq"], [/ابن سعد/, "Ibn Sa'd"], [/الفاكهي/, "al-Fakihi"],
  [/الخليلي/, "al-Khalili"], [/ابن بطة/, "Ibn Batta"], [/اللالكائي/, "al-Lalaka'i"],
  [/أبي داود/, "Abu Dawud"], [/ابن ماجه/, "Ibn Majah"], [/مالك/, "Malik"],
  [/البزار/, "al-Bazzar"], [/المزني/, "al-Muzani"], [/السندي/, "al-Sindi"],
  [/ابن وهب/, "Ibn Wahb"], [/الثوري/, "al-Thawri"], [/الصنعاني/, "al-San'ani"],
  [/مجاهد/, "Mujahid"], [/ابن شبة/, "Ibn Shabba"], [/الطبري/, "al-Tabari"],
  [/الدمشقي/, "al-Dimashqi"], [/البغدادي/, "al-Baghdadi"], [/الكريمي/, "al-Karimi"],
  [/النجار/, "al-Najjar"], [/الجوزي/, "Ibn al-Jawzi"], [/البلخي/, "al-Balkhi"],
  [/الموصلي/, "al-Mawsili"], [/الفوارس/, "Ibn Abi al-Fawaris"], [/القطيعي/, "al-Qati'i"],
  [/الفزاري/, "al-Fazari"], [/عفان/, "'Affan"], [/المبارك/, "Ibn al-Mubarak"],
  [/أبي يعلى/, "Abu Ya'la"], [/الجعفي/, "al-Ja'fi"], [/الخراساني/, "al-Khurasani"],
  [/الحمداني/, "al-Hamdani"], [/النيسابوري/, "al-Nisaburi"], [/السرخسي/, "al-Sarakhsi"],
  [/القزويني/, "al-Qazwini"], [/ابن المبارك/, "Ibn al-Mubarak"], [/شعبة/, "Shu'ba"],
  [/الليث بن سعد/, "al-Layth ibn Sa'd"], [/الأوزاعي/, "al-Awza'i"],
  [/ابن أبي حاتم/, "Ibn Abi Hatim"], [/البهائي/, "al-Baha'i"], [/المقدسي/, "al-Maqdisi"],
  [/ابن الفارس/, "Ibn al-Faris"], [/الصالح/, "al-Salih"], [/الأصبهاني/, "al-Isbahani"],
  [/الأنباري/, "al-Anbari"], [/ابن مخلص/, "Ibn Mukhallis"], [/الأنصاري/, "al-Ansari"],
  [/السروجي/, "al-Saruji"], [/البزار/, "al-Bazzar"], [/ابن جميع/, "Ibn Jami'"],
  [/ابن المقرئ/, "Ibn al-Muqri'"], [/ابن الأعرابي/, "Ibn al-A'rabi"], [/تمام/, "Tamam"],
  [/أبي بكر الشافعي/, "Abu Bakr al-Shafi'i"], [/الغزالي/, "al-Ghazali"],
  [/الشجري/, "al-Shajari"], [/النيسابوري/, "al-Nisaburi"], [/ابن المنجا/, "Ibn al-Munja"],
  [/الكريمي/, "al-Karimi"], [/ابن العرابي/, "Ibn al-'Arabi"], [/عبد الغني/, "'Abd al-Ghani"],
  [/الضرير/, "al-Darir"], [/مروذي|المروذي/, "al-Marwazi"], [/الخرخي/, "al-Kharkhi"],
  [/القاضي أبي يعلى/, "al-Qadi Abu Ya'la"], [/الحلواني/, "al-Halwani"],
  [/ابن البنا/, "Ibn al-Banna"], [/الكفيف/, "al-Kafif"], [/الشيباني/, "al-Shaybani"],
  [/البسطامي/, "al-Bustami"], [/الوائلي/, "al-Wa'ili"], [/الحجاج/, "al-Hajjaj"],
  [/الناصح/, "al-Nasih"], [/ابن النجار/, "Ibn al-Najjar"], [/المنذري/, "al-Mundhiri"],
  [/النووي/, "al-Nawawi"], [/ابن رجب/, "Ibn Rajab"], [/ابن القيم/, "Ibn Qayyim"],
  [/ابن تيمية/, "Ibn Taymiyyah"], [/العسقلاني/, "al-'Asqalani"], [/العراقي/, "al-'Iraqi"],
  [/ابن الصلاح/, "Ibn al-Salah"], [/العيني/, "al-'Ayni"], [/القسطلاني/, "al-Qastallani"],
  [/الباجي/, "al-Baji"], [/القرطبي/, "al-Qurtubi"], [/الطبراوي/, "al-Tabrawi"],
];

function patternWorkEn(title: string): string | null {
  const m = title.match(/^(.*?)\s+ل+(\S.*)$/u);
  if (!m || !m[1].trim()) return null;
  let head: string | null = null;
  for (const [re, en] of TITLE_WORD) if (re.test(m[1].trim())) { head = en; break; }
  let author: string | null = null;
  for (const [re, en] of AUTHOR_EN) if (re.test(m[2]) || re.test("ال" + m[2])) { author = en; break; }
  if (head && author) return `${head} … (${author})`;
  if (author && m[1].trim().length <= 40) return `${m[1].trim()} — of ${author}`;
  return null;
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function arDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => AR_DIGITS[+d]);
}

export function workEn(title: string | null | undefined): string {
  if (!title) return "";
  const key = title.trim().replace(/\s+/g, " ");
  return (
    WORK_EN[key] ?? WORK_EN[title] ?? patternWorkEn(key) ?? transliterateAr(key)
  );
}

// ---- Arabic → Latin transliteration fallback -------------------------------
// Word-level map for the most common name components; anything else falls
// through to a deterministic char transliterator so English-locale users
// never see an unreadable name.

const NAME_WORD: Record<string, string> = {
  محمد: "Muhammad", أحمد: "Ahmad", احمد: "Ahmad", علي: "'Ali", على: "'Ali",
  الحسن: "al-Hasan", الحسين: "al-Husayn", حسن: "Hasan", حسين: "Husayn",
  عمر: "'Umar", عثمان: "'Uthman", بن: "ibn", ابن: "ibn", بنت: "bint",
  أبو: "Abu", ابو: "Abu", أم: "Umm", ام: "Umm", عبد: "'Abd",
  الله: "Allah", الدين: "al-Din", الرحمن: "al-Rahman", الرحيم: "al-Rahim",
  إبراهيم: "Ibrahim", ابراهيم: "Ibrahim", إسماعيل: "Isma'il", اسماعيل: "Isma'il",
  إسحاق: "Ishaq", اسحاق: "Ishaq", إسماعل: "Isma'il",
  يعقوب: "Ya'qub", يوسف: "Yusuf", موسى: "Musa", عيسى: "'Isa", داود: "Dawud",
  سليمان: "Sulayman", سعيد: "Sa'id", سعد: "Sa'd", سفيان: "Sufyan",
  خالد: "Khalid", حمزة: "Hamza", بكر: "Bakr", جعفر: "Ja'far", زيد: "Zayd",
  ثابت: "Thabit", يحيى: "Yahya", أنس: "Anas", انس: "Anas", صالح: "Salih",
  سليم: "Salim", شعبة: "Shu'ba", عاصم: "'Asim", وكيع: "Waki'",
  هشام: "Hisham", هارون: "Harun", طلحة: "Talha",
  الزبير: "al-Zubayr", زبير: "Zubayr", العباس: "al-'Abbas", عباس: "'Abbas",
  فاطمة: "Fatima", عائشة: "'A'isha", خديجة: "Khadija", مريم: "Maryam",
  أيوب: "Ayyub", أيمن: "Ayman", يزيد: "Yazid", عمرو: "'Amr",
  الأنصاري: "al-Ansari", القرشي: "al-Qurashi", المدني: "al-Madani",
  المكي: "al-Makki", البصري: "al-Basri", الكوفي: "al-Kufi",
  التميمي: "al-Tamimi", الهمداني: "al-Hamdani", الأزدي: "al-Azdi",
  العنبري: "al-'Anbari", الفزاري: "al-Fazari", الليثي: "al-Laythi",
  العدوي: "al-'Adawi", الأسدي: "al-Asadi", الطائي: "al-Ta'i",
  الهاشمي: "al-Hashimi", العلوي: "al-'Alawi", العمري: "al-'Umari",
  العبدي: "al-'Abdi", الزهري: "al-Zuhri", الجعفي: "al-Ja'fi",
  الحنفي: "al-Hanafi", الشيباني: "al-Shaybani", الغفاري: "al-Ghifari",
  السلمي: "al-Sulami", الصديق: "al-Siddiq", الفاروق: "al-Faruq",
  التيمي: "al-Taymi", النجار: "al-Najjar", الخزرجي: "al-Khazraji",
  الأوسي: "al-Awsi", الغنوي: "al-Ghanawi", اليامي: "al-Yami",
  الشافعي: "al-Shafi'i", الحنبلي: "al-Hanbali", المالكي: "al-Maliki",
  الواعظ: "al-Wa'iz", القاضي: "al-Qadi", الحافظ: "al-Hafiz",
  الثقة: "al-Thiqa", الإمام: "al-Imam", شيخ: "Shaykh", الشيخ: "al-Shaykh",
  راوي: "rawi", عن: "'an", رواية: "riwayat", وقيل: "wa-qila",
  ثقة: "thiqa", صدوق: "saduq", ضعيف: "da'if", متروك: "matruk",
  كذاب: "kadhdhab", مجهول: "majhul",
};

const HONORIFIC: [RegExp, string][] = [
  [/صلى الله عليه وسلم|صلى الله عليه وآله وسلم/g, "ﷺ"],
  [/عليه السلام/g, "(AS)"],
  [/رضي الله عنه|رضي الله عنها|رضى الله عنه|رضى الله عنها/g, "(RA)"],
  [/رحمه الله|رحمه الله تعالى/g, "(RH)"],
];

const CONS_LAT: Record<string, string> = {
  ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh",
  د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh",
  ص: "s", ض: "d", ط: "t", ظ: "z", ع: "'", غ: "gh",
  ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n",
  ه: "h",
};

// Explicit short vowels (when present) — override the default "a".
const VOWEL: Record<string, string> = {
  "َ": "a", "ُ": "u", "ِ": "i", "ً": "an", "ٌ": "un", "ٍ": "in", "ٰ": "a",
};
const SKIP_MARK = new Set(["ّ", "ْ", "ـ"]);

function translitWord(w: string): string {
  if (NAME_WORD[w]) return NAME_WORD[w];
  // الـ definite article → al-
  if (w.length > 2 && w.startsWith("ال")) {
    return "al-" + translitWord(w.slice(2));
  }
  const chars = [...w];
  let out = "";
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    const next = chars[i + 1];

    // Initial-position hamza/alif variants behave like plain alif.
    if (i === 0 && "اأإآٱ".includes(c)) {
      out += next && VOWEL[next] !== undefined ? "" : "a";
      i++;
      continue;
    }
    if (c === "ؤ" || c === "ئ" || c === "ء") { out += "'"; i++; continue; }
    if (c === "ة" || c === "ى") { out += "a"; i++; continue; }
    if (VOWEL[c] !== undefined) { out += VOWEL[c]; i++; continue; }
    if (SKIP_MARK.has(c)) { i++; continue; }

    if (c === "و" || c === "ي") {
      // Onset (word start or after a vowel): consonant + vowel; trailing ا is
      // part of the same syllable and gets consumed.
      if (i === 0 || out.endsWith("a") || out.endsWith("i") || out.endsWith("u")) {
        out += c === "و" ? "wa" : "ya";
        i += next === "ا" ? 2 : 1;
        continue;
      }
      // Coda of the preceding consonant: و→u, ي→i (normally consumed by the
      // consonant branch; reaching here means a hamza/vowel preceded it).
      out += c === "و" ? "u" : "i";
      i += next === "ا" ? 2 : 1;
      continue;
    }

    // Bare alif (and hamza variants) mid-word: long vowel "a".
    if ("اأإآٱ".includes(c)) { out += "a"; i++; continue; }

    const cons = CONS_LAT[c];
    if (cons !== undefined) {
      // Peek: explicit haraka wins, then long vowels, else default "a".
      if (next !== undefined && VOWEL[next] !== undefined) {
        out += cons + VOWEL[next];
        i += 2;
        continue;
      }
      if (next === "و") { out += cons + "u"; i += 2; continue; }
      if (next === "ي") { out += cons + "i"; i += 2; continue; }
      if (next === "ا" || next === "ى" || next === "ة") {
        out += cons + "a";
        i += 2;
        continue;
      }
      // Default short vowel "a" — but not on the final consonant of a word.
      out += i === chars.length - 1 ? cons : cons + "a";
      i++;
      continue;
    }

    // Non-Arabic chars (digits, punctuation, latin) pass through.
    out += c;
    i++;
  }
  return out;
}

/** Deterministic Arabic→Latin transliteration (last-resort readability). */
export function transliterateAr(s: string | null | undefined): string {
  if (!s) return "";
  let t = s.trim();
  for (const [re, en] of HONORIFIC) t = t.replace(re, en);
  return t
    .split(/\s+/)
    .map(translitWord)
    .join(" ")
    .replace(/\(\s*\(/g, "(")
    .replace(/\)\s*\)/g, ")")
    // Capitalize first letter after word boundaries (space, paren, hyphen);
    // a leading ' (ayn) keeps it — "'abd" → "'Abd", but "sa'id" stays.
    .replace(/(^|[\s(\[-])'?([a-z])/g, (_, p, c) => p + c.toUpperCase())
    // al- article stays lowercase, hyphenated part gets its capital back
    .replace(/\bAl-/g, "al-")
    .replace(/\s+/g, " ")
    .trim();
}

export function nameEn(p: { display_name_en?: string | null; display_name_ar?: string | null; name_en?: string | null; name_ar?: string | null } | null | undefined): string {
  if (!p) return "";
  return (
    (p.display_name_en ?? p.name_en ?? transliterateAr(p.display_name_ar)) ||
    transliterateAr(p.name_ar) ||
    ""
  );
}

/** Person/work label with optional years, e.g. "Al-Bukhari (d. 256)" */
export function personLabel(p: any, locale: string): string {
  const name = locale === "en" ? nameEn(p) : p.display_name_ar ?? p.name_ar ?? nameEn(p);
  const d = p.death_ah_min ?? p.death_ah;
  return d ? `${name} (d. ${d})` : name;
}
