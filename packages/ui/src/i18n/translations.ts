// packages/ui/src/i18n/translations.ts

export type Language = "en" | "da" | "ps";

export interface TranslationDictionary {
  dir: "ltr" | "rtl";
  localeName: string;
  appTitle: string;
  tagline: string;
  
  // Navigation & Shell
  nav: {
    dashboard: string;
    storefront: string;
    domains: string;
    email: string;
    aiStudioHeader: string;
    aiChat: string;
    aiCanvas: string;
    aiVoice: string;
    aiVision: string;
    billingHeader: string;
    invoices: string;
    hesabpay: string;
    cashAudit: string;
    searchPlaceholder: string;
    notifications: string;
    accountSettings: string;
    signOut: string;
  };

  // Status & Alerts
  alerts: {
    cashPendingTitle: string;
    cashPendingBody: string;
    verifyCodeBtn: string;
    verifiedSuccessTitle: string;
    verifiedSuccessBody: string;
  };

  // Infrastructure & Service Health Table
  infra: {
    headerTitle: string;
    headerDesc: string;
    colComponent: string;
    colTarget: string;
    colStatus: string;
    colLatency: string;
    statusHealthy: string;
    statusActive: string;
    statusConfigured: string;
    manageDnsLink: string;
    viewLiveStore: string;
    refreshLatencyBtn: string;
  };

  // Localized Billing Card
  billing: {
    cardTitle: string;
    cardDesc: string;
    activePlanLabel: string;
    currentPlanName: string;
    renewalCostLabel: string;
    renewalCostValue: string;
    coverageExpiryLabel: string;
    cashOtpLabel: string;
    cashOtpPlaceholder: string;
    cashVerifyBtn: string;
    cashHint: string;
    payHesabpayBtn: string;
    hesabpayModalTitle: string;
    hesabpayModalDesc: string;
    simulateApprovalBtn: string;
    closeBtn: string;
  };

  // Aria AI Studio Consumption
  aiStudio: {
    cardTitle: string;
    cardDesc: string;
    tierBadge: string;
    openStudioBtn: string;
    generateImageBtn: string;
    textTokensLabel: string;
    textTokensDesc: string;
    canvasImagesLabel: string;
    canvasImagesDesc: string;
    voiceCharsLabel: string;
    voiceCharsDesc: string;
    voiceCacheBadge: string;
    architectureNote: string;
  };

  // Live WhatsApp Inbound Leads
  leads: {
    cardTitle: string;
    cardDesc: string;
    liveBadge: string;
    orderIntentTag: string;
    autoRepliedTag: string;
    voiceNoteTranscribed: string;
    listenAudioBtn: string;
    viewAuditLink: string;
  };

  // Canvas Image Studio Modal
  canvasModal: {
    modalTitle: string;
    promptLabel: string;
    promptDefault: string;
    aspectRatioLabel: string;
    qualityLabel: string;
    emptyStateText: string;
    renderingText: string;
    remainingQuotaLabel: string;
    cancelBtn: string;
    generateActionBtn: string;
  };

