export type PublicLanguage = "da" | "ps" | "en";

export interface PlanFeature {
  text: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  priceAFN: string;
  priceUSD: string;
  period: "year" | "month" | "lifetime";
  description: string;
  badge?: string;
  featured?: boolean;
  features: string[];
  ctaText: string;
}

export interface CloudServiceItem {
  id: string;
  title: string;
  desc: string;
  tag: string;
  metric: string;
  linkText: string;
}

export interface SolutionBlueprint {
  id: string;
  title: string;
  headline: string;
  desc: string;
  deliverables: string[];
  ctaText: string;
}

export interface PublicTranslationSchema {
  dir: "rtl" | "ltr";
  ticker: string;
  nav: {
    solutions: string;
    aiMobile: string;
    identity: string;
    pricingCharter: string;
    infra: string;
    signIn: string;
    getStarted: string;
  };
  hero: {
    badge: string;
    headlineMain: string;
    headlineHighlight: string;
    subheadline: string;
    ctaWhatsApp: string;
    ctaBusiness: string;
    ctaDownloadApp: string;
    listenSample: string;
    samplePlaying: string;
    trustStrip: string[];
    quickSpecs: string[];
  };
  consolePreview: {
    title: string;
    subtitle: string;
    tabDiagram: string;
    tabCli: string;
    tabConfig: string;
    tabPreview: string;
    copyBtn: string;
    copiedBtn: string;
    topology: {
      client: string;
      edge: string;
      backbone: string;
      coreAi: string;
      settlement: string;
    };
  };
  pillars: {
    sectionTitle: string;
    sectionSubtitle: string;
    p1Title: string;
    p1Desc: string;
    p1Tag: string;
    p2Title: string;
    p2Desc: string;
    p2Tag: string;
    p3Title: string;
    p3Desc: string;
    p3Tag: string;
    p4Title: string;
    p4Desc: string;
    p4Tag: string;
  };
  catalog: {
    sectionBadge: string;
    sectionTitle: string;
    sectionSubtitle: string;
    tabCompute: string;
    tabAI: string;
    tabIdentity: string;
    tabSettlement: string;
    tabEdge: string;
    services: Record<string, CloudServiceItem[]>;
  };
  infrastructure: {
    sectionBadge: string;
    sectionTitle: string;
    sectionSubtitle: string;
    primaryRegionName: string;
    primaryRegionLatency: string;
    kabulEdgeName: string;
    kabulEdgeLatency: string;
    heratEdgeName: string;
    heratEdgeLatency: string;
    mazarEdgeName: string;
    mazarEdgeLatency: string;
    kandaharEdgeName: string;
    kandaharEdgeLatency: string;
    statSla: string;
    statSlaLabel: string;
    statLatency: string;
    statLatencyLabel: string;
    statDeliverability: string;
    statDeliverabilityLabel: string;
    statCurrency: string;
    statCurrencyLabel: string;
  };
  solutions: {
    sectionBadge: string;
    sectionTitle: string;
    sectionSubtitle: string;
    blueprints: SolutionBlueprint[];
  };
  pricing: {
    badge: string;
    title: string;
    subtitle: string;
    tabBusiness: string;
    tabConsumer: string;
    currencyLabel: string;
    perYear: string;
    perMonth: string;
    lifetime: string;
    popularTag: string;
    deployBtn: string;
    plans: {
      starter: { name: string; desc: string; features: string[] };
      professional: { name: string; desc: string; features: string[] };
      intelligence: { name: string; desc: string; features: string[] };
      community: { name: string; desc: string; features: string[] };
      student: { name: string; desc: string; annualAlt: string; features: string[] };
      creator: { name: string; desc: string; features: string[] };
    };
  };
  charter: {
    badge: string;
    title: string;
    desc: string;
    barTitle: string;
    barSubtitle: string;
    pctDomain: string;
    pctInfra: string;
    pctAI: string;
    pctCashFee: string;
    pctWages: string;
    pctReserve: string;
  };
  faq: {
    title: string;
    q1: string;
    a1: string;
    q2: string;
    a2: string;
    q3: string;
    a3: string;
  };
  footer: {
    tagline: string;
    rights: string;
  };
}

