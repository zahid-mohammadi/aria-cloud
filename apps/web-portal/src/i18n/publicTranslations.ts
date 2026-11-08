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
      starter: {
        name: string;
        desc: string;
        features: string[];
      };
      professional: {
        name: string;
        desc: string;
        features: string[];
      };
      intelligence: {
        name: string;
        desc: string;
        features: string[];
      };
      community: {
        name: string;
        desc: string;
        features: string[];
      };
      student: {
        name: string;
        desc: string;
        annualAlt: string;
        features: string[];
      };
      creator: {
        name: string;
        desc: string;
        features: string[];
      };
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
    ticker: "وضعیت سیستم: فعال (سرور منطقوی: ۴۶ میلی‌ثانیه) | پرداخت نقدی و حسابپی: فعال",
    nav: {
      solutions: "راه‌حل‌های تجارتی",
      aiMobile: "هوش مصنوعی و مبایل",
      identity: "دامنه‌ها و ایمیل",
      pricingCharter: "قیمت‌ها و منشور ما",
      infra: "زیرساخت و شبکه",
      signIn: "ورود به کنسول",
      getStarted: "شروع بدون کارت بانکی",
    },
    hero: {
      badge: "زیرساخت مستقل ابری و هوش مصنوعی چندزبانه برای مردم افغانستان",
      headlineMain: "زیرساخت ابری مدرن و قدرتمند برای افغانستان. ",
      headlineHighlight: "بدون موانع بانکی.",
      subheadline: "تولید سیستم‌های ابری و وبسایت‌های سبک PWA در ۴۰ ثانیه، ثبت رسمی دامنه‌های .af و .com، ایمیل تجارتی تاییدشده، و دسترسی به هوش مصنوعی با زبان‌های دری و پشتو. پرداخت مصارف از طریق حسابپی یا نقد در محل.",
      ctaWhatsApp: "شروع رایگان در واتساپ",
      ctaBusiness: "ورود به کنسول و پلن‌ها",
      ctaDownloadApp: "دانلود اپلیکیشن اندروید (۱۲ ام‌بی)",
      listenSample: "شنیدن نمونه صدای طبیعی آریا",
      samplePlaying: "در حال پخش صدای زنده...",
      trustStrip: ["سازگار با انترنت ۲G/۳G", "بدون نیاز به ویزا کارت", "تایید نقدی در محل شما"],
      quickSpecs: ["سرعت انتقال منطقوی: ۴۶ میلی‌ثانیه", "ضمانت پایداری: ۹۹.۹۹٪", "تصفیه با افغانی (حسابپی/نقد)", "تاییدیه SPF و DKIM"],
    },
    consolePreview: {
      title: "کنسول مدیریت و معماری ابری آریا",
      subtitle: "طراحی شده برای پایداری در انترنت ضعیف و مصون از تحریم‌های بانکی بین‌المللی",
      tabDiagram: "نقشه معماری",
      tabCli: "ترمینال و CLI",
      tabConfig: "تنظیمات YAML",
      tabPreview: "پیش‌نمایش PWA",
      copyBtn: "کاپی",
      copiedBtn: "کاپی شد!",
      topology: {
        client: "کاربر / دکان (انترنت ۲G/۳G)",
        edge: "لبه شبکه کابل (۱۲ میلی‌ثانیه)",
        backbone: "مسیر منطقوی (۴۶ میلی‌ثانیه)",
        coreAi: "هوش مرکزی و دیتابیس مستقل",
        settlement: "حسابپی / نقد در محل با OTP",
      },
    },
    pillars: {
      sectionTitle: "یک پلتفرم کامل و مستقل برای نیازهای دیجیتال",
      sectionSubtitle: "طراحی شده برای از بین بردن تمامی موانع تکنالوژیکی و بانکی در افغانستان.",
      p1Title: "سازنده هوشمند وبسایت",
      p1Desc: "تولید سیستم‌های اختصاصی برای کلینیک‌های صحی (تقسیم اوقات داکتران)، مکاتب و پوهنتون‌ها، شرکت‌های لوژستیکی و صادرکنندگان جلغوزه و زعفران.",
      p1Tag: "به‌روزرسانی با ویس‌نوت واتساپ",
      p2Title: "استودیوی هوش مصنوعی و اپلیکیشن",
      p2Desc: "اپلیکیشن سبک اندروید (کمتر از ۱۲ ام‌بی). حل سوالات کانکور، ترجمه و تحلیل اسناد عریضه با کمره و گفتگو با صدای طبیعی دری و پشتو.",
      p2Tag: "موتور صوتی و هوش مرکزی آریا",
      p3Title: "دامنه‌ها و ایمیل تجارتی",
      p3Desc: "ثبت مستقیم دامنه‌های رسمی .af و .com به قیمت عمده رجسترار بدون واسطه، متصل به ایمیل‌های رسمی با تضمین ۱۰۰٪ عدم ارسال به اسپم.",
      p3Tag: "تأییدیه SPF / DKIM",
      p4Title: "پرداخت و تصفیه داخلی",
      p4Desc: "تصفیه سریع با افغانی از طریق اسکن کیوآر حسابپی یا تحویل پول نقد در محل کار به نماینده ساحوی همراه با کود تأییدی ۶ رقمی واتساپ.",
      p4Tag: "بدون نیاز به حساب خارجی",
    },
    catalog: {
      sectionBadge: "کاتالوگ خدمات ابری آریا",
      sectionTitle: "سرویس‌های ابری سطح انترپرایز به قیمت واقعی",
      sectionSubtitle: "تمام ابزارهای مورد نیاز برای ساخت، میزبانی و رشد تجارت در یک پلتفرم یکپارچه ابری.",
      tabCompute: "محاسبات ابری و PWA",
      tabAI: "هوش مصنوعی و پردازش تصویر",
      tabIdentity: "دامنه‌ها و ایمیل سازمانی",
      tabSettlement: "تصفیه مالی و نقد در محل",
      tabEdge: "شبکه لبه و امنیت ابری",
      services: {
        compute: [
          {
            id: "site-engine",
            title: "سازنده هوشمند وبسایت تجارتی",
            desc: "تولید وبسایت‌های PWA با قابلیت ذخیره آفلاین در کمتر از ۴۰ ثانیه، بهینه‌سازی‌شده برای انترنت ۲G و ۳G افغانستان.",
            tag: "زمان پاسخ: ۱.۲ ثانیه",
            metric: "PWA آفلاین",
            linkText: "آزمایش در کنسول",
          },
          {
            id: "sovereign-db",
            title: "دیتابیس ابری مستقل",
            desc: "ذخیره‌سازی اطلاعات با انکریپشن کامل و جداسازی اختصاصی برای هر مشتری تجارتی، بدون ریسک تحریم خارجی.",
            tag: "۹۹.۹۹٪ پایداری",
            metric: "انکریپشن اختصاصی",
            linkText: "مشاهده معماری",
          },
          {
            id: "whatsapp-engine",
            title: "موتور به‌روزرسانی واتساپ",
            desc: "تغییر محصولات، قیمت‌ها و تقسیم اوقات داکتران تنها با ارسال پیام صوتی (ویس) به ربات هوشمند واتساپ.",
            tag: "همگام‌سازی در ۳۰ ثانیه",
            metric: "پاسخگوی خودکار",
            linkText: "اتصال به واتساپ",
          },
        ],
        ai: [
          {
            id: "core-ai-chat",
            title: "هوش مرکزی آریا",
            desc: "مدل زبانی بومی با درک کامل اصطلاحات دری، پشتو و انگلیسی، متخصص سوالات کانکور و امور تجارتی.",
            tag: "پاسخ در لحظه",
            metric: "دری و پشتو",
            linkText: "شروع گفتگو",
          },
          {
            id: "creative-studio",
            title: "استودیوی خلاق و پرو کنواس آریا",
            desc: "تولید تصاویر تجارتی باکیفیت بالا برای پوسترهای زعفران، قالین، کلینیک‌ها و محصولات صادراتی.",
            tag: "کیفیت بالا",
            metric: "طراحی خودکار",
            linkText: "تولید تصویر",
          },
          {
            id: "voice-ocr",
            title: "موتور صوتی و اسکنر عریضه آریا",
            desc: "تبدیل صوت به متن با لهجه‌های کابل و هرات و تحلیل اسناد دست‌نویس عریضه با کمره تیلیفون.",
            tag: "دقت بالا در خط دست",
            metric: "شنیدن صوت",
            linkText: "اسکن اسناد",
          },
        ],
        identity: [
          {
            id: "domain-registrar",
            title: "ثبت مستقیم دامنه‌های رسمی .af و .com",
            desc: "اتصال مستقیم به رجسترار وزارت مخابرات (MCIT) و رجسترارهای معتبر جهانی به قیمت تمام‌شد عمده.",
            tag: "فعالسازی در چند دقیقه",
            metric: "قیمت عمده",
            linkText: "جستجوی دامنه",
          },
          {
            id: "cloud-mail-enterprise",
            title: "ایمیل سازمانی تاییدشده آریا",
            desc: "ایمیل با نام دامنه اختصاصی شما همراه با رکوردهای SPF و DKIM جهت تضمین ورود مستقیم به اینباکس.",
            tag: "تضمین ۱۰۰٪ اینباکس",
            metric: "SPF / DKIM",
            linkText: "ساخت ایمیل",
          },
          {
            id: "dns-anycast",
            title: "دی‌ان‌اس جهانی لبه آریا",
            desc: "مسیریابی هوشمند ترافیک با سرعت لبه، فیلتر اتومات حملات DDoS و گواهی SSL رایگان دایمی.",
            tag: "سرعت: ۱۸ میلی‌ثانیه",
            metric: "SSL رایگان",
            linkText: "مدیریت DNS",
          },
        ],
        settlement: [
          {
            id: "hesabpay-qr",
            title: "درگاه دیجیتال حسابپی",
            desc: "تصفیه آنی حق اشتراک و خدمات با اسکن کیوآر کود حسابپی به افغانی، بدون کسر فیس‌های پنهان.",
            tag: "تصفیه آنی",
            metric: "افغانی (AFN)",
            linkText: "تادیه با حسابپی",
          },
          {
            id: "cash-otp-desk",
            title: "تایید نقد در محل با کود ۶ رقمی OTP",
            desc: "مراجعه نماینده رسمی آریا به دکان یا دفتر شما، دریافت نقد و فعال‌سازی سرویس با کود واتساپ.",
            tag: "کابل، هرات و مزار",
            metric: "امنیت ۱۰۰٪",
            linkText: "درخواست نماینده",
          },
          {
            id: "transparent-ledger",
            title: "سیستم مالی شفاف و فاکتور رسمی",
            desc: "صدور بل و فاکتور رسمی مالیاتی با تفکیک مصارف سرور، رجسترار و معاشات انجنیران محلی.",
            tag: "شفافیت عام‌المنفعه",
            metric: "بل رسمی",
            linkText: "مشاهده منشور",
          },
        ],
        edge: [
          {
            id: "kabul-pop",
            title: "گره لبه کابل (KBL-Edge-1)",
            desc: "مسیریابی مستقیم ترافیک مشتریان در کابل با تاخیر کم و بارگذاری لحظه‌ای صفحات.",
            tag: "۱۲ میلی‌ثانیه تاخیر",
            metric: "اتصال فیبر نوری",
            linkText: "مشاهده وضعیت",
          },
          {
            id: "regional-backbone",
            title: "بزرگراه ترافیک منطقوی (me-central-1)",
            desc: "ارتباط پرسرعت با سرورهای قدرتمند منطقوی بدون وابستگی به کارت‌های بانکی تحریم‌شده.",
            tag: "۴۶ میلی‌ثانیه تاخیر",
            metric: "پایداری کامل",
            linkText: "بررسی پینگ",
          },
          {
            id: "offline-pwa-worker",
            title: "تکنالوژی ذخیره‌سازی آفلاین PWA",
            desc: "ادامه فعالیت وبسایت و نمایش محصولات حتی در صورت قطع کامل انترنت یا برق در شهر.",
            tag: "کارکرد بدون انترنت",
            metric: "کش هوشمند",
            linkText: "تست سرعت",
          },
        ],
      },
    },
    infrastructure: {
      sectionBadge: "زیرساخت و شبکه ابری",
      sectionTitle: "شبکه منطقوی و گره‌های لبه در افغانستان",
      sectionSubtitle: "ترافیک مشتریان شما از طریق گره‌های لبه محلی در کابل و هرات به صورت فوق‌سریع منتقل می‌شود.",
      primaryRegionName: "سرور منطقوی مرکزی (me-central-1)",
      primaryRegionLatency: "۴۶ میلی‌ثانیه P95",
      kabulEdgeName: "گره لبه فیبر کابل (KBL-Edge-1)",
      kabulEdgeLatency: "۱۲ میلی‌ثانیه",
      heratEdgeName: "دروازه لبه هرات (HRT-Edge-1)",
      heratEdgeLatency: "۱۸ میلی‌ثانیه",
      mazarEdgeName: "گره لبه مزار شریف (MZR-Edge-1)",
      mazarEdgeLatency: "۲۲ میلی‌ثانیه",
      kandaharEdgeName: "گره لبه قندهار (KDH-Edge-1)",
      kandaharEdgeLatency: "۲۸ میلی‌ثانیه",
      statSla: "۹۹.۹۹٪",
      statSlaLabel: "تضمین پایداری ابری (SLA)",
      statLatency: "۴۶ میلی‌ثانیه",
      statLatencyLabel: "سرعت انتقال داده منطقوی",
      statDeliverability: "۱۰۰٪",
      statDeliverabilityLabel: "تحویل ایمیل به اینباکس (DKIM)",
      statCurrency: "افغانی (AFN)",
      statCurrencyLabel: "قیمت‌گذاری داخلی به قیمت تمام‌شد",
    },
    solutions: {
      sectionBadge: "راه‌حل‌های کاربردی برای صنایع",
      sectionTitle: "معماری آماده برای نیازهای واقعی کشور",
      sectionSubtitle: "سیستم‌های از پیش تنظیم‌شده که در کمتر از ۲ ساعت راه‌اندازی و تحویل داده می‌شوند.",
      blueprints: [
        {
          id: "clinics",
          title: "کلینیک‌های صحی و داکتران",
          headline: "نوبت‌دهی هوشمند و تقسیم اوقات داکتران متخصص",
          desc: "وبسایت اختصاصی برای کلینیک با ثبت ساعات حضور داکتران، نمایش موقعیت جغرافیایی و ثبت نام نوبت مریضان از طریق پیام و ویس واتساپ.",
          deliverables: ["سیستم نوبت‌دهی آفلاین", "دامنه رسمی کلینیک", "پاسخگوی صوتی در واتساپ"],
          ctaText: "مشاهده نمونه کلینیک",
        },
        {
          id: "exporters",
          title: "صادرکنندگان جلغوزه و زعفران",
          headline: "ویترین بین‌المللی و کاتالوگ ارزی محصولات",
          desc: "فروشگاه چندزبانه برای صادرکنندگان جهت نمایش گواهی‌نامه‌های کیفیت، دریافت درخواست قیمت (RFQ) و ارتباط با خریداران خلیج و اروپا.",
          deliverables: ["سایت انگلیسی و عربی", "ایمیل‌های تاییدشده تجارتی", "کاتالوگ با کیفیت بالا"],
          ctaText: "مشاهده نمونه صادرات",
        },
        {
          id: "education",
          title: "پوهنتون‌ها و استادان معارف",
          headline: "دستیار تدریس، حل سوالات کانکور و نشر مضامین",
          desc: "پلتفرم آموزشی و وبسایت اختصاصی برای مکاتب و اساتید با دستیار هوش مصنوعی چندزبانه جهت تحلیل کتاب‌ها و پاسخ به سوالات محصلین.",
          deliverables: ["استاد راهنمای کانکور", "کتابخانه اسناد دیجیتال", "اپلیکیشن سبک محصلین"],
          ctaText: "مشاهده نمونه معارف",
        },
        {
          id: "merchants",
          title: "اصناف و دکانداران محلی",
          headline: "کاتالوگ دیجیتال محصولات با تصفیه حسابپی",
          desc: "معرفی دکان، کاتالوگ قیمت‌ها و دریافت پول از مشتریان با کیوآر کود حسابپی یا تحویل نقد در کابل و ولایات.",
          deliverables: ["ثبت در نقشه و واتساپ", "پرداخت با حسابپی", "سایت بدون نیاز به کمپیوتر"],
          ctaText: "مشاهده نمونه دکان",
        },
      ],
    },
    pricing: {
      badge: "قیمت‌گذاری شفاف به قیمت تمام‌شد",
      title: "قیمت‌های قابل پیش‌بینی. ارزش ماندگار.",
      subtitle: "هر افغانی از اشتراک شما مستقیماً صرف معاشات انجنیران افغان، سرورها و فیس‌های رسمی دامنه می‌گردد.",
      tabBusiness: "پلن‌های تجارتی و شرکت‌ها",
      tabConsumer: "اپلیکیشن هوش مصنوعی مبایل (شخصی/محصلین)",
      currencyLabel: "واحد پولی:",
      perYear: " / سالانه",
      perMonth: " / ماهوار",
      lifetime: " / دایمی",
      popularTag: "محبوب‌ترین انتخاب",
      deployBtn: "انتخاب و فعال‌سازی",
      plans: {
        starter: {
          name: "آریا استارتر",
          desc: "مناسب برای مشاغل نوپا، دکانداران و اصناف محلی در کابل و ولایات.",
          features: [
            "میزبانی ابری با زیردامنه اختصاصی",
            "۱ ایمیل رسمی تجارتی با ضداسپم",
            "دستیار هوش مرکزی آریا در واتساپ",
            "سایت سبک PWA با دسترسی آفلاین",
            "تصفیه با حسابپی و نقد در محل"
          ],
        },
        professional: {
          name: "آریا حرفه‌ای",
          desc: "پلن جامع و کامل برای شرکت‌ها، کلینیک‌ها و صادرکنندگان جلغوزه و زعفران.",
          features: [
            "دامنه اختصاصی رسمی .af یا .com رایگان",
            "۲ ایمیل رسمی با تأییدیه کامل SPF و DKIM",
            "۳۰ تصویر استودیوی حرفه‌ای آریا در ماه",
            "پاسخگوی هوشمند خودکار در واتساپ",
            "تحویل و تایید نقد در محل با کود ۶ رقمی OTP"
          ],
        },
        intelligence: {
          name: "آریا پرو هوش پیشرفته",
          desc: "بالاترین سطح توانمندی تحلیلی برای موسسات، پوهنتون‌ها و تجارت‌های کلان.",
          features: [
            "موتور استدلال و هوش پیشرفته آریا",
            "۵ ایمیل رسمی با فضای ارتقایافته",
            "۶۰ تصویر باکیفیت استودیوی پرو آریا در ماه",
            "اولویت ترافیک در شبکه تحویل محتوای لبه",
            "مدیر اختصاصی پشتیبانی تخنیکی در کابل"
          ],
        },
        community: {
          name: "آریا عامه و محلی",
          desc: "دسترسی رایگان و دایمی برای استفاده ابتدایی مردم عام و یادگیری عمومی.",
          features: [
            "گفتگوی متنی با هوش مصنوعی دری و پشتو",
            "حل ابتدایی تمرینات و درس‌ها",
            "دسترسی از طریق وب و مبایل",
            "بدون هیچ‌گونه فیس یا اشتراک ماهوار"
          ],
        },
        student: {
          name: "آریا محصلین و معارف",
          desc: "بسته ویژه با حمایت عام‌المنفعه برای شاگردان مکاتب، پوهنتون‌ها و استادان.",
          annualAlt: "یا ۱,۴۰۰ افغانی سالانه",
          features: [
            "استاد رهنمای کانکور و دروس پوهنتون",
            "تحلیل و اسکن عریضه و اسناد با کمره",
            "شنیدن جوابات با موتور صوتی طبیعی آریا",
            "اپلیکیشن بسیار سبک اندروید (کمتر از ۱۲ ام‌بی)",
            "پرداخت آسان با حسابپی یا کریدت مبایل"
          ],
        },
        creator: {
          name: "آریا تولیدکنندگان محتوا",
          desc: "امکانات نامحدود برای طراحان، نویسندگان، مترجمان و فریلانسرهای مستقل.",
          features: [
            "تولید تصویر با استودیوی سریع و پرو کنواس آریا",
            "تبدیل صوت و متن نامحدود با لهجه‌های اصیل",
            "خروجی باکیفیت اسناد و عریضه‌های رسمی",
            "همگام‌سازی ابری روی چند دستگاه همزمان"
          ],
        },
      },
    },
    charter: {
      badge: "منشور سازمانی ما",
      title: "تکنالوژی واقعی به قیمت واقعی. بدون سود انحصاری.",
      desc: "شرکت‌های سنتی برای وبسایت‌های وردپرس تا ۴۰,۰۰۰ افغانی مطالبه می‌کنند. آریا کلاود به عنوان یک زیرساخت عام‌المنفعه فعالیت نموده و هزینه ۴,۸۰۰ افغانی سالانه را با شفافیت کامل تقسیم می‌کند:",
      barTitle: "نحوه تقسیم ۴,۸۰۰ افغانی حق اشتراک سالانه",
      barSubtitle: "شفافیت ۱۰۰٪ عملیاتی",
      pctDomain: "۱۳.۰٪ فیس ثبت دامنه .com/.af",
      pctInfra: "۳.۴٪ سرورها و ترافیک کلاود",
      pctAI: "۴.۸٪ پردازش هوش مصنوعی آریا",
      pctCashFee: "۴.۷٪ مصارف رفت‌وآمد نماینده نقدی",
      pctWages: "۵۴.۱٪ معاشات انجنیران و تیم در کابل و هرات",
      pctReserve: "۲۰.۰٪ ذخیره احتیاطی و ارتقای مدل‌ها",
    },
    faq: {
      title: "سوالات متداول کاربران",
      q1: "چگونه می‌توانم بدون داشتن حساب بانکی یا ویزا کارت پرداخت کنم؟",
      a1: "شما نیازی به کارت خارجی ندارید. می‌توانید با اپلیکیشن حسابپی تادیه نمایید یا گزینه پرداخت نقدی را انتخاب کنید. نماینده ساحوی آریا به دفتر یا دکان شما مراجعه کرده و با دریافت پول، کود ۶ رقمی واتساپ را برای فعال‌سازی فوری وارد می‌کند.",
      q2: "آیا در جریان ضعیف بودن انترنت یا قطع برق وبسایت کار می‌کند؟",
      a2: "بلی. تمامی وبسایت‌ها با تکنالوژی PWA ساخته شده‌اند. زمانی که مشتری یکبار سایت شما را باز کند، معلومات و محصولات در تیلیفون او ذخیره شده و بدون انترنت نیز قابل دسترس می‌ماند.",
      q3: "چگونه می‌توانم تغییرات یا قیمت‌ها را در سایت خود تغییر دهم؟",
      a3: "نیازی به بلدیت با کامپیوتر یا کودنویسی نیست. کافی است در واتساپ به دستیار آریا یک پیام صوتی (ویس) یا متنی بفرستید. سیستم سایت شما را در کمتر از ۳۰ ثانیه به‌روزرسانی می‌کند.",
    },
    footer: {
      tagline: "زیرساخت مستقل ابری و هوش مصنوعی چندزبانه برای مردم افغانستان",
      rights: "تمامی حقوق برای زیرساخت عام‌المنفعه آریا کلاود محفوظ است.",
    },
  },
  ps: {
    dir: "rtl",
    ticker: "د سیسټم حالت: فعال (سیمه ایز سرور: ۴۶ میلی ثانیې) | نغدي تادیات او حسابپی: فعال",
    nav: {
      solutions: "سوداګریز حلونه",
      aiMobile: "مصنوعي هوښ او مبایل",
      identity: "ډومینونه او رسمي ایمیل",
      pricingCharter: "بیې او زموږ تګلاره",
      infra: "زیربنا او کلاوډ شبکه",
      signIn: "کنسول ته ننوتل",
      getStarted: "له بانکي کارت پرته پیل",
    },
    hero: {
      badge: "د افغانستان خلکو لپاره خپلواک کلاوډ او مصنوعي هوښ",
      headlineMain: "د سوداګرۍ او پرمختګ لپاره عصري کلاوډ زیربنا، ",
      headlineHighlight: "له بانکي خنډونو پرته.",
      subheadline: "په ۴۰ ثانیو کې د PWA سپکو ویب سایټونو جوړول، د رسمي .af او .com ډومینونو مستقیم ثبت، رسمي سوداګریز ایمیلونه، او په پښتو او دري ژبو بشپړ مصنوعي هوښ. تادیه په افغانیو د حسابپی یا نغدو پیسو له لارې.",
      ctaWhatsApp: "په واټساپ کې وړیا پیل کړئ",
      ctaBusiness: "کنسول ته ننوتل او بیې",
      ctaDownloadApp: "د اندروید اپلیکیشن ښکته کړئ (۱۲ ام‌بی)",
      listenSample: "د آریا غږیزه نمونه واورئ",
      samplePlaying: "د غږ خپرېدل روان دي...",
      trustStrip: ["په ۲G/۳G کې بې حده چټک", "نړیوال بانکي کارت ته اړتیا نشته", "ستاسو په ځای کې نغدي تایید"],
      quickSpecs: ["سیمه ییز سرعت: ۴۶ میلی ثانیې", "د سیستم پایداری: ۹۹.۹۹٪", "په افغانیو تادیه (حسابپی/نغدي)", "د SPF او DKIM رسمي تصدیق"],
    },
    consolePreview: {
      title: "د آریا کلاوډ مدیریت او انجینري کنسول",
      subtitle: "په ضعیف انټرنیټ کې د چټک کار او له بندیزونو پرته خپلواک ډیزاین شوی سیستم",
      tabDiagram: "د شبکې نقشه",
      tabCli: "ترمینل او CLI",
      tabConfig: "د YAML تنظیمات",
      tabPreview: "د PWA لید",
      copyBtn: "کاپی",
      copiedBtn: "کاپی شو!",
      topology: {
        client: "کاروونکی / هټۍ (۲G/۳G انټرنیټ)",
        edge: "کابل لومړی مرکز (۱۲ میلی ثانیې)",
        backbone: "سیمه ییزه شبکه (۴۶ میلی ثانیې)",
        coreAi: "مرکزي هوښ او خپلواکه دیتابیس",
        settlement: "حسابپی / ستاسو په ځای کې نغد د OTP سره",
      },
    },
    pillars: {
      sectionTitle: "د افغانستان د پرمختګ لپاره خپلواکه ډیجیټل زیربنا",
      sectionSubtitle: "د نړیوالو بندیزونو او بانکي ستونزو د حل لپاره یو ځانګړی سیستم.",
      p1Title: "د ویب سایټ چټک جوړونکی",
      p1Desc: "د روغتیايي کلینیکونو (د ډاکټرانو تقسیم اوقات)، ښوونځیو، لوژستیکي او جلغوزیو/زعفرانو صادراتي شرکتونو لپاره ځانګړي سایټونه.",
      p1Tag: "د واټساپ په غږ سایټ بدل کړئ",
      p2Title: "د مصنوعي هوښ سټوډیو او مبایل",
      p2Desc: "د مبایل لپاره تر ۱۲ امبي سپک اپلیکیشن. د کانکور ازموینو حل، په کمره د عریضې او اسنادو ژباړه او په پښتو او دري غږیزې خبرې.",
      p2Tag: "د آریا غږیز او مرکزي هوښ",
      p3Title: "ډومینونه او رسمي ایمیل",
      p3Desc: "د .af او .com ډومینونو مستقیم ثبت د حکومت له رسمي لارې، او رسمي سوداګریز ایمیلونه چې هیڅکله سپام ته نه ځي.",
      p3Tag: "د SPF / DKIM تصدیق",
      p4Title: "کورني مالي تادیات",
      p4Desc: "په افغانیو د حسابپی QR کوډ له لارې اسانه تادیه، یا ستاسو ځای ته د استازي لخوا نغدي رسید د واټساپ ۶ عددي کوډ سره.",
      p4Tag: "بهرني بانک ته اړتیا نشته",
    },
    catalog: {
      sectionBadge: "د آریا کلاوډ خدماتو کتلاګ",
      sectionTitle: "په اصلي او عادلانه بیه مسلکي کلاوډ خدمات",
      sectionSubtitle: "د سوداګرۍ جوړولو او پرمختګ لپاره ټول اړین وسایل په یو متحد کلاوډ پلیټ فارم کې.",
      tabCompute: "محاسبات او PWA سایټونه",
      tabAI: "مصنوعي هوښ او انځور جوړونه",
      tabIdentity: "ډومینونه او رسمي ایمیل",
      tabSettlement: "مالي تصفیه او نغدي رسید",
      tabEdge: "څنډه ییزه شبکه او امنیت",
      services: {
        compute: [
          {
            id: "site-engine",
            title: "د ویب سایټ ځیرک جوړونکی",
            desc: "په ۴۰ ثانیو کې د PWA ویب سایټونو تولید چې پرته له انټرنیټ هم کار کوي، د هیواد د ۲G او ۳G شبکو لپاره چمتو شوی.",
            tag: "د ښودلو وخت: ۱.۲ ثانیې",
            metric: "آفلاین PWA",
            linkText: "په کنسول کې ازموینه",
          },
          {
            id: "sovereign-db",
            title: "خپلواکه کلاوډ ډیټابیس",
            desc: "د هر سوداګر معلومات په بشپړ انکریپشن او له بهرنیو بندیزونو پرته خوندي ساتل کیږي.",
            tag: "۹۹.۹۹٪ پایداری",
            metric: "پوره امنیت",
            linkText: "معماري وګورئ",
          },
          {
            id: "whatsapp-engine",
            title: "د واټساپ غږیز سمون",
            desc: "د ویب سایټ بیې، د ډاکټرانو وختونه او توکي یوازې د واټساپ غږیز پیغام (وائس) په لیږلو نوي کړئ.",
            tag: "په ۳۰ ثانیو کې سمون",
            metric: "اتومات ملاتړ",
            linkText: "له واټساپ سره نښلول",
          },
        ],
        ai: [
          {
            id: "core-ai-chat",
            title: "د آریا مرکزي هوښ",
            desc: "په پښتو، دري او انګلیسي ژبو ژور پوهیدونکی موډل، د کانکور پوښتنو او اداري کارونو لپاره ځانګړی شوی.",
            tag: "سمدستي ځواب",
            metric: "پښتو او دري",
            linkText: "خبرې پیل کړئ",
          },
          {
            id: "creative-studio",
            title: "د آریا هنري او انځوریز سټوډیو",
            desc: "د زعفرانو، جلغوزیو، قالینو او صادراتي محصولاتو لپاره د لوړ کیفیت سوداګریز انځورونه او ډیزاین.",
            tag: "لوړ کیفیت",
            metric: "اتومات ډیزاین",
            linkText: "انځور جوړ کړئ",
          },
          {
            id: "voice-ocr",
            title: "د عریضې او اسنادو کمره سکینر",
            desc: "په اصیلو لهجو غږیز ځوابونه او د مبایل په کمره د عریضو او دولتي اسنادو ژباړه او تحلیل.",
            tag: "د لاس لیکلو لوستل",
            metric: "طبیعي غږ",
            linkText: "اسناد سکین کړئ",
          },
        ],
        identity: [
          {
            id: "domain-registrar",
            title: "د رسمي .af او .com ډومینونو ثبت",
            desc: "له مخابراتو وزارت (MCIT) او نړیوالو ادارو سره مستقیم اتصال په اصلي او عمده بیه.",
            tag: "په څو دقیقو کې فعال",
            metric: "اصلي عمده بیه",
            linkText: "ډومین وپلټئ",
          },
          {
            id: "cloud-mail-enterprise",
            title: "د آریا رسمي سوداګریز ایمیل",
            desc: "ستاسو په خپل ډومین رسمي ایمیل چې د SPF او DKIM تصدیق لري ترڅو هیڅکله سپام ته لاړ نشي.",
            tag: "۱۰۰٪ ان باکس تضمین",
            metric: "SPF / DKIM",
            linkText: "ایمیل جوړ کړئ",
          },
          {
            id: "dns-anycast",
            title: "د آریا نړیوال ګړندی DNS",
            desc: "د انټرنیټي حملاتو ضد دفاع، چټک بارګیري او دایمي وړیا SSL امنیتي سند.",
            tag: "سرعت: ۱۸ میلی ثانیې",
            metric: "وړیا SSL",
            linkText: "د DNS تنظیمات",
          },
        ],
        settlement: [
          {
            id: "hesabpay-qr",
            title: "د حسابپی ډیجیټل تادیه",
            desc: "په افغانیو د حسابپی د QR کوډ له لارې د کلاوډ خدماتو سمدستي اداینه پرته له کوم اضافي لګښت.",
            tag: "سمدستي حساب",
            metric: "افغانۍ (AFN)",
            linkText: "په حسابپی ورکړئ",
          },
          {
            id: "cash-otp-desk",
            title: "ستاسو په ځای کې نغدي تسلیمي د OTP سره",
            desc: "زموږ استازی ستاسو هټۍ یا دفتر ته راځي، پیسې اخلي او د واټساپ ۶ عددي کوډ له لارې خدمت فعالوي.",
            tag: "کابل، هرات او مزار",
            metric: "۱۰۰٪ باوري",
            linkText: "استازی وغواړئ",
          },
          {
            id: "transparent-ledger",
            title: "شفاف مالیاتي حساب او رسمي بل",
            desc: "د سرورونو د لګښت، ډومین بیې او د افغان انجنیرانو د معاشاتو د ویش روښانه او شفاف راپور.",
            tag: "عام المنفعه تګلاره",
            metric: "رسمي فاکتور",
            linkText: "منشور وګورئ",
          },
        ],
        edge: [
          {
            id: "kabul-pop",
            title: "د کابل څنډه ییز مرکز (KBL-Edge-1)",
            desc: "په کابل کې د انټرنیټي ترافیک خورا چټک لیږد او د پاڼو په کمه اندازه میلی ثانیو کې خلاصیدل.",
            tag: "۱۲ میلی ثانیې سرعت",
            metric: "نوري فایبر",
            linkText: "حالت وګورئ",
          },
          {
            id: "regional-backbone",
            title: "سیمه ییزه چټکه لار (me-central-1)",
            desc: "له نړیوالو بانکي کارتونو پرته له سیمه ییزو اصلي او پیاوړو سرورونو سره مستقیم نښلول.",
            tag: "۴۶ میلی ثانیې سرعت",
            metric: "بشپړ ثبات",
            linkText: "پینګ ازموینه",
          },
          {
            id: "offline-pwa-worker",
            title: "د PWA آفلاین ځیرک ساتونکی",
            desc: "حتی که په ښار کې برښنا یا انټرنیټ پرې شي، ستاسو ویب سایټ د پیرودونکو په مبایل کې خلاص پاتې کیږي.",
            tag: "له انټرنیټ پرته کار",
            metric: "هوښیار کیش",
            linkText: "سرعت ازموینه",
          },
        ],
      },
    },
    infrastructure: {
      sectionBadge: "زیربنا او کلاوډ شبکه",
      sectionTitle: "په افغانستان کې سیمه ییزه شبکه او څنډه ییز مرکزونه",
      sectionSubtitle: "ستاسو د پیرودونکو ترافیک په کابل او ولایتونو کې د نوري فایبر له لارې بې حده چټک لیږدول کیږي.",
      primaryRegionName: "اصلي سیمه ییز مرکز (me-central-1)",
      primaryRegionLatency: "۴۶ میلی ثانیې P95",
      kabulEdgeName: "د کابل نوري فایبر مرکز (KBL-Edge-1)",
      kabulEdgeLatency: "۱۲ میلی ثانیې",
      heratEdgeName: "د هرات کلاوډ دروازه (HRT-Edge-1)",
      heratEdgeLatency: "۱۸ میلی ثانیې",
      mazarEdgeName: "د مزار شریف څنډه ییز مرکز (MZR-Edge-1)",
      mazarEdgeLatency: "۲۲ میلی ثانیې",
      kandaharEdgeName: "د کندهار څنډه ییز مرکز (KDH-Edge-1)",
      kandaharEdgeLatency: "۲۸ میلی ثانیې",
      statSla: "۹۹.۹۹٪",
      statSlaLabel: "د سیستم پایداری (SLA)",
      statLatency: "۴۶ میلی ثانیې",
      statLatencyLabel: "سیمه ییز انتقال سرعت",
      statDeliverability: "۱۰۰٪",
      statDeliverabilityLabel: "رسمي این باکس ته رسیدل (DKIM)",
      statCurrency: "افغانۍ (AFN)",
      statCurrencyLabel: "په کورنۍ اصلي بیه تادیه",
    },
    solutions: {
      sectionBadge: "د هیواد د اړتیاوو لپاره حلونه",
      sectionTitle: "د افغانستان د تجارت او ټولنې لپاره چمتو سیستمونه",
      sectionSubtitle: "مخکې له مخکې جوړ شوي سیستمونه چې تر ۲ ساعتونو په کمه موده کې چمتو او فعال کیږي.",
      blueprints: [
        {
          id: "clinics",
          title: "روغتیايي کلینیکونه او متخصص ډاکټران",
          headline: "د ډاکټرانو تقسیم اوقات او د ناروغانو د نوبت سیستم",
          desc: "د کلینیک لپاره ځانګړی ویب سایټ چې د ډاکټرانو شتون، د کلینیک نقشه او د واټساپ له لارې د ناروغانو نوبت اتومات برابروي.",
          deliverables: ["آفلاین نوبت سیستم", "رسمي کلینیک ډومین", "په واټساپ غږیز ځوابونه"],
          ctaText: "د کلینیک نمونه وګورئ",
        },
        {
          id: "exporters",
          title: "د جلغوزیو او زعفرانو صادرونکي",
          headline: "نړیوال نندارتون او د صادراتي نرخونو کاتالوګ",
          desc: "د نړیوالو پیرودونکو لپاره څو ژبنی ویب سایټ چې د کیفیت سندونه، د بیو غوښتنه (RFQ) او له خلیج او اروپا سره اړیکې رغوي.",
          deliverables: ["انګلیسي او عربي سایټ", "تصدیق شوي رسمي ایمیلونه", "لوړ کیفیت لرونکی کاتالوګ"],
          ctaText: "د صادراتو نمونه وګورئ",
        },
        {
          id: "education",
          title: "پوهنتونونه، ښوونځي او ښوونکي",
          headline: "د کانکور لارښود او د تدریسي اسنادو کتابتون",
          desc: "د ښوونځیو او استادانو لپاره تعلیمي پلاتفورم چې د کانکور سوالونو د حل او کتابونو د لوستلو لپاره پیاوړی مصنوعي هوښ لري.",
          deliverables: ["د کانکور ځیرک استاد", "د ډیجیټل کتابونو فضا", "د زده کوونکو سپک اپلیکیشن"],
          ctaText: "د ښوونځي نمونه وګورئ",
        },
        {
          id: "merchants",
          title: "سیمه ییزې هټۍ او اصناف",
          headline: "ډیجیټل کاتالوګ او د حسابپی له لارې پیسې ترلاسه کول",
          desc: "د هټۍ پیژندنه، د محصولاتو کاتالوګ او د حسابپی په QR کوډ د پیسو اخیستل یا په کابل او ولایتونو کې نغدي تسلیمي.",
          deliverables: ["په نقشه او واټساپ کې ثبت", "د حسابپی تادیه", "پرته له کمپیوټر کارول"],
          ctaText: "د هټۍ نمونه وګورئ",
        },
      ],
    },
    pricing: {
      badge: "د ریښتیني لګښت پر بنسټ بیې",
      title: "روښانه او مناسب قیمتونه",
      subtitle: "ستاسو پیسې په کابل او ولایتونو کې افغان انجنیرانو ته او د اصلي سرورونو لګښتونو ته ځي.",
      tabBusiness: "سوداګریز او اداري پلانونه",
      tabConsumer: "د مبایل مصنوعي هوښ (شخصي / محصلین)",
      currencyLabel: "پولي واحد:",
      perYear: " / کلنی",
      perMonth: " / میاشتنی",
      lifetime: " / دایمي",
      popularTag: "غوره انتخاب",
      deployBtn: "پلان فعال کړئ",
      plans: {
        starter: {
          name: "آریا پیل کوونکی",
          desc: "د کوچنیو هټیو، نویو سوداګریو او سیمه ییزو خدماتو لپاره مناسب.",
          features: [
            "په خپل فرعي ډومین چټک کوربه توب",
            "۱ رسمي سوداګریز ایمیل د سپام ضد دفاع سره",
            "په واټساپ کې د آریا مرکزي هوښ مرستیال",
            "د انټرنیټ له قطعه کیدو پرته د PWA دوام",
            "د حسابپی او په خپل ځای کې د نغدو اداینه"
          ],
        },
        professional: {
          name: "آریا مسلکي",
          desc: "د شرکتونو، کلینیکونو، او د جلغوزیو او زعفرانو د صادرونکو لپاره پوره حل.",
          features: [
            "وړیا رسمي .af یا .com شخصي ډومین",
            "۲ رسمي ایمیلونه د SPF او DKIM له تصدیق سره",
            "په میاشت کې د آریا ۳۰ د لوړ کیفیت انځورونه",
            "په واټساپ کې اتومات او هوښیار ځواب ویونکی",
            "ستاسو په ځای کې نغدي تسلیمي د واټساپ ۶ عددي OTP کوډ سره"
          ],
        },
        intelligence: {
          name: "آریا پرمختللی هوښ",
          desc: "د پوهنتونونو، لویو ادارو او صادراتي بنسټونو لپاره خورا پیاوړی تحلیلي هوښ.",
          features: [
            "د آریا ژور استدلالي او مخکښ مصنوعي هوښ",
            "۵ رسمي ایمیلونه د پراخې فضا سره",
            "په میاشت کې ۶۰ مسلکي هنري انځورونه",
            "د کلاوډ په څنډو کې لومړیتوب لرونکی سرعت",
            "په کابل کې ځانګړی تخنیکي مسؤل"
          ],
        },
        community: {
          name: "آریا ولسي او وړیا",
          desc: "د عامو خلکو او زده کړې پیل لپاره تلپاتې وړیا لاسرسی.",
          features: [
            "په پښتو او دري ژبو متني مصنوعي هوښ",
            "د ښوونځي پوښتنو ته لومړنی ځواب",
            "د مبایل او کمپیوټر له لارې اسانه لیدل",
            "هیڅ ډول میاشتنی فیس یا لګښت نلري"
          ],
        },
        student: {
          name: "آریا محصلین او معارف",
          desc: "د زده کوونکو او استادانو لپاره په خورا کم لګښت ځانګړې بسته.",
          annualAlt: "یا په کال کې ۱,۴۰۰ افغانۍ",
          features: [
            "د کانکور او پوهنتون ازموینو بشپړ لارښود",
            "په کمره د اسنادو او عریضو سمدستي ژباړه",
            "د آریا طبیعي غږیز موټر له لارې د ځوابونو اورېدل",
            "د مبایل سپک او بې حده چټک اندروید اپلیکیشن (تر ۱۲ امبي)",
            "د حسابپی یا مبایل کریدت له لارې اسانه تادیه"
          ],
        },
        creator: {
          name: "آریا نوښتګر او چمتو کوونکي",
          desc: "د ډیزاینرانو، لیکوالانو، ژباړونکو او آزادو فریلانسرانو لپاره ځانګړي امکانات.",
          features: [
            "د آریا چټک او پرو کنواس سټوډیو انځور جوړونه",
            "په اصیلو لهجو بې حده غږیز او متني تبادله",
            "د رسمي عریضو او اسنادو لوړ کیفیت وتنه",
            "په څو مبایلونو او کمپیوټرونو کې یوځای کارول"
          ],
        },
      },
    },
    charter: {
      badge: "زموږ ژمنه او تګلاره",
      title: "اصلي تکنالوژي په اصلي بیه. له اضافي ګټې پرته.",
      desc: "نور شرکتونه د عادي ویب سایټ لپاره ۴۰,۰۰۰ افغانۍ اخلي. آریا کلاوډ د یوې عامه پروژې په توګه د ۴,۸۰۰ افغانیو لګښت په لاندې ډول روښانه تشریح کوي:",
      barTitle: "د ۴,۸۰۰ افغانیو کلني فیس ویش",
      barSubtitle: "۱۰۰٪ مالي شفافیت",
      pctDomain: "۱۳.۰٪ د ډومین رسمي بیه",
      pctInfra: "۳.۴٪ د کلاوډ سرورونه",
      pctAI: "۴.۸٪ د مصنوعي هوښ لګښت",
      pctCashFee: "۴.۷٪ د نغدي استازي فیس",
      pctWages: "۵۴.۱٪ په کابل او هرات کې د کارکوونکو معاشونه",
      pctReserve: "۲۰.۰٪ د سیستم پراختیا او نوې ماډلونه",
    },
    faq: {
      title: "ډېرې پوښتل کېدونکې پوښتنې",
      q1: "له بانکي کارت پرته څنګه پیسې تحویل کړم؟",
      a1: "تاسو نړیوال کارت ته اړتیا نلرئ. د حسابپی اپلیکیشن له لارې پیسې ورکړئ، یا نغدي انتخاب کړئ. زموږ استازی ستاسو ځای ته راځي او د نغدو په ترلاسه کولو سره د واټساپ ۶ عددي کوډ له لارې ستاسو حساب سمدستي فعالوي.",
      q2: "آیا په ضعیف انټرنیټ کې دا سیستم کار کوي؟",
      a2: "هو! ویب سایټونه په PWA جوړ شوي دي. کله چې پیرودونکی یو ځل سایټ پرانیزي، معلومات په مبایل کې ساتل کیږي او د انټرنیټ د بندښت پر مهال هم لیدل کیږي.",
      q3: "زه څنګه کولی شم خپل سایټ کې نوي شیان یا بیې ولیکم؟",
      a3: "کمپیوټر او کوډینګ ته اړتیا نشته. په واټساپ کې د آریا همکار ته په غږ یا لیکلي ډول ووایاست چې څه بدلون غواړئ؛ سیستم په ۳۰ ثانیو کې ستاسو سایټ نوی کوي.",
    },
    footer: {
      tagline: "د افغانستان خلکو لپاره خپلواک کلاوډ او مصنوعي هوښ",
      rights: "ټول حقوق د آریا کلاوډ ټولنیزې شبکې سره خوندي دي.",
    },
  },
  en: {
    dir: "ltr",
    ticker: "System Status: Nominal (me-central-1: 46ms) | Domestic Settlement (HesabPay & Cash Desks): Active",
    nav: {
      solutions: "Solutions",
      aiMobile: "Aria AI & Mobile",
      identity: "Domains & Email",
      pricingCharter: "Pricing & Charter",
      infra: "Infrastructure & Edge",
      signIn: "Console Login",
      getStarted: "Start Without Credit Card",
    },
    hero: {
      badge: "INDEPENDENT CLOUD INFRASTRUCTURE & MULTILINGUAL AI FOR AFGHANISTAN",
      headlineMain: "Enterprise Cloud Infrastructure for Afghanistan. ",
      headlineHighlight: "Zero Banking Barriers.",
      subheadline: "Deploy sub-2-second PWA websites, secure official .af & .com domains, configure verified business email, and access conversational AI in Dari, Pashto, and English. Paid at cost via HesabPay QR or verified doorstep cash OTP.",
      ctaWhatsApp: "Launch Free on WhatsApp",
      ctaBusiness: "Open Management Console",
      ctaDownloadApp: "Download Android APK (12 MB)",
      listenSample: "Hear Aria Natural Voice Sample",
      samplePlaying: "Playing Audio Sample...",
      trustStrip: ["Optimized for 2G/3G Cellular", "No Foreign Credit Cards", "Doorstep OTP Handshake"],
      quickSpecs: ["me-central-1 Transit: 46ms", "SLA Guarantee: 99.99%", "Domestic AFN Settlement", "SPF & DKIM Authenticated"],
    },
    consolePreview: {
      title: "AriaCloud Management & Architecture Console",
      subtitle: "Engineered for 2G/3G cellular resilience and isolated from international payment sanctions",
      tabDiagram: "Cloud Topology",
      tabCli: "Aria CLI Terminal",
      tabConfig: "Cloud Config (YAML)",
      tabPreview: "Live Storefront PWA",
      copyBtn: "Copy",
      copiedBtn: "Copied!",
      topology: {
        client: "Client / Merchant (2G/3G Cellular)",
        edge: "Kabul Edge POP (12ms)",
        backbone: "Regional Backbone (46ms)",
        coreAi: "Aria Core AI & Sovereign DB",
        settlement: "HesabPay / Doorstep Cash OTP",
      },
    },
    pillars: {
      sectionTitle: "A Sovereign Digital Foundation for Afghanistan",
      sectionSubtitle: "Engineered to eliminate foreign payment sanctions and technological isolation.",
      p1Title: "Universal AI Site Builder",
      p1Desc: "Tailored platforms for medical clinics (doctor schedules), schools & universities, logistics carriers, and saffron/dried fruit exporters.",
      p1Tag: "Voice Updates via WhatsApp",
      p2Title: "Aria AI Studio & Mobile App",
      p2Desc: "Lightweight Android binary (<12MB). Homework tutor, camera OCR document translation (Areeza), and native Dari/Pashto speech.",
      p2Tag: "Aria Core AI & Voice Engine",
      p3Title: "Domains & Cloud Mail",
      p3Desc: "Direct registration of official .af (MCIT) and .com domains at raw registry fees. Verified mailboxes with 100% inbox delivery.",
      p3Tag: "SPF / DKIM Authenticated",
      p4Title: "Domestic Financial Settlement",
      p4Desc: "Denominated in Afghanis (AFN). Instant checkout via HesabPay QR or authorized field agent collection verified with a WhatsApp OTP.",
      p4Tag: "Zero Foreign Cards Required",
    },
    catalog: {
      sectionBadge: "ARIACLOUD SERVICE CATALOG",
      sectionTitle: "Enterprise Cloud Building Blocks at Raw Registry Cost",
      sectionSubtitle: "Comprehensive infrastructure services engineered specifically for Afghan connectivity and sovereign compliance.",
      tabCompute: "Compute & Serverless PWA",
      tabAI: "Aria AI & Machine Learning",
      tabIdentity: "Identity, Domains & Mail",
      tabSettlement: "Domestic Clearing & Cash OTP",
      tabEdge: "Global Edge & Security",
      services: {
        compute: [
          {
            id: "site-engine",
            title: "Universal AI Site Builder",
            desc: "Sub-2-second PWA edge compilation with automated offline service worker caching for 2G/3G cellular networks.",
            tag: "Time to First Paint: 1.2s",
            metric: "Offline PWA",
            linkText: "Test in Console",
          },
          {
            id: "sovereign-db",
            title: "Sovereign Cloud Database",
            desc: "Isolated multi-tenant PostgreSQL data partitions with transparent field-level encryption, immune to foreign sanction freezes.",
            tag: "99.99% Availability",
            metric: "Data Sovereignty",
            linkText: "View Architecture",
          },
          {
            id: "whatsapp-engine",
            title: "WhatsApp Conversational Sync",
            desc: "Update products, prices, and doctor clinic schedules simply by sending voice notes or text to the Aria WhatsApp bot.",
            tag: "30-Second Edge Sync",
            metric: "WhatsApp Bot",
            linkText: "Connect WhatsApp",
          },
        ],
        ai: [
          {
            id: "core-ai-chat",
            title: "Aria Core AI Engine",
            desc: "Frontier reasoning model fine-tuned on Dari, Pashto, and English for local university curricula, trade, and legal writing.",
            tag: "Sub-50ms First Token",
            metric: "Dari & Pashto",
            linkText: "Start Chatting",
          },
          {
            id: "creative-studio",
            title: "Aria Fast Studio & Pro Canvas",
            desc: "High-resolution commercial product imagery for saffron, pine nuts, handmade carpets, and medical clinic service banners.",
            tag: "Studio Quality",
            metric: "Commercial AI",
            linkText: "Generate Visuals",
          },
          {
            id: "voice-ocr",
            title: "Aria Voice Engine & Areeza OCR",
            desc: "Regional accent speech synthesis (Kabul, Herat) combined with smartphone camera OCR for hand-written legal Areeza documents.",
            tag: "Accurate Handwriting",
            metric: "Voice & Vision",
            linkText: "Scan Document",
          },
        ],
        identity: [
          {
            id: "domain-registrar",
            title: "Direct .af (MCIT) & .com Registrar",
            desc: "Direct API integration with the Afghan Ministry of Communications (MCIT) and global registries at wholesale registrar pricing.",
            tag: "Instant DNS Propagation",
            metric: "Wholesale Fees",
            linkText: "Search Domain",
          },
          {
            id: "cloud-mail-enterprise",
            title: "Aria Cloud Mail Enterprise",
            desc: "Branded corporate mailboxes with cryptographically verified SPF and DKIM records ensuring 100% direct inbox delivery.",
            tag: "100% Inbox Delivery",
            metric: "SPF & DKIM",
            linkText: "Create Mailbox",
          },
          {
            id: "dns-anycast",
            title: "Aria Global Edge DNS",
            desc: "Anycast edge DNS with automated DDoS mitigation, automated TLS certificates, and sub-20ms resolution across the region.",
            tag: "18ms Regional DNS",
            metric: "Free Auto SSL",
            linkText: "Manage DNS",
          },
        ],
        settlement: [
          {
            id: "hesabpay-qr",
            title: "HesabPay Digital Checkout",
            desc: "Instant digital settlement denominated in Afghanis (AFN) via direct HesabPay QR scanning with zero intermediary bank fees.",
            tag: "Instant Settlement",
            metric: "AFN Native",
            linkText: "Pay with HesabPay",
          },
          {
            id: "cash-otp-desk",
            title: "Doorstep Cash OTP Handshake",
            desc: "Authorized field agents collect physical cash at your shop or office, activated on the spot with a 6-digit WhatsApp OTP.",
            tag: "Kabul, Herat & Mazar",
            metric: "100% Secure",
            linkText: "Request Agent",
          },
          {
            id: "transparent-ledger",
            title: "Transparent Social Utility Ledger",
            desc: "Complete public accounting of server bandwidth, domain registrar costs, and local Afghan engineering salaries.",
            tag: "Public Charter",
            metric: "Audited Ledger",
            linkText: "View Charter",
          },
        ],
        edge: [
          {
            id: "kabul-pop",
            title: "Kabul Fiber Exchange (KBL-Edge-1)",
            desc: "Direct local peering in Kabul for ultra-low latency storefront rendering and instant mobile asset loading.",
            tag: "12ms Local Transit",
            metric: "Fiber Peering",
            linkText: "Check Status",
          },
          {
            id: "regional-backbone",
            title: "Regional Backbone (me-central-1)",
            desc: "High-capacity server infrastructure located in regional proximity, completely independent of sanctioned payment rails.",
            tag: "46ms P95 Transit",
            metric: "Redundant Edge",
            linkText: "Ping Test",
          },
          {
            id: "offline-pwa-worker",
            title: "Offline PWA Service Worker",
            desc: "Storefront catalogs, doctor schedules, and contact data remain fully operational even if urban internet drops completely.",
            tag: "Zero Downtime",
            metric: "Edge Cache",
            linkText: "Test Offline",
          },
        ],
      },
    },
    infrastructure: {
      sectionBadge: "INFRASTRUCTURE & GLOBAL EDGE",
      sectionTitle: "Regional Backbone & Domestic Edge Network",
      sectionSubtitle: "Engineered with localized edge nodes across Afghanistan to deliver sub-2-second experiences on low-bandwidth cellular networks.",
      primaryRegionName: "Primary Regional Backbone (me-central-1)",
      primaryRegionLatency: "46ms P95",
      kabulEdgeName: "Kabul Fiber Node (KBL-Edge-1)",
      kabulEdgeLatency: "12ms",
      heratEdgeName: "Herat Gateway (HRT-Edge-1)",
      heratEdgeLatency: "18ms",
      mazarEdgeName: "Mazar-i-Sharif POP (MZR-Edge-1)",
      mazarEdgeLatency: "22ms",
      kandaharEdgeName: "Kandahar Edge POP (KDH-Edge-1)",
      kandaharEdgeLatency: "28ms",
      statSla: "99.99%",
      statSlaLabel: "Infrastructure SLA Guarantee",
      statLatency: "46ms",
      statLatencyLabel: "Regional Transit Latency",
      statDeliverability: "100%",
      statDeliverabilityLabel: "Verified Inbox Delivery (DKIM)",
      statCurrency: "AFN",
      statCurrencyLabel: "Domestic Wholesale Pricing",
    },
    solutions: {
      sectionBadge: "ENTERPRISE INDUSTRY BLUEPRINTS",
      sectionTitle: "Turnkey Architectures for Afghanistan's Core Sectors",
      sectionSubtitle: "Production-ready architectures deployed in under 2 hours, fully configured for local operations.",
      blueprints: [
        {
          id: "clinics",
          title: "Diagnostic Clinics & Specialist Doctors",
          headline: "Patient WhatsApp Booking & Doctor Schedule Engine",
          desc: "Dedicated clinical portal showing specialist attendance, lab test catalogs, and automated WhatsApp appointment confirmations.",
          deliverables: ["Offline patient queue", "Official clinic domain", "WhatsApp voice responder"],
          ctaText: "Explore Clinic Blueprint",
        },
        {
          id: "exporters",
          title: "Saffron & Pine Nut Exporters",
          headline: "Global Multi-Currency Storefront & RFQ Engine",
          desc: "Bilingual export portal displaying ISO laboratory certificates, wholesale price calculators, and direct international buyer inquiry forms.",
          deliverables: ["English & Arabic PWA", "Verified DKIM Mailboxes", "High-Resolution Product Art"],
          ctaText: "Explore Export Blueprint",
        },
        {
          id: "education",
          title: "Universities, Schools & Educators",
          headline: "Kankor Preparation Engine & Digital Library",
          desc: "Comprehensive academic portal featuring an intelligent Dari & Pashto study assistant, syllabus distribution, and homework tutoring.",
          deliverables: ["Kankor AI Exam Tutor", "Cloud Textbook Library", "Ultra-Lightweight Student APK"],
          ctaText: "Explore Education Blueprint",
        },
        {
          id: "merchants",
          title: "Local Merchants & Retail Shops",
          headline: "Instant Digital Catalog with HesabPay Settlement",
          desc: "Turn your local bazaar inventory into an edge-cached digital storefront with instant QR mobile checkout or doorstep cash collection.",
          deliverables: ["Listed on Maps & WhatsApp", "HesabPay Instant QR", "Zero-Computer Operation"],
          ctaText: "Explore Merchant Blueprint",
        },
      ],
    },
    pricing: {
      badge: "RADICAL AT-COST PRICING",
      title: "Predictable Infrastructure. Measurable Value.",
      subtitle: "Every subscription funds local Afghan engineering wages, server transit, and wholesale registry costs.",
      tabBusiness: "Business Infrastructure",
      tabConsumer: "Mobile AI Pass (Students & Personal)",
      currencyLabel: "Currency:",
      perYear: " / year",
      perMonth: " / month",
      lifetime: " / lifetime",
      popularTag: "Most Popular",
      deployBtn: "Deploy Selected Plan",
      plans: {
        starter: {
          name: "Aria Starter",
          desc: "Perfect for local shops, emerging traders, and single-location service providers in Kabul and provinces.",
          features: [
            "Sub-domain edge hosting (*.ariacloudservices.org)",
            "1 Verified business email with anti-spam defense",
            "Aria Core AI assistant on WhatsApp",
            "Offline-resilient PWA mobile storefront",
            "Domestic settlement via HesabPay QR or cash"
          ],
        },
        professional: {
          name: "Aria Professional",
          desc: "Complete digital infrastructure for clinics, schools, and saffron/pinenut exporters.",
          features: [
            "Custom official .af or .com domain included",
            "2 Verified business mailboxes with SPF & DKIM",
            "30 Aria Pro Studio creative images monthly",
            "Conversational WhatsApp auto-responder",
            "Doorstep Cash OTP handshake verification"
          ],
        },
        intelligence: {
          name: "Aria Pro Intelligence",
          desc: "Frontier reasoning engine and high-capacity scale for universities and larger enterprises.",
          features: [
            "Frontier Aria Core reasoning engine",
            "5 Verified business mailboxes with expanded storage",
            "60 Aria Pro Studio creative images monthly",
            "Priority edge routing on regional backbone",
            "Dedicated Kabul-based technical account manager"
          ],
        },
        community: {
          name: "Aria Community",
          desc: "Always-free conversational AI for general literacy, basic search, and public empowerment.",
          features: [
            "Bilingual Dari & Pashto conversational text AI",
            "Basic homework help & study assistance",
            "Standard web and mobile interface access",
            "Zero fees or monthly subscriptions ever"
          ],
        },
        student: {
          name: "Aria Student Mobile",
          desc: "Subsidized utility pass for school students, Kankor candidates, and university scholars.",
          annualAlt: "or 1,400 AFN/yr",
          features: [
            "Full Kankor exam prep & university subject tutor",
            "Camera OCR document translation & Areeza assistant",
            "Aria Voice Engine native Dari & Pashto speech",
            "Lightweight Android binary (<12 MB)",
            "Instant micro-settlement via HesabPay or mobile credit"
          ],
        },
        creator: {
          name: "Aria Creator Pro",
          desc: "Advanced creation suite for graphic designers, journalists, translators, and freelancers.",
          features: [
            "Aria Fast Studio & Pro Canvas image generation",
            "Unlimited speech synthesis in regional dialects",
            "High-resolution document and Areeza export",
            "Concurrent multi-device cloud synchronization"
          ],
        },
      },
    },
    charter: {
      badge: "OUR SOCIAL ENTERPRISE CHARTER",
      title: "Real Technology at Raw Cost. Zero Monopolies.",
      desc: "Traditional agencies demand 15,000 to 40,000 AFN for fragile WordPress sites. AriaCloud operates on a transparent social utility charter. Here is the exact allocation of your 4,800 AFN payment:",
      barTitle: "Annual 4,800 AFN Allocation Breakdown",
      barSubtitle: "100% Operational Transparency",
      pctDomain: "13.0% Wholesale Domain Fee",
      pctInfra: "3.4% Edge Servers & DNS",
      pctAI: "4.8% Aria AI Studio Compute",
      pctCashFee: "4.7% Cash Collection Logistics",
      pctWages: "54.1% Afghan Salaries (Kabul/Herat)",
      pctReserve: "20.0% Model R&D & Growth Reserve",
    },
    faq: {
      title: "Frequently Asked Questions",
      q1: "How do I pay without a credit card or bank account?",
      a1: "You never need an international card. Pay digitally via the HesabPay app, or select Cash Collection. An authorized field representative visits your shop, collects physical cash, and verifies the transaction using a private 6-digit WhatsApp OTP.",
      q2: "Does the website work during slow internet or power cuts?",
      a2: "Yes. Every storefront is compiled as an edge-cached Progressive Web App (PWA). Once loaded by a customer, your products, clinic hours, and contact details remain viewable even if cellular data drops completely.",
      q3: "How do I make changes to my website once it is live?",
      a3: "You never have to write code or manage complex settings. Just send a text or voice note to Aria on WhatsApp (e.g., 'Change our Thursday clinic hours to 2:00 PM and update saffron to 75 AFN'). Aria updates your live website in under 30 seconds.",
    },
    footer: {
      tagline: "Independent Cloud Infrastructure & Multilingual AI for Afghanistan",
      rights: "All rights reserved. AriaCloud Social Enterprise.",
    },
  },
};