  // Common UI Actions & Toasts
  common: {
    loading: string;
    success: string;
    error: string;
    save: string;
    cancel: string;
    ms: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    dir: "ltr",
    localeName: "English",
    appTitle: "AriaCloud Console",
    tagline: "Afghan Digital Enablement Platform",
    nav: {
      dashboard: "Overview & Health",
      storefront: "PWA Storefront",
      domains: "Aria Domain Manager",
      email: "Aria Cloud Mail",
      aiStudioHeader: "Aria AI Studio",
      aiChat: "Aria Core Assistant",
      aiCanvas: "Aria Creative Studio (Images)",
      aiVoice: "Aria Voice Engine (Speech)",
      aiVision: "Aria Vision & Scanner",
      billingHeader: "Billing & Settlement",
      invoices: "Invoices (AFN Ledger)",
      hesabpay: "HesabPay Direct Gateway",
      cashAudit: "Aria Verified Handshake",
      searchPlaceholder: "Search services, orders, AI tools... [Alt+S]",
      notifications: "Notifications",
      accountSettings: "Account Settings",
      signOut: "Sign Out",
    },
    alerts: {
      cashPendingTitle: "Aria Verified Handshake Inbound",
      cashPendingBody: "Payment is completed via HesabPay. There is no cash collection.",
      verifyCodeBtn: "Enter OTP Code",
      verifiedSuccessTitle: "Payment Confirmed via Handshake",
      verifiedSuccessBody: "4,500 AFN cash received. Your AriaCloud subscription is extended for 365 days.",
    },
    infra: {
      headerTitle: "Aria Core Infrastructure & Service Health",
      headerDesc: "Real-time edge performance, secure business mail routing, and serverless compute status.",
      colComponent: "Aria Service Component",
      colTarget: "Assigned Endpoint",
      colStatus: "Health Status",
      colLatency: "Edge Latency",
      statusHealthy: "Healthy (Aria Edge)",
      statusActive: "Subscribed & Active",
      statusConfigured: "100% Configured",
      manageDnsLink: "Manage Aria Domain Records →",
      viewLiveStore: "View Live Store",
      refreshLatencyBtn: "Refresh Latency",
    },
    billing: {
      cardTitle: "Localized Billing (AFN)",
      cardDesc: "No foreign credit cards required. Settle directly in domestic Afghan currency.",
      activePlanLabel: "Invoice Number:",
      currentPlanName: "Aria Commerce Annual",
      renewalCostLabel: "Annual Fee (At-Cost):",
      renewalCostValue: "4,500 AFN (~$62.50)",
      coverageExpiryLabel: "Active Coverage:",
      cashOtpLabel: "WhatsApp Handshake OTP:",
      cashOtpPlaceholder: "Enter 6-digit code (e.g. 849201)",
      cashVerifyBtn: "Verify & Extend",
      cashHint: "Tip: Enter the code sent to your registered WhatsApp number to confirm cash delivery.",
      payHesabpayBtn: "Pay via HesabPay Digital QR",
      hesabpayModalTitle: "HesabPay Digital Checkout",
      hesabpayModalDesc: "Scan with your HesabPay mobile app to renew automatically within 3 seconds:",
      simulateApprovalBtn: "Simulate Instant Approval",
      closeBtn: "Close",
    },
    aiStudio: {
      cardTitle: "Aria AI Studio Consumption & Quotas",
      cardDesc: "Real-time consumption meters for text drafting, visual creation, and voice synthesis.",
      tierBadge: "Tier: Commerce Pro",
      openStudioBtn: "Launch AI Studio",
      generateImageBtn: "Generate Visuals",
      textTokensLabel: "1. Aria Core AI (Text, Chat & Research)",
      textTokensDesc: "68,400 / 200,000 words used today (Resets 00:00 UTC)",
      canvasImagesLabel: "2. Aria Creative Studio (Product Banners & Ads)",
      canvasImagesDesc: "21 / 30 visuals generated this month",
      voiceCharsLabel: "3. Aria Voice Engine (Dari & Pashto Audio)",
      voiceCharsDesc: "4,120 / 25,000 active characters used",
      voiceCacheBadge: "86% Cached & Free",
      architectureNote: "Intelligent Audio Caching: Frequently used answers and store greetings are stored at the edge and played without consuming your monthly character quota.",
    },
    leads: {
      cardTitle: "Live Inbound WhatsApp Stream",
      cardDesc: "Customer inquiries, orders, and voice notes routed directly to your business.",
      liveBadge: "Live Inbound",
      orderIntentTag: "PURCHASE INTENT",
      autoRepliedTag: "ARIA AUTO-REPLIED",
      voiceNoteTranscribed: "Aria Vision & Speech Transcribed",
      listenAudioBtn: "Listen Spoken Reply",
      viewAuditLink: "View Message Audit Trail →",
    },
    canvasModal: {
      modalTitle: "Aria Creative Studio (Visual Generator)",
      promptLabel: "Visual Description Prompt (Dari, Pashto, or English):",
      promptDefault: "Luxury Afghan saffron packaging on polished white marble, cinematic commercial lighting, 4k",
      aspectRatioLabel: "Aspect Ratio:",
      qualityLabel: "Rendering Engine:",
      emptyStateText: "Enter a prompt and click Generate to create high-resolution commercial images.",
      renderingText: "Synthesizing visual on Aria Sovereign Cloud...",
      remainingQuotaLabel: "Remaining Quota:",
      cancelBtn: "Cancel",
      generateActionBtn: "Generate Visual",
    },
    common: {
      loading: "Loading...",
      success: "Operation successful",
      error: "An error occurred",
      save: "Save",
      cancel: "Cancel",
      ms: "ms",
    },
  },