export const publicTranslations: Record<PublicLanguage, PublicTranslationSchema> = {
  da: {
    dir: "rtl",
    ticker: "زیرساخت ابری مستقل و هوش مصنوعی چندزبانه برای افغانستان",
    nav: {
      solutions: "راه‌حل‌ها",
      aiMobile: "هوش مصنوعی آریا",
      identity: "دامنه و ایمیل",
      pricingCharter: "قیمت و مأموریت",
      infra: "زیرساخت",
      signIn: "ورود به کنسول",
      getStarted: "شروع کنید",
    },
    hero: {
      badge: "زیرساخت ابری مستقل و هوش مصنوعی چندزبانه برای افغانستان",
      headlineMain: "زیرساخت ابری و هوش مصنوعی چندزبانه، ",
      headlineHighlight: "ساخته‌شده برای افغانستان.",
      subheadline: "یک پلتفرم برای ساخت، میزبانی و رشد کسب‌وکارهای افغان — وب‌سایت‌های هوشمند به دری، پشتو و انگلیسی، ایمیل تجارتی تأییدشده، و پرداخت محلی به افغانی. بدون نیاز به کارت خارجی.",
      ctaWhatsApp: "گفتگو در واتساپ",
      ctaBusiness: "ورود به کنسول",
      ctaDownloadApp: "دانلود اپلیکیشن اندروید",
      listenSample: "شنیدن نمونه صدای طبیعی",
      samplePlaying: "در حال پخش...",
      trustStrip: ["سه‌زبانه: دری، پشتو و انگلیسی", "بدون نیاز به کارت خارجی", "پرداخت به افغانی"],
      quickSpecs: ["وب‌سایت هوشمند به سه زبان", "ایمیل تجارتی (SPF/DKIM)", "پرداخت محلی — حساب‌پی", "جداسازی داده هر مشتری"],
    },
    consolePreview: {
      title: "کنسول آریا کلاود",
      subtitle: "مدیریت وب‌سایت، ایمیل و پرداخت از یک‌جا.",
      tabDiagram: "معماری",
      tabCli: "ترمینال",
      tabConfig: "تنظیمات",
      tabPreview: "پیش‌نمایش",
      copyBtn: "کاپی",
      copiedBtn: "کاپی شد!",
      topology: {
        client: "فروشگاه تجار (PWA)",
        edge: "شبکه لبه جهانی",
        backbone: "ابر منطقوی",
        coreAi: "هوش آریا و دیتابیس",
        settlement: "حساب‌پی",
      },
    },
    pillars: {
      sectionTitle: "یک پلتفرم برای همه نیازهای دیجیتال",
      sectionSubtitle: "از نخستین وب‌سایت تا ایمیل تجارتی و پرداخت — طراحی‌شده برای شرایط ارتباطی افغانستان.",
      p1Title: "سازنده هوشمند وب‌سایت",
      p1Desc: "تولید وب‌سایت‌های سریع و سبک برای کلینیک‌ها، مکاتب، صادرکنندگان و دکان‌ها — به دری، پشتو و انگلیسی.",
      p1Tag: "PWA سه‌زبانه",
      p2Title: "استودیوی هوش مصنوعی آریا",
      p2Desc: "دستیار صوتی، تصویری و متنی که دری و پشتو را می‌فهمد.",
      p2Tag: "صوت، تصویر و گفتگو",
      p3Title: "دامنه و ایمیل تجارتی",
      p3Desc: "دامنه اختصاصی (.af و .com) همراه با ایمیل تأییدشده (SPF/DKIM).",
      p3Tag: "ارسال تأییدشده",
      p4Title: "پرداخت محلی",
      p4Desc: "پرداخت به افغانی — از طریق QR حساب‌پی.",
      p4Tag: "بدون کارت خارجی",
    },
    catalog: {
      sectionBadge: "کاتالوگ خدمات آریا کلاود",
      sectionTitle: "ابزارهای ابری برای کسب‌وکار افغان",
      sectionSubtitle: "مجموعه‌ای یکپارچه برای ساخت، میزبانی و رشد کسب‌وکار، به زبان خود شما.",
      tabCompute: "سایت و میزبانی",
      tabAI: "هوش مصنوعی",
      tabIdentity: "دامنه و ایمیل",
      tabSettlement: "پرداخت",
      tabEdge: "امنیت و تحویل",
      services: {
        compute: [
          { id: "site-engine", title: "سازنده هوشمند وب‌سایت", desc: "وب‌سایت‌های سریع و سبک (PWA) برای موبایل، قابل استفاده آفلاین و بهینه برای انترنت ضعیف.", tag: "آفلاین", metric: "PWA", linkText: "ساخت وب‌سایت" },
          { id: "sovereign-db", title: "دیتابیس چندمشتری امن", desc: "جداسازی کامل داده هر مشتری.", tag: "جداسازی داده", metric: "امن", linkText: "مشاهده معماری" },
          { id: "whatsapp-engine", title: "به‌روزرسانی از واتساپ", desc: "تغییر محصولات و قیمت‌ها با یک پیام صوتی یا متنی در واتساپ.", tag: "ساده", metric: "واتساپ", linkText: "اتصال واتساپ" },
        ],
        ai: [
          { id: "core-ai-chat", title: "هوش مرکزی آریا", desc: "دستیار گفتگو که اصطلاحات دری، پشتو و انگلیسی را می‌فهمد.", tag: "چندزبانه", metric: "دری و پشتو", linkText: "شروع گفتگو" },
          { id: "creative-studio", title: "استودیوی تولید تصویر", desc: "تصاویر تجارتی برای محصولات صادراتی، کلینیک‌ها و دکان‌ها.", tag: "تصویر", metric: "خودکار", linkText: "تولید تصویر" },
          { id: "voice-ocr", title: "موتور صوتی", desc: "تبدیل متن به گفتار طبیعی با لهجه‌های دری و پشتو.", tag: "صوت", metric: "طبیعی", linkText: "آزمایش صدا" },
        ],
        identity: [
          { id: "domain-registrar", title: "دامنه .af و .com", desc: "ثبت دامنه اختصاصی برای کسب‌وکار شما.", tag: "اختصاصی", metric: ".af / .com", linkText: "جستجوی دامنه" },
          { id: "cloud-mail-enterprise", title: "ایمیل تجارتی", desc: "ایمیل با دامنه خودتان همراه با SPF و DKIM.", tag: "تأییدشده", metric: "SPF/DKIM", linkText: "ساخت ایمیل" },
          { id: "dns-anycast", title: "DNS و گواهی SSL", desc: "مدیریت دامنه و گواهی امنیتی.", tag: "امن", metric: "SSL", linkText: "مدیریت DNS" },
        ],
        settlement: [
          { id: "hesabpay-qr", title: "پرداخت حساب‌پی", desc: "پرداخت دیجیتال به افغانی با QR حساب‌پی.", tag: "افغانی", metric: "حساب‌پی", linkText: "پرداخت" },
          { id: "hesabpay-desk", title: "پرداخت حساب‌پی", desc: "پرداخت دیجیتال امن از طریق حساب‌پی؛ ثبت پرداخت خودکار است.", tag: "دیجیتال", metric: "QR", linkText: "پرداخت با حساب‌پی" },
          { id: "transparent-ledger", title: "ثبت مالی شفاف", desc: "هر پرداخت در دفتر مالی ثبت و قابل پیگیری است.", tag: "شفاف", metric: "دفتر", linkText: "مشاهده" },
        ],
        edge: [
          { id: "kabul-pop", title: "تحویل از لبه شبکه", desc: "محتوا از نزدیک‌ترین نقطه به کاربر ارائه می‌شود.", tag: "سریع", metric: "CDN", linkText: "مشاهده" },
          { id: "regional-backbone", title: "منطقه ابری منطقوی", desc: "سرورها در نزدیکی منطقه‌ای افغانستان.", tag: "منطقه‌ای", metric: "منطقوی", linkText: "مشاهده" },
          { id: "offline-pwa-worker", title: "کارکرد آفلاین", desc: "سایت پس از نخستین بازدید بدون انترنت هم کار می‌کند.", tag: "آفلاین", metric: "PWA", linkText: "آزمایش" },
        ],
      },
    },
    infrastructure: {
      sectionBadge: "زیرساخت و معماری",
      sectionTitle: "زیرساخت ابری نزدیک به افغانستان",
      sectionSubtitle: "منطقه اصلی منطقه‌ای با شبکه تحویل لبه جهانی برای دسترسی سریع و مطمئن.",
      primaryRegionName: "منطقه اصلی — نزدیکی منطقه‌ای به افغانستان",
      primaryRegionLatency: "نزدیکی منطقه‌ای به افغانستان",
      kabulEdgeName: "شبکه تحویل لبه جهانی",
      kabulEdgeLatency: "تحویل کم‌تأخیر",
      heratEdgeName: "دیتابیس امن چندمشتری",
      heratEdgeLatency: "جداسازی داده هر مشتری",
      mazarEdgeName: "ذخیره‌سازی فایل و CDN",
      mazarEdgeLatency: "محتوای ثابت",
      kandaharEdgeName: "ایمیل تجارتی (SPF/DKIM)",
      kandaharEdgeLatency: "ارسال تأییدشده",
      statSla: "۳",
      statSlaLabel: "زبان: دری، پشتو، انگلیسی",
      statLatency: "امن",
      statLatencyLabel: "جداسازی چندمشتری",
      statDeliverability: "AFN",
      statDeliverabilityLabel: "واحد پرداخت محلی",
      statCurrency: "منطقوی",
      statCurrencyLabel: "منطقه‌ای + لبه جهانی",
    },
    solutions: {
      sectionBadge: "راه‌حل‌های صنفی",
      sectionTitle: "ساخته‌شده برای کسب‌وکارهای واقعی",
      sectionSubtitle: "معماری‌های آماده برای کلینیک‌ها، صادرکنندگان، نهادهای آموزشی و دکان‌ها.",
      blueprints: [
        { id: "clinics", title: "کلینیک‌ها و داکتران", headline: "نوبت‌دهی و تقسیم اوقات داکتران", desc: "وب‌سایت کلینیک با ثبت ساعات حضور داکتران، لیست آزمایش‌ها و رزرو نوبت از واتساپ.", deliverables: ["نوبت‌دهی واتساپ", "دامنه کلینیک", "لیست آزمایش‌ها"], ctaText: "مشاهده نمونه کلینیک" },
        { id: "exporters", title: "صادرکنندگان زعفران و جلغوزه", headline: "ویترین بین‌المللی محصولات", desc: "فروشگاه چندزبانه برای نمایش گواهی‌های کیفیت و دریافت درخواست قیمت از خریداران خارجی.", deliverables: ["سایت انگلیسی و عربی", "ایمیل تأییدشده", "کاتالوگ محصولات"], ctaText: "مشاهده نمونه صادرات" },
        { id: "education", title: "مکاتب و نهادهای آموزشی", headline: "دستیار درسی چندزبانه", desc: "پلتفرم آموزشی با دستیار هوش مصنوعی برای حل سوالات و نشر مضامین.", deliverables: ["دستیار درسی", "کتابخانه دیجیتال", "اپلیکیشن محصلین"], ctaText: "مشاهده نمونه معارف" },
        { id: "merchants", title: "دکان‌ها و اصناف", headline: "کاتالوگ دیجیتال محصولات", desc: "معرفی دکان و محصولات با پرداخت حساب‌پی.", deliverables: ["کاتالوگ محصولات", "پرداخت حساب‌پی", "سایت موبایلی"], ctaText: "مشاهده نمونه دکان" },
      ],
    },
    pricing: {
      badge: "قیمت‌گذاری",
      title: "پلن‌های متناسب با کسب‌وکار شما",
      subtitle: "قیمت‌ها بر اساس نیاز هر کسب‌وکار تعیین می‌شود. برای مشوره با ما تماس بگیرید.",
      tabBusiness: "کسب‌وکارها",
      tabConsumer: "افراد و محصلین",
      currencyLabel: "واحد پولی:",
      perYear: " / سالانه",
      perMonth: " / ماهانه",
      lifetime: " / دایمی",
      popularTag: "محبوب‌ترین",
      deployBtn: "تماس و فعال‌سازی",
      plans: {
        starter: { name: "استارتر", desc: "برای دکان‌ها و کسب‌وکارهای نوپا.", features: ["وب‌سایت هوشمند", "۱ ایمیل تجارتی", "دستیار واتساپ"] },
        professional: { name: "حرفه‌ای", desc: "برای شرکت‌ها و کلینیک‌ها.", features: ["دامنه اختصاصی", "ایمیل تأییدشده", "تصاویر تجارتی"] },
        intelligence: { name: "سازمانی", desc: "برای نهادهای بزرگ.", features: ["منابع بیشتر", "پشتیبانی اختصاصی", "اولویت تحویل"] },
        community: { name: "رایگان", desc: "دسترسی ابتدایی برای عموم.", features: ["گفتگوی متنی", "پاسخ‌های ابتدایی"] },
        student: { name: "محصلین", desc: "برای دانش‌آموزان و محصلان.", annualAlt: "تعرفه ویژه محصلین", features: ["دستیار درسی", "اسکن اسناد"] },
        creator: { name: "تولیدکنندگان", desc: "برای طراحان و فریلانسرها.", features: ["تولید تصویر", "موتور صوتی"] },
      },
    },
    charter: {
      badge: "مأموریت ما",
      title: "زیرساخت دیجیتال برای همه افغان‌ها",
      desc: "هدف آریا کلاود توانمندسازی کسب‌وکارها و مردم افغانستان با دسترسی آسان به زیرساخت ابری و هوش مصنوعی چندزبانه است — بدون نیاز به کارت بانکی خارجی.",
      barTitle: "",
      barSubtitle: "",
      pctDomain: "",
      pctInfra: "",
      pctAI: "",
      pctCashFee: "",
      pctWages: "",
      pctReserve: "",
    },
    faq: {
      title: "پرسش‌های متداول",
      q1: "چگونه بدون کارت بانکی پرداخت کنم؟",
      a1: "با اپلیکیشن حساب‌پی پرداخت کنید. پرداخت به‌صورت خودکار ثبت می‌شود.",
      q2: "آیا سایت در انترنت ضعیف کار می‌کند؟",
      a2: "بلی. سایت‌ها به‌صورت PWA ساخته می‌شوند و پس از نخستین بازدید، بخشی از محتوا به‌صورت آفلاین قابل مشاهده است.",
      q3: "چگونه سایت خود را تغییر دهم؟",
      a3: "نیازی به دانش فنی نیست. با ارسال پیام متنی یا صوتی در واتساپ، تغییرات به‌سرعت اعمال می‌شود.",
    },
    footer: {
      tagline: "زیرساخت ابری مستقل و هوش مصنوعی چندزبانه برای افغانستان",
      rights: "تمام حقوق محفوظ است — آریا کلاود.",
    },
  },
  ps: {
    dir: "rtl",
    ticker: "د افغانستان لپاره خپلواکه کلاوډ او څو ژبنی مصنوعي هوښ",
    nav: {
      solutions: "حلونه",
      aiMobile: "د آریا مصنوعي هوښ",
      identity: "ډومین او ایمیل",
      pricingCharter: "بیه او ماموریت",
      infra: "زیربنا",
      signIn: "کنسول ته ننوتل",
      getStarted: "پیل کړئ",
    },
    hero: {
      badge: "د افغانستان لپاره خپلواکه کلاوډ او څو ژبنی مصنوعي هوښ",
      headlineMain: "کلاوډ زیربنا او څو ژبنی مصنوعي هوښ، ",
      headlineHighlight: "د افغانستان لپاره جوړ شوی.",
      subheadline: "د افغاني سوداګرۍ د جوړولو، کوربه توب او ودې لپاره یو پلیټ فارم — په دري، پښتو او انګلیسي ژبو هوښیار ویب سایټونه، تایید شوي سوداګریز ایمیلونه او په افغانیو محلي تادیه. له بهرني کارت پرته.",
      ctaWhatsApp: "په واټساپ خبرې",
      ctaBusiness: "کنسول ته ننوتل",
      ctaDownloadApp: "د اندروید اپلیکیشن ښکته کول",
      listenSample: "طبیعي غږیزه نمونه واورئ",
      samplePlaying: "خپرېږي...",
      trustStrip: ["درې ژبی: دري، پښتو، انګلیسي", "بهرني کارت ته اړتیا نشته", "په افغانیو تادیه"],
      quickSpecs: ["په دریو ژبو هوښیار سایټ", "سوداګریز ایمیل (SPF/DKIM)", "محلي تادیه — حسابپی", "څو اړخیز جلاوالی"],
    },
    consolePreview: {
      title: "د آریا کلاوډ کنسول",
      subtitle: "ویب سایټ، ایمیل او تادیات په یوه ځای کې.",
      tabDiagram: "معماري",
      tabCli: "ترمینل",
      tabConfig: "تنظیمات",
      tabPreview: "مخکتنه",
      copyBtn: "کاپي",
      copiedBtn: "کاپي شو!",
      topology: {
        client: "سوداګریز پلورنځی (PWA)",
        edge: "نړیواله څنډه ییزه شبکه",
        backbone: "ابر منطقوی",
        coreAi: "د آریا هوښ او ډیټابیس",
        settlement: "حسابپی",
      },
    },
    pillars: {
      sectionTitle: "د ټولو ډیجیټل اړتیاوو لپاره یو پلیټ فارم",
      sectionSubtitle: "له لومړي ویب سایټ څخه تر سوداګریز ایمیل او تادیې — د افغانستان د انټرنیټ شرایطو لپاره ډیزاین شوی.",
      p1Title: "هوښیار ویب سایټ جوړونکی",
      p1Desc: "د کلینیکونو، ښوونځیو، صادرونکو او هټیو لپاره چټک او سپک سایټونه — په دري، پښتو او انګلیسي.",
      p1Tag: "درې ژبی PWA",
      p2Title: "د آریا مصنوعي هوښ سټوډیو",
      p2Desc: "غږیز، انځوریز او متني مرستیال چې دري او پښتو پوهیږي.",
      p2Tag: "غږ، انځور او خبرې",
      p3Title: "ډومین او سوداګریز ایمیل",
      p3Desc: "خپل ډومین (.af او .com) د تایید شوي ایمیل سره (SPF/DKIM).",
      p3Tag: "تایید شوی لېږل",
      p4Title: "محلي تادیه",
      p4Desc: "په افغانیو تادیه — د حسابپی QR.",
      p4Tag: "بهرني کارت ته اړتیا نشته",
    },
    catalog: {
      sectionBadge: "د آریا کلاوډ خدماتو کتلاګ",
      sectionTitle: "د افغان سوداګرۍ لپاره کلاوډ وسایل",
      sectionSubtitle: "د جوړولو، کوربه توب او ودې لپاره یو بشپړ سیسټم، ستاسو په خپله ژبه.",
      tabCompute: "سایټ او کوربه توب",
      tabAI: "مصنوعي هوښ",
      tabIdentity: "ډومین او ایمیل",
      tabSettlement: "تادیه",
      tabEdge: "امنیت او تحویل",
      services: {
        compute: [
          { id: "site-engine", title: "هوښیار ویب سایټ جوړونکی", desc: "د موبایل لپاره چټک او سپک سایټونه (PWA)، آفلاین او د ضعیف انټرنیټ لپاره برابر.", tag: "آفلاین", metric: "PWA", linkText: "سایټ جوړ کړئ" },
          { id: "sovereign-db", title: "امن څو اړخیز ډیټابیس", desc: "د هر پیرودونکي معلومات په بشپړ ډول جلا ساتل کیږي.", tag: "د معلوماتو جلاوالی", metric: "امن", linkText: "معماري وګورئ" },
          { id: "whatsapp-engine", title: "له واټساپ تازه کول", desc: "محصولات او بیې د واټساپ په یوه پیغام بدل کړئ.", tag: "اسان", metric: "واټساپ", linkText: "واټساپ وصل کړئ" },
        ],
        ai: [
          { id: "core-ai-chat", title: "د آریا مرکزي هوښ", desc: "د خبرو مرستیال چې دري، پښتو او انګلیسي پوهیږي.", tag: "څو ژبی", metric: "دري او پښتو", linkText: "خبرې پیل کړئ" },
          { id: "creative-studio", title: "انځور جوړونکی سټوډیو", desc: "د صادراتي محصولاتو او هټیو لپاره سوداګریز انځورونه.", tag: "انځور", metric: "اتومات", linkText: "انځور جوړ کړئ" },
          { id: "voice-ocr", title: "غږیز موټر", desc: "متن طبیعي خبرو ته اړول د دري او پښتو لهجو سره.", tag: "غږ", metric: "طبیعي", linkText: "غږ وازمایئ" },
        ],
        identity: [
          { id: "domain-registrar", title: ".af او .com ډومین", desc: "د خپلې سوداګرۍ لپاره ځانګړی ډومین.", tag: "ځانګړی", metric: ".af / .com", linkText: "ډومین ولټوئ" },
          { id: "cloud-mail-enterprise", title: "سوداګریز ایمیل", desc: "په خپل ډومین ایمیل د SPF او DKIM سره.", tag: "تایید شوی", metric: "SPF/DKIM", linkText: "ایمیل جوړ کړئ" },
          { id: "dns-anycast", title: "DNS او SSL", desc: "د ډومین او امنیتي سند مدیریت.", tag: "امن", metric: "SSL", linkText: "DNS مدیریت" },
        ],
        settlement: [
          { id: "hesabpay-qr", title: "حسابپي تادیه", desc: "په افغانیو ډیجیټل تادیه د حسابپي QR له لارې.", tag: "افغانۍ", metric: "حسابپي", linkText: "تادیه" },
          { id: "hesabpay-desk", title: "د حسابپي تادیه", desc: "د حسابپي له لارې خوندي ډیجیټل تادیه؛ ثبت یې اتوماتیک دی.", tag: "ډیجیټل", metric: "QR", linkText: "د حسابپي تادیه" },
          { id: "transparent-ledger", title: "شفاف مالي ثبت", desc: "هره تادیه په مالي دفتر کې ثبت او د تعقیب وړ ده.", tag: "شفاف", metric: "دفتر", linkText: "وګورئ" },
        ],
        edge: [
          { id: "kabul-pop", title: "له څنډې تحویل", desc: "محتوا له نږدې ټکي څخه کاروونکي ته وړاندې کیږي.", tag: "چټک", metric: "CDN", linkText: "وګورئ" },
          { id: "regional-backbone", title: "سیمه ییز کلاوډ سیمه", desc: "سرورونه د افغانستان نږدې سیمه کې.", tag: "سیمه ییز", metric: "منطقوی", linkText: "وګورئ" },
          { id: "offline-pwa-worker", title: "آفلاین کار", desc: "سایټ له لومړي کتنې وروسته پرته له انټرنیټ کار کوي.", tag: "آفلاین", metric: "PWA", linkText: "آزمایئ" },
        ],
      },
    },
    infrastructure: {
      sectionBadge: "زیربنا او معماري",
      sectionTitle: "کلاوډ زیربنا، افغانستان ته نږدې",
      sectionSubtitle: "سیمه ییزه اصلي سیمه د نړیوالې څنډه ییزې شبکې سره.",
      primaryRegionName: "اصلي سیمه — افغانستان ته نږدې",
      primaryRegionLatency: "افغانستان ته سیمه ییز نږدېوالی",
      kabulEdgeName: "نړیواله څنډه ییزه شبکه",
      kabulEdgeLatency: "چټک تحویل",
      heratEdgeName: "امن څو اړخیز ډیټابیس",
      heratEdgeLatency: "د هر پیرودونکي جلا معلومات",
      mazarEdgeName: "فایل ذخیره او CDN",
      mazarEdgeLatency: "ثابت محتوا",
      kandaharEdgeName: "ایمیل تجارتی (SPF/DKIM)",
      kandaharEdgeLatency: "تایید شوی لېږل",
      statSla: "۳",
      statSlaLabel: "ژبې: دري، پښتو، انګلیسي",
      statLatency: "امن",
      statLatencyLabel: "څو اړخیز جلاوالی",
      statDeliverability: "AFN",
      statDeliverabilityLabel: "محلي تادیې واحد",
      statCurrency: "منطقوی",
      statCurrencyLabel: "سیمه ییز + نړیواله څنډه",
    },
    solutions: {
      sectionBadge: "صنفي حلونه",
      sectionTitle: "د ریښتینو سوداګرۍ لپاره جوړ شوی",
      sectionSubtitle: "د کلینیکونو، صادرونکو، تعلیمي ادارو او هټیو لپاره چمتو معمارۍ.",
      blueprints: [
        { id: "clinics", title: "کلینیکونه او ډاکټران", headline: "د ډاکټرانو وخت او نوبت اخیستل", desc: "د کلینیک سایټ د ډاکټرانو د کاري وخت، د معایناتو لړلیک او د واټساپ له لارې نوبت سره.", deliverables: ["واټساپ نوبت", "کلینیک ډومین", "د معایناتو لړلیک"], ctaText: "د کلینیک نمونه" },
        { id: "exporters", title: "زعفران او جلغوزي صادرونکي", headline: "نړیوال نندارتون", desc: "څو ژبی پلورنځی د کیفیت سندونو او بهرنیو پیرودونکو لپاره.", deliverables: ["انګلیسي او عربي سایټ", "تایید شوی ایمیل", "محصولاتو کتلاګ"], ctaText: "د صادراتو نمونه" },
        { id: "education", title: "ښوونځي او تعلیمي ادارې", headline: "څو ژبی درسي مرستیال", desc: "تعلیمي پلیټ فارم د درسي پوښتنو حل لپاره د مصنوعي هوښ سره.", deliverables: ["درسي مرستیال", "ډیجیټل کتابتون", "زده کوونکو اپلیکیشن"], ctaText: "د ښوونځي نمونه" },
        { id: "merchants", title: "هټۍ او اصناف", headline: "ډیجیټل کتلاګ", desc: "د هټۍ او محصولاتو پېژندنه د حسابپي تادیې سره.", deliverables: ["محصولاتو کتلاګ", "حسابپي تادیه", "موبایلي سایټ"], ctaText: "د هټۍ نمونه" },
      ],
    },
    pricing: {
      badge: "بیه",
      title: "ستاسو د سوداګرۍ لپاره مناسب پلانونه",
      subtitle: "بیه د هرې سوداګرۍ د اړتیا سره سم ټاکل کیږي. د مشورې لپاره موږ سره اړیکه ونیسئ.",
      tabBusiness: "سوداګرۍ",
      tabConsumer: "وګړي او محصلین",
      currencyLabel: "پولي واحد:",
      perYear: " / کلنی",
      perMonth: " / میاشتنی",
      lifetime: " / دایمي",
      popularTag: "غوره",
      deployBtn: "اړیکه او فعالول",
      plans: {
        starter: { name: "پیل", desc: "د هټیو او نویو سوداګرۍ لپاره.", features: ["هوښیار سایټ", "۱ سوداګریز ایمیل", "واټساپ مرستیال"] },
        professional: { name: "مسلکي", desc: "د شرکتونو او کلینیکونو لپاره.", features: ["ځانګړی ډومین", "تایید شوی ایمیل", "سوداګریز انځورونه"] },
        intelligence: { name: "سازماني", desc: "د لویو ادارو لپاره.", features: ["ډېرې سرچینې", "ځانګړی ملاتړ", "لومړیتوب تحویل"] },
        community: { name: "وړیا", desc: "د عامو خلکو لپاره ابتدايي لاسرسی.", features: ["متني خبرې", "ابتدايي ځوابونه"] },
        student: { name: "محصلین", desc: "د زده کوونکو لپاره.", annualAlt: "د محصلینو ځانګړې بیه", features: ["درسي مرستیال", "سند سکین"] },
        creator: { name: "تولیدونکي", desc: "د ډیزاینرانو او فریلانسرانو لپاره.", features: ["انځور جوړونه", "غږیز موټر"] },
      },
    },
    charter: {
      badge: "زموږ ماموریت",
      title: "د ټولو افغانانو لپاره ډیجیټل زیربنا",
      desc: "د آریا کلاوډ موخه د افغانستان د سوداګرۍ او خلکو توانمندي ده — پرته له بهرني بانکي کارت، اسانه کلاوډ او څو ژبني مصنوعي هوښ ته لاسرسی.",
      barTitle: "",
      barSubtitle: "",
      pctDomain: "",
      pctInfra: "",
      pctAI: "",
      pctCashFee: "",
      pctWages: "",
      pctReserve: "",
    },
    faq: {
      title: "پوښتنې",
      q1: "پرته له بانکي کارت څنګه پیسې ورکړم؟",
      a1: "د حسابپي اپلیکیشن له لارې پیسې ورکړئ. تادیه په اتوماتيک ډول ثبت کیږي.",
      q2: "آیا سایټ په ضعیف انټرنیټ کې کار کوي؟",
      a2: "هو. سایټونه د PWA په توګه جوړیږي او له لومړۍ کتنې وروسته برخه محتوا آفلاین لیدل کیږي.",
      q3: "سایټ څنګه بدل کړم؟",
      a3: "تخنیکي پوهې ته اړتیا نشته. په واټساپ کې متني یا غږیز پیغام واستوئ، بدلونونه ژر پلي کیږي.",
    },
    footer: {
      tagline: "د افغانستان لپاره خپلواکه کلاوډ او څو ژبنی مصنوعي هوښ",
      rights: "ټول حقوق خوندي دي — آریا کلاوډ.",
    },
  },
  en: {
    dir: "ltr",
    ticker: "Sovereign cloud infrastructure & multilingual AI for Afghanistan",
    nav: {
      solutions: "Solutions",
      aiMobile: "Aria AI",
      identity: "Domains & Email",
      pricingCharter: "Pricing & Mission",
      infra: "Infrastructure",
      signIn: "Console Login",
      getStarted: "Get Started",
    },
    hero: {
      badge: "SOVEREIGN CLOUD INFRASTRUCTURE & MULTILINGUAL AI FOR AFGHANISTAN",
      headlineMain: "Cloud infrastructure and multilingual AI, ",
      headlineHighlight: "built for Afghanistan.",
      subheadline: "One platform to build, host, and grow Afghan businesses — AI-generated websites in Dari, Pashto and English, verified business email, and local payment in Afghanis. No foreign cards required.",
      ctaWhatsApp: "Talk to us on WhatsApp",
      ctaBusiness: "Open the console",
      ctaDownloadApp: "Download the Android app",
      listenSample: "Hear a natural voice sample",
      samplePlaying: "Playing…",
      trustStrip: ["Trilingual: Dari, Pashto, English", "No foreign cards required", "Pays in Afghanis"],
      quickSpecs: ["AI websites in three languages", "Business email (SPF/DKIM)", "Local payment — HesabPay", "Multi-tenant isolation"],
    },
    consolePreview: {
      title: "AriaCloud console",
      subtitle: "Manage websites, email and payments from one place.",
      tabDiagram: "Architecture",
      tabCli: "Terminal",
      tabConfig: "Config",
      tabPreview: "Preview",
      copyBtn: "Copy",
      copiedBtn: "Copied!",
      topology: {
        client: "Merchant storefront (PWA)",
        edge: "Global edge network",
        backbone: "ابر منطقوی",
        coreAi: "Aria AI & database",
        settlement: "HesabPay",
      },
    },
    pillars: {
      sectionTitle: "One platform for everything digital",
      sectionSubtitle: "From a first website to business email and payments — designed for Afghan connectivity.",
      p1Title: "AI website builder",
      p1Desc: "Generate fast, mobile-first sites for clinics, schools, exporters and shops — in Dari, Pashto and English.",
      p1Tag: "Trilingual PWA",
      p2Title: "Aria AI Studio",
      p2Desc: "Voice, image and chat assistants that understand Dari and Pashto.",
      p2Tag: "Voice, image & chat",
      p3Title: "Domains & business email",
      p3Desc: "Custom domains (.af, .com) with verified email (SPF/DKIM).",
      p3Tag: "Verified sending",
      p4Title: "Local payments",
      p4Desc: "Pay in Afghanis — HesabPay QR.",
      p4Tag: "No foreign cards",
    },
    catalog: {
      sectionBadge: "ARIACLOUD SERVICE CATALOG",
      sectionTitle: "Cloud building blocks for Afghan business",
      sectionSubtitle: "A unified platform to build, host and grow — in your own language.",
      tabCompute: "Sites & Hosting",
      tabAI: "AI",
      tabIdentity: "Domains & Email",
      tabSettlement: "Payments",
      tabEdge: "Delivery & Security",
      services: {
        compute: [
          { id: "site-engine", title: "AI website builder", desc: "Fast, lightweight PWA sites that work offline and on slow connections.", tag: "Offline", metric: "PWA", linkText: "Build a site" },
          { id: "sovereign-db", title: "Secure multi-tenant database", desc: "Each customer's data is fully isolated.", tag: "Data isolation", metric: "امن", linkText: "View architecture" },
          { id: "whatsapp-engine", title: "Update from WhatsApp", desc: "Change products and prices with a text or voice note.", tag: "Simple", metric: "WhatsApp", linkText: "Connect WhatsApp" },
        ],
        ai: [
          { id: "core-ai-chat", title: "Aria Core AI", desc: "A conversational assistant that understands Dari, Pashto and English.", tag: "Multilingual", metric: "Dari & Pashto", linkText: "Start chatting" },
          { id: "creative-studio", title: "Image studio", desc: "Commercial imagery for exports, clinics and shops.", tag: "Image", metric: "Automatic", linkText: "Generate" },
          { id: "voice-ocr", title: "Voice engine", desc: "Natural text-to-speech with Dari and Pashto accents.", tag: "Voice", metric: "Natural", linkText: "Try voice" },
        ],
        identity: [
          { id: "domain-registrar", title: ".af & .com domains", desc: "A custom domain for your business.", tag: "Custom", metric: ".af / .com", linkText: "Search domains" },
          { id: "cloud-mail-enterprise", title: "Business email", desc: "Email on your own domain with SPF and DKIM.", tag: "Verified", metric: "SPF/DKIM", linkText: "Create mailbox" },
          { id: "dns-anycast", title: "DNS & SSL", desc: "Domain management and security certificates.", tag: "Secure", metric: "SSL", linkText: "Manage DNS" },
        ],
        settlement: [
          { id: "hesabpay-qr", title: "HesabPay checkout", desc: "Digital payment in Afghanis via HesabPay QR.", tag: "AFN", metric: "HesabPay", linkText: "Pay" },
          { id: "hesabpay-desk", title: "HesabPay", desc: "Pay digitally with the HesabPay app; settlement is recorded automatically.", tag: "Digital", metric: "QR", linkText: "Pay with HesabPay" },
          { id: "transparent-ledger", title: "Transparent ledger", desc: "Every payment is recorded and traceable.", tag: "Transparent", metric: "Ledger", linkText: "View" },
        ],
        edge: [
          { id: "kabul-pop", title: "Edge delivery", desc: "Content served from the closest point to the user.", tag: "Fast", metric: "CDN", linkText: "View" },
          { id: "regional-backbone", title: "Regional cloud region", desc: "Servers in regional proximity to Afghanistan.", tag: "Regional", metric: "منطقوی", linkText: "View" },
          { id: "offline-pwa-worker", title: "Offline-ready", desc: "Your site keeps working after the first visit, even offline.", tag: "Offline", metric: "PWA", linkText: "Test" },
        ],
      },
    },
    infrastructure: {
      sectionBadge: "INFRASTRUCTURE & ARCHITECTURE",
      sectionTitle: "Cloud infrastructure, close to Afghanistan",
      sectionSubtitle: "A regional primary region with a global edge delivery network for fast, resilient access.",
      primaryRegionName: "Primary region — regional proximity",
      primaryRegionLatency: "Regional proximity to Afghanistan",
      kabulEdgeName: "Global edge network",
      kabulEdgeLatency: "Low-latency delivery",
      heratEdgeName: "Secure multi-tenant database",
      heratEdgeLatency: "Per-tenant data isolation",
      mazarEdgeName: "Object storage & CDN",
      mazarEdgeLatency: "Static assets",
      kandaharEdgeName: "Business email (SPF/DKIM)",
      kandaharEdgeLatency: "Verified sending",
      statSla: "3",
      statSlaLabel: "Languages: Dari, Pashto, English",
      statLatency: "امن",
      statLatencyLabel: "Multi-tenant isolation",
      statDeliverability: "AFN",
      statDeliverabilityLabel: "Local settlement currency",
      statCurrency: "منطقوی",
      statCurrencyLabel: "Regional + global edge",
    },
    solutions: {
      sectionBadge: "INDUSTRY SOLUTIONS",
      sectionTitle: "Built for real businesses",
      sectionSubtitle: "Ready-made architectures for clinics, exporters, schools and local shops.",
      blueprints: [
        { id: "clinics", title: "Clinics & doctors", headline: "Doctor schedules & WhatsApp booking", desc: "A clinic site with doctor hours, a test catalog, and appointment booking via WhatsApp.", deliverables: ["WhatsApp booking", "Clinic domain", "Test catalog"], ctaText: "Explore clinic blueprint" },
        { id: "exporters", title: "Saffron & pine nut exporters", headline: "International product showcase", desc: "A multilingual storefront to display quality certificates and receive buyer inquiries.", deliverables: ["English & Arabic site", "Verified email", "Product catalog"], ctaText: "Explore export blueprint" },
        { id: "education", title: "Schools & universities", headline: "Multilingual study assistant", desc: "An education platform with an AI assistant for solving questions and publishing materials.", deliverables: ["Study assistant", "Digital library", "Student app"], ctaText: "Explore education blueprint" },
        { id: "merchants", title: "Local merchants & shops", headline: "Digital product catalog", desc: "Showcase your shop and products with HesabPay payment.", deliverables: ["Product catalog", "HesabPay checkout", "Mobile site"], ctaText: "Explore merchant blueprint" },
      ],
    },
    pricing: {
      badge: "PRICING",
      title: "Plans that fit your business",
      subtitle: "Pricing is set to each business's needs. Contact us for a quote.",
      tabBusiness: "Businesses",
      tabConsumer: "Individuals & students",
      currencyLabel: "Currency:",
      perYear: " / year",
      perMonth: " / month",
      lifetime: " / lifetime",
      popularTag: "Most popular",
      deployBtn: "Contact to activate",
      plans: {
        starter: { name: "Starter", desc: "For shops and new businesses.", features: ["AI website", "1 business email", "WhatsApp assistant"] },
        professional: { name: "Professional", desc: "For companies and clinics.", features: ["Custom domain", "Verified email", "Commercial imagery"] },
        intelligence: { name: "Enterprise", desc: "For large organizations.", features: ["More resources", "Dedicated support", "Priority delivery"] },
        community: { name: "Free", desc: "Basic access for everyone.", features: ["Text chat", "Basic answers"] },
        student: { name: "Students", desc: "For school and university students.", annualAlt: "Special student rate", features: ["Study assistant", "Document scan"] },
        creator: { name: "Creators", desc: "For designers and freelancers.", features: ["Image generation", "Voice engine"] },
      },
    },
    charter: {
      badge: "OUR MISSION",
      title: "Digital infrastructure for every Afghan",
      desc: "AriaCloud exists to empower Afghan businesses and people with easy access to cloud infrastructure and multilingual AI — without needing a foreign bank card.",
      barTitle: "",
      barSubtitle: "",
      pctDomain: "",
      pctInfra: "",
      pctAI: "",
      pctCashFee: "",
      pctWages: "",
      pctReserve: "",
    },
    faq: {
      title: "Frequently asked questions",
      q1: "How do I pay without a bank card?",
      a1: "Pay digitally with the HesabPay app. Settlement is recorded automatically.",
      q2: "Does the site work on slow internet?",
      a2: "Yes. Sites are built as PWAs, so after the first visit part of the content remains viewable offline.",
      q3: "How do I make changes to my site?",
      a3: "No technical skills needed. Send a text or voice note on WhatsApp and changes are applied quickly.",
    },
    footer: {
      tagline: "Sovereign cloud infrastructure & multilingual AI for Afghanistan",
      rights: "All rights reserved — AriaCloud.",
    },
  },
};