  da: {
    dir: "rtl",
    localeName: "دری",
    appTitle: "کنسول آریا کلاود",
    tagline: "زیرساخت ابری و هوش مصنوعی مستقل افغانستان",
    nav: {
      dashboard: "نمای کلی و وضعیت",
      storefront: "فروشگاه آنلاین (PWA)",
      domains: "مدیریت دامنه‌های آریا",
      email: "ایمیل تجارتی آریا کلاود",
      aiStudioHeader: "استودیوی هوش مصنوعی آریا",
      aiChat: "دستیار مرکزی آریا",
      aiCanvas: "استودیوی خلاقیت و تصویر آریا",
      aiVoice: "موتور صوتی هوشمند آریا",
      aiVision: "سیستم اسکن و خوانش اسناد آریا",
      billingHeader: "مالی و تصفیه حساب",
      invoices: "فاکتورها (دفتر افغانی)",
      hesabpay: "درگاه پرداخت دیجیتال حساب‌پی",
      cashAudit: "تأیید نقدی دوطرفه آریا",
      searchPlaceholder: "جستجوی خدمات، فرمایشات، ابزارهای هوش مصنوعی... [Alt+S]",
      notifications: "اعلانات",
      accountSettings: "تنظیمات حساب",
      signOut: "خروج از سیستم",
    },
    alerts: {
      cashPendingTitle: "تأیید نقدی دوطرفه آریا در جریان است",
      cashPendingBody: "پرداخت از طریق حساب‌پی انجام می‌شود. دریافت نقدی وجود ندارد.",
      verifyCodeBtn: "ثبت کود واتساپ",
      verifiedSuccessTitle: "تأیید پرداخت نقدی موفقانه انجام شد",
      verifiedSuccessBody: "مبلغ ۴,۵۰۰ افغانی دریافت گردید. اشتراک آریا کلاود شما برای ۳۶۵ روز دیگر تمدید شد.",
    },
    infra: {
      headerTitle: "وضعیت زیرساخت و خدمات مستقل آریا",
      headerDesc: "سرعت پاسخ‌دهی شبکه توزیع، امنیت ایمیل تجارتی و سرورهای ابری آریا به صورت زنده.",
      colComponent: "بخش خدمات آریا",
      colTarget: "آدرس یا نقطه پایانی",
      colStatus: "وضعیت صحت",
      colLatency: "سرعت پاسخ‌دهی",
      statusHealthy: "فعال و سالم (شبکه آریا)",
      statusActive: "متصل و فعال",
      statusConfigured: "۱۰۰٪ تنظیم شده",
      manageDnsLink: "مدیریت ریکاردهای دامنه آریا ←",
      viewLiveStore: "مشاهده سایت زنده",
      refreshLatencyBtn: "تازه کردن سرعت پنگ",
    },
    billing: {
      cardTitle: "بیلینگ و پرداخت محلی (افغانی)",
      cardDesc: "بدون نیاز به کارت‌های بانکی خارجی. مصارف را مستقیماً به افغانی پرداخت کنید.",
      activePlanLabel: "شماره فاکتور:",
      currentPlanName: "پلان سالانه تجارت آریا",
      renewalCostLabel: "مبلغ سالانه (به قیمت تمام‌شد):",
      renewalCostValue: "۴,۵۰۰ افغانی (~$۶۲.۵۰)",
      coverageExpiryLabel: "مدت اعتبار فعلی:",
      cashOtpLabel: "کود تأیید نقدی واتساپ:",
      cashOtpPlaceholder: "کود ۶ رقمی را وارد کنید (مثلاً 849201)",
      cashVerifyBtn: "تأیید و تمدید اشتراک",
      cashHint: "رهنمایی: کود ارسال‌شده به واتساپ خود را وارد نمایید تا تحویل پول به نماینده رسماً ثبت گردد.",
      payHesabpayBtn: "پرداخت با اپلیکیشن حساب‌پی (QR)",
      hesabpayModalTitle: "درگاه پرداخت دیجیتال حساب‌پی",
      hesabpayModalDesc: "کود QR را با اپلیکیشن حساب‌پی اسکن نمایید تا اشتراک شما در ۳ ثانیه تمدید شود:",
      simulateApprovalBtn: "شبیه‌سازی پرداخت موفق",
      closeBtn: "بستن",
    },
    aiStudio: {
      cardTitle: "میزان مصرف و سهمیه ابزارهای هوش مصنوعی آریا",
      cardDesc: "میزان مصرف ماهوار و روزانه موتورهای متنی، تصویرسازی و صوتی آریا.",
      tierBadge: "پلان: تجارت حرفه‌ای",
      openStudioBtn: "ورود به استودیوی آریا",
      generateImageBtn: "تولید تصویر جدید",
      textTokensLabel: "۱. هوش مرکزی آریا (نگارش، تحلیل و ترجمه)",
      textTokensDesc: "۶۸,۴۰۰ از ۲۰۰,۰۰۰ کلمه امروز استفاده شده است (تجدید در 00:00 UTC)",
      canvasImagesLabel: "۲. استودیوی خلاقیت آریا (بنرها و عکس محصول)",
      canvasImagesDesc: "۲۱ از ۳۰ تصویر تجارتی این ماه تولید شده است",
      voiceCharsLabel: "۳. موتور صوتی هوشمند آریا (خوانش دری و پشتو)",
      voiceCharsDesc: "۴,۱۲۰ از ۲۵,۰۰۰ حرف مصرف شده است",
      voiceCacheBadge: "۸۶٪ ذخیره و رایگان",
      architectureNote: "ذخیره‌سازی هوشمند صدا: جملات و پاسخ‌های تکراری فروشگاه شما به شکل فایل ذخیره شده و بدون مصرف سهمیه حروفی ماهوار شما پخش می‌شوند.",
    },
    leads: {
      cardTitle: "پیام‌ها و فرمایشات زنده واتساپ",
      cardDesc: "پیام‌های صوتی، سوالات و فرمایشات مستقیم مشتریان از طریق فروشگاه آنلاین.",
      liveBadge: "پیام‌های زنده",
      orderIntentTag: "قصد خرید قطعی",
      autoRepliedTag: "پاسخ خودکار آریا",
      voiceNoteTranscribed: "تبدیل صدا به متن توسط سیستم آریا",
      listenAudioBtn: "شنیدن پاسخ صوتی",
      viewAuditLink: "مشاهده آرشیف کامل پیام‌ها ←",
    },
    canvasModal: {
      modalTitle: "استودیوی تصویرسازی و گرافیک آریا",
      promptLabel: "توضیحات تصویر به زبان دری، پشتو یا انگلیسی:",
      promptDefault: "بسته‌بندی مجلل زعفران افغانستان روی سنگ مرمر سفید، نورپردازی تبلیغاتی استودیویی، کیفیت عالی",
      aspectRatioLabel: "نسبت ابعاد عکس:",
      qualityLabel: "موتور پردازش گرافیکی:",
      emptyStateText: "توضیحات تصویر را بنویسید و روی دکمه تولید تصویر کلیک کنید.",
      renderingText: "در حال پردازش و تولید تصویر در سرورهای ابری آریا...",
      remainingQuotaLabel: "سهمیه باقیمانده:",
      cancelBtn: "انصراف",
      generateActionBtn: "تولید تصویر در استودیو",
    },
    common: {
      loading: "در حال بارگذاری...",
      success: "عملیات موفقانه انجام شد",
      error: "خطایی رخ داده است",
      save: "ذخیره",
      cancel: "انصراف",
      ms: "میلی‌ثانیه",
    },
  },

  ps: {
    dir: "rtl",
    localeName: "پښتو",
    appTitle: "د آریا کلاوډ کنټرول پینل",
    tagline: "د افغانستان لپاره خپلواک کلاوډ او مصنوعي هوښ",
    nav: {
      dashboard: "عمومي کتنه او روغتیا",
      storefront: "آنلاین پلورنځی (PWA)",
      domains: "د آریا د ډومینونو اداره",
      email: "د آریا رسمي سوداګریز ایمیل",
      aiStudioHeader: "د آریا مصنوعي هوښ سټوډیو",
      aiChat: "د آریا مرکزي هوښ",
      aiCanvas: "د آریا د ډیزاین او عکس سټوډیو",
      aiVoice: "د آریا د غږ انجن",
      aiVision: "د آریا د اسنادو لوستونکی",
      billingHeader: "مالي او د لګښتونو تصفیه",
      invoices: "فاکتورونه (د افغانیو حساب)",
      hesabpay: "د حساب‌پی ډیجیټل دروازي",
      cashAudit: "د آریا د نغدو دوه اړخیز تصدیق",
      searchPlaceholder: "د خدماتو، فرمایشونو، او اوزارونو لټون... [Alt+S]",
      notifications: "خبرتیاوې",
      accountSettings: "د حساب ترتیبات",
      signOut: "وتل",
    },
    alerts: {
      cashPendingTitle: "د نغدو پیسو دوه اړخیز تایید روان دی",
      cashPendingBody: "تادیه د حسابپي له لارې کیږي. نغدي راټولول شتون نلري.",
      verifyCodeBtn: "د واټساپ کوډ ثبت کړئ",
      verifiedSuccessTitle: "نغدي تادیه په بریالیتوب سره تایید شوه",
      verifiedSuccessBody: "۴,۵۰۰ افغانۍ نغدې ترلاسه شوې. ستاسو د آریا کلاوډ ګډون د ۳۶۵ ورځو لپاره وغځول شو.",
    },
    infra: {
      headerTitle: "د آریا د خپلواکو خدماتو او سرورونو روغتیا",
      headerDesc: "د شبکې چټکتیا، د سوداګریزو ایمیلونو امنیت او د ابری سرورونو ژوندی څار.",
      colComponent: "د آریا د خدمت برخه",
      colTarget: "ټاکل شوی ادرس",
      colStatus: "حالت",
      colLatency: "د شبکې پنګ (چټکتیا)",
      statusHealthy: "فعال او روغ (د آریا شبکه)",
      statusActive: "وصل او روان دی",
      statusConfigured: "۱۰۰٪ برابر شوی",
      manageDnsLink: "د آریا ډومین ترتیبات سمبال کړئ ←",
      viewLiveStore: "ژوندۍ وېبپاڼه وګورئ",
      refreshLatencyBtn: "د پنګ تازه کول",
    },
    billing: {
      cardTitle: "محلي بیلینګ او لګښتونه (افغانۍ)",
      cardDesc: "بهرنیو بانکي کارتونو ته اړتیا نشته. په مستقیم ډول په افغانیو تادیه وکړئ.",
      activePlanLabel: "د بل شمېره:",
      currentPlanName: "د آریا کلنی تجارتي پلان",
      renewalCostLabel: "کلنی لګښت (پرته له ګټې):",
      renewalCostValue: "۴,۵۰۰ افغانۍ (~$۶۲.۵۰)",
      coverageExpiryLabel: "د پوښښ اوسنۍ موده:",
      cashOtpLabel: "د واټساپ د نغدو تایید کوډ:",
      cashOtpPlaceholder: "۶ عددي کوډ دلته ولیکئ (لکه 849201)",
      cashVerifyBtn: "تایید او ګډون غځول",
      cashHint: "لارښوونه: هغه کوډ چې ستاسو واټساپ ته راغلی دلته دننه کړئ ترڅو استازي ته نغدې پیسې رسمي ثبت شي.",
      payHesabpayBtn: "په حساب‌پی اپلیکیشن کې تادیه (QR)",
      hesabpayModalTitle: "د حساب‌پی له لارې ډیجیټل تادیه",
      hesabpayModalDesc: "دا QR کوډ په حساب‌پی اپلیکیشن کې سکین کړئ ترڅو ګډون په ۳ ثانیو کې وغځول شي:",
      simulateApprovalBtn: "د تادیې ازموینه",
      closeBtn: "بندول",
    },
    aiStudio: {
      cardTitle: "د آریا د مصنوعي هوښ د لګښت او سهمیې څارنه",
      cardDesc: "د متن لیکلو، عکسونو جوړولو او غږیز انجن د میاشتنۍ او ورځنۍ سهمیې مصرف.",
      tierBadge: "پلان: مسلکي تجارت",
      openStudioBtn: "د آریا سټوډیو خلاصه کړئ",
      generateImageBtn: "نوی انځور جوړ کړئ",
      textTokensLabel: "۱. د آریا مرکزي هوښ (د لیکلو او څېړنې مرستیال)",
      textTokensDesc: "له ۲۰۰,۰۰۰ څخه ۶۸,۴۰۰ کلمې نن کارول شوي (نوی کیدل: 00:00 UTC)",
      canvasImagesLabel: "۲. د آریا د ډیزاین سټوډیو (د اعلانونو او اجناسو انځورونه)",
      canvasImagesDesc: "پدې میاشت کې له ۳۰ څخه ۲۱ سوداګریز انځورونه جوړ شوي",
      voiceCharsLabel: "۳. د آریا د غږ انجن (په پښتو او دري ویل)",
      voiceCharsDesc: "له ۲۵,۰۰۰ څخه ۴,۱۲۰ توري کارول شوي",
      voiceCacheBadge: "۸۶٪ زیرمه او وړیا",
      architectureNote: "د غږ هوښیار زیرمه کول: ستاسو د پلورنځي تکراري پوښتنې او سلامونه په سرور کې خوندي کېږي او ستاسو له میاشتنۍ سهمیې پرته وړیا خپرېږي.",
    },
    leads: {
      cardTitle: "د واټساپ راغلي پيغامونه او فرمایشونه",
      cardDesc: "هغه غږیز او متني فرمایشونه چې له وېبپاڼې مستقیم واټساپ ته راځي.",
      liveBadge: "ژوندی جریان",
      orderIntentTag: "د پېرودلو کلک نیت",
      autoRepliedTag: "د آریا خپلواک ځواب",
      voiceNoteTranscribed: "غږ په متن بدل شو (د آریا له لارې)",
      listenAudioBtn: "غږیز ځواب واورئ",
      viewAuditLink: "د ټولو پیغامونو تاریخچه ←",
    },
    canvasModal: {
      modalTitle: "د آریا د ډیزاین او عکسونو جوړولو سټوډیو",
      promptLabel: "د انځور تفصیلي تشریح (په پښتو، دري یا انګلیسي):",
      promptDefault: "په سپینو مرمرینو ډبرو د افغاني زعفرانو شاهي ډالۍ، سوداګریزه سټوډیويي رڼا، عالي کیفیت",
      aspectRatioLabel: "د عکس بڼه او اندازه:",
      qualityLabel: "د تولید ګرافیکي انجن:",
      emptyStateText: "د خپلې خوښې انځور تشریح ولیکئ او د جوړولو تڼۍ ووهئ.",
      renderingText: "د آریا په خپلواک ابری سرور کې د عکس د جوړېدو په حال کې...",
      remainingQuotaLabel: "پاتې سهمیه:",
      cancelBtn: "شاته تګ",
      generateActionBtn: "انځور جوړ کړئ",
    },
    common: {
      loading: "د راپورته کېدو په حال کې...",
      success: "کړنه په بریالیتوب ترسره شوه",
      error: "ستونزه رامنځته شوه",
      save: "خوندي کول",
      cancel: "بندول",
      ms: "میلی‌ثانیه",
    },
  },
};
