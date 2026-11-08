/**
 * AriaCloud Universal HTML Compiler
 * Outputs a responsive, offline-ready single-file PWA with embedded Tailwind CSS and Alpine.js
 * Supports trilingual real-time switching (Dari RTL, Pashto RTL, English LTR) across any Afghan sector
 */

import { UniversalSiteSchema } from './types';

export function compileUniversalSiteHtml(schema: UniversalSiteSchema): string {
  const pwaManifestJson = JSON.stringify({
    name: schema.pwa.name,
    short_name: schema.pwa.shortName,
    theme_color: schema.pwa.themeColor,
    background_color: schema.pwa.backgroundColor,
    display: schema.pwa.display,
    start_url: schema.pwa.startUrl,
    icons: [
      {
        src: 'https://cdn.ariacloudservices.org/assets/pwa-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://cdn.ariacloudservices.org/assets/pwa-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  });

  // Safe to embed inside a <script type="application/json"> element:
  // escaping '<' prevents a literal </script> from terminating the block.
  const schemaJsonEscaped = JSON.stringify(schema)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const themeColors: Record<
    string,
    { primary: string; secondary: string; accent: string; bgSoft: string }
  > = {
    emerald: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#d97706',
      bgSoft: '#ecfdf5',
    },
    lapis: {
      primary: '#1d4ed8',
      secondary: '#1e40af',
      accent: '#f59e0b',
      bgSoft: '#eff6ff',
    },
    saffron: {
      primary: '#d97706',
      secondary: '#b45309',
      accent: '#059669',
      bgSoft: '#fffbeb',
    },
    slate: {
      primary: '#334155',
      secondary: '#1e293b',
      accent: '#0284c7',
      bgSoft: '#f8fafc',
    },
    teal: {
      primary: '#0d9488',
      secondary: '#0f766e',
      accent: '#e11d48',
      bgSoft: '#f0fdfa',
    },
    crimson: {
      primary: '#be123c',
      secondary: '#9f1239',
      accent: '#d97706',
      bgSoft: '#fff1f2',
    },
  };

  const selectedTheme = themeColors[schema.theme] || themeColors.emerald;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>${escapeHtml(schema.header.businessName.fa)} — ${escapeHtml(schema.header.tagline.fa)}</title>
  <meta name="description" content="${escapeHtml(schema.hero.subheadline.fa)}">
  <meta name="theme-color" content="${schema.pwa.themeColor}">
  
  <!-- Embedded Offline PWA Manifest -->
  <link rel="manifest" href="data:application/manifest+json;charset=utf-8,${encodeURIComponent(
    pwaManifestJson
  )}">

  <!-- Perso-Arabic Typography (Vazirmatn) & Open Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Tailwind CSS & Alpine.js -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"></script>
  
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '${selectedTheme.bgSoft}',
              600: '${selectedTheme.primary}',
              700: '${selectedTheme.secondary}',
              accent: '${selectedTheme.accent}',
            }
          },
          fontFamily: {
            vazir: ['Vazirmatn', 'sans-serif'],
            sans: ['Open Sans', 'sans-serif'],
          }
        }
      }
    };
  </script>

  <style>
    [x-cloak] { display: none !important; }
    html[dir="rtl"] body { font-family: 'Vazirmatn', sans-serif; }
    html[dir="ltr"] body { font-family: 'Open Sans', sans-serif; }
    .glass-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
    }
  </style>
</head>
<body 
  x-data="ariaSite()"
  :dir="dir"
  class="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col"
>
  <!-- Schema is data, not an attribute: no quoting can break out of it. -->
  <script type="application/json" id="aria-schema">${schemaJsonEscaped}</script>

  <!-- TOP UTILITY & LANGUAGE BAR -->
  <header class="bg-brand-700 text-white text-xs sm:text-sm py-2 px-4 shadow-sm">
    <div class="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-1 font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          <span x-text="schema.header.phone"></span>
        </span>
        <span class="hidden md:inline-block text-slate-200" x-text="loc(schema.header.address)"></span>
      </div>
      
      <!-- TRILINGUAL LANGUAGE SWITCHER -->
      <div class="flex items-center gap-1 bg-brand-600/60 rounded-lg p-0.5 border border-white/20">
        <button 
          @click="setLanguage('fa')"
          :class="currentLang === 'fa' ? 'bg-white text-brand-700 font-bold shadow' : 'text-white hover:bg-white/10'"
          class="px-2.5 py-1 rounded text-xs transition"
        >دری</button>
        <button 
          @click="setLanguage('ps')"
          :class="currentLang === 'ps' ? 'bg-white text-brand-700 font-bold shadow' : 'text-white hover:bg-white/10'"
          class="px-2.5 py-1 rounded text-xs transition"
        >پښتو</button>
        <button 
          @click="setLanguage('en')"
          :class="currentLang === 'en' ? 'bg-white text-brand-700 font-bold shadow' : 'text-white hover:bg-white/10'"
          class="px-2.5 py-1 rounded text-xs transition"
        >EN</button>
      </div>
    </div>
  </header>

  <!-- MAIN NAVIGATION -->
  <nav class="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 py-3.5 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-xl shadow-md">
          <span x-text="loc(schema.header.businessName).charAt(0)"></span>
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight" x-text="loc(schema.header.businessName)"></h1>
          <p class="text-xs text-slate-500 hidden sm:block" x-text="loc(schema.header.tagline)"></p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <a 
          :href="whatsappUrl()" 
          target="_blank" 
          class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition transform active:scale-95"
        >
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"/></svg>
          <span x-text="loc(schema.hero.primaryCtaText)"></span>
        </a>
      </div>
    </div>
  </nav>

  <!-- HERO SECTION -->
  <section class="relative bg-gradient-to-b from-brand-50 to-slate-50 py-12 sm:py-20 px-4 border-b border-slate-200">
    <div class="max-w-5xl mx-auto text-center space-y-5">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-600/10 text-brand-700 text-xs font-bold uppercase tracking-wider">
        <span class="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
        <span x-text="schema.industry.toUpperCase()"></span>
      </div>
      <h2 class="text-3xl sm:text-5xl font-black text-slate-900 leading-tight" x-text="loc(schema.hero.headline)"></h2>
      <p class="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed" x-text="loc(schema.hero.subheadline)"></p>
      
      <div class="pt-4 flex flex-wrap justify-center gap-3">
        <a 
          :href="whatsappUrl()" 
          target="_blank" 
          class="bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 text-base inline-flex items-center gap-2"
        >
          <span x-text="loc(schema.hero.primaryCtaText)"></span>
          <svg class="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </a>
      </div>
    </div>
  </section>

  <!-- SECTOR-SPECIFIC DYNAMIC CONTENT -->
  <main class="flex-grow max-w-7xl mx-auto px-4 py-12 w-full space-y-16">
    
    <!-- 1. CLINIC SECTOR -->
    <template x-if="schema.industry === 'clinic' && schema.clinic">
      <div class="space-y-12">
        <!-- Emergency Hotline Banner -->
        <div class="bg-red-50 border-r-4 rtl:border-r-4 ltr:border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div class="flex items-center gap-3 text-red-900">
            <span class="text-2xl">🚨</span>
            <div>
              <p class="font-bold text-sm sm:text-base">
                <span x-show="currentLang === 'fa'">بخش عاجل و رسیدگی ۲۴ ساعته</span>
                <span x-show="currentLang === 'ps'">۲۴ ساعته بیړنۍ څانګه</span>
                <span x-show="currentLang === 'en'">24/7 Emergency & Triage Line</span>
              </p>
              <p class="text-xs text-red-700" x-text="schema.clinic.emergencyContact"></p>
            </div>
          </div>
          <a :href="'tel:' + schema.clinic.emergencyContact" class="bg-red-600 text-white text-xs px-3 py-2 rounded-lg font-bold">
            <span x-show="currentLang === 'fa'">تماس فوری</span>
            <span x-show="currentLang === 'ps'">اوسنی اړیکه</span>
            <span x-show="currentLang === 'en'">Call Now</span>
          </a>
        </div>

        <!-- Doctor Profiles -->
        <section class="space-y-6">
          <div class="text-center sm:text-start">
            <h3 class="text-2xl font-bold text-slate-900">
              <span x-show="currentLang === 'fa'">داکتران و متخصصین کلینیک</span>
              <span x-show="currentLang === 'ps'">د کلینیک ډاکټران او متخصصین</span>
              <span x-show="currentLang === 'en'">Medical Specialists & Physicians</span>
            </h3>
            <p class="text-sm text-slate-500">
              <span x-show="currentLang === 'fa'">نوبت‌دهی آنلاین و ویزیت تخصصی در کابل</span>
              <span x-show="currentLang === 'ps'">په کابل کې تخصصي لیدنې او نوم لیکنه</span>
              <span x-show="currentLang === 'en'">Book verified clinical consultations via WhatsApp</span>
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <template x-for="doc in schema.clinic.doctors" :key="doc.id">
              <div class="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
                <div>
                  <div class="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xl mb-3">🩺</div>
                  <h4 class="text-lg font-bold text-slate-900" x-text="loc(doc.name)"></h4>
                  <p class="text-xs font-semibold text-brand-600" x-text="loc(doc.specialty)"></p>
                  <p class="text-xs text-slate-500 mt-1" x-text="loc(doc.qualifications)"></p>
                </div>
                
                <div class="pt-4 border-t border-slate-100 space-y-3">
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-slate-500">
                      <span x-show="currentLang === 'fa'">فیس معاینه:</span>
                      <span x-show="currentLang === 'ps'">د لیدنې فیس:</span>
                      <span x-show="currentLang === 'en'">Consultation Fee:</span>
                    </span>
                    <span class="font-extrabold text-brand-700" x-text="doc.consultationFeeAfn + ' AFN'"></span>
                  </div>
                  <div class="text-xs text-slate-500">
                    <span class="font-medium">
                      <span x-show="currentLang === 'fa'">ساعات کاری:</span>
                      <span x-show="currentLang === 'ps'">کاري وختونه:</span>
                      <span x-show="currentLang === 'en'">Hours:</span>
                    </span>
                    <span x-text="doc.appointmentSlots ? doc.appointmentSlots.join(', ') : '09:00 - 15:00'"></span>
                  </div>
                  <a 
                    :href="whatsappUrl('Doctor: ' + loc(doc.name))" 
                    target="_blank" 
                    class="block text-center w-full bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs py-2 rounded-lg transition"
                  >
                    <span x-show="currentLang === 'fa'">رزرو نوبت در واتساپ ←</span>
                    <span x-show="currentLang === 'ps'">په واټساپ کې وخت اخیستل ←</span>
                    <span x-show="currentLang === 'en'">Book Consultation →</span>
                  </a>
                </div>
              </div>
            </template>
          </div>
        </section>

        <!-- Diagnostic Tests & Lab Menu -->
        <section class="space-y-6">
          <h3 class="text-2xl font-bold text-slate-900">
            <span x-show="currentLang === 'fa'">آزمایشگاه و خدمات تشخیصیه</span>
            <span x-show="currentLang === 'ps'">لابراتوار او د معایناتو لړلیک</span>
            <span x-show="currentLang === 'en'">Diagnostic Laboratory Menu</span>
          </h3>
          <div class="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
            <table class="w-full text-xs sm:text-sm text-start">
              <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th class="p-3.5">
                    <span x-show="currentLang === 'fa'">نام آزمایش</span>
                    <span x-show="currentLang === 'ps'">د معاینې نوم</span>
                    <span x-show="currentLang === 'en'">Test Name</span>
                  </th>
                  <th class="p-3.5">
                    <span x-show="currentLang === 'fa'">بخش</span>
                    <span x-show="currentLang === 'ps'">څانګه</span>
                    <span x-show="currentLang === 'en'">Category</span>
                  </th>
                  <th class="p-3.5">
                    <span x-show="currentLang === 'fa'">قیمت (افغانی)</span>
                    <span x-show="currentLang === 'ps'">بیه (افغانۍ)</span>
                    <span x-show="currentLang === 'en'">Price (AFN)</span>
                  </th>
                  <th class="p-3.5">
                    <span x-show="currentLang === 'fa'">مدت جوابدهی</span>
                    <span x-show="currentLang === 'ps'">د پایلې وخت</span>
                    <span x-show="currentLang === 'en'">Turnaround</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <template x-for="test in schema.clinic.diagnosticTests" :key="test.id">
                  <tr class="hover:bg-slate-50">
                    <td class="p-3.5 font-semibold text-slate-800" x-text="loc(test.name)"></td>
                    <td class="p-3.5 text-slate-500" x-text="loc(test.category)"></td>
                    <td class="p-3.5 font-bold text-brand-700" x-text="test.priceAfn + ' AFN'"></td>
                    <td class="p-3.5 text-slate-500" x-text="test.turnaroundHours + ' hrs'"></td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>

    <!-- 2. SCHOOL SECTOR -->
    <template x-if="schema.industry === 'school' && schema.school">
      <div class="space-y-8">
        <h3 class="text-2xl font-bold text-slate-900">
          <span x-show="currentLang === 'fa'">برنامه‌ها و صنف‌های آموزشی</span>
          <span x-show="currentLang === 'ps'">ښوونیز کورسونه او پروګرامونه</span>
          <span x-show="currentLang === 'en'">Curriculum & Programs</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <template x-for="course in schema.school.courses" :key="course.id">
            <div class="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h4 class="text-lg font-bold text-slate-900" x-text="loc(course.title)"></h4>
              <p class="text-xs text-slate-600" x-text="loc(course.description)"></p>
              <div class="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                <span class="text-slate-500" x-text="course.durationMonths + ' Months'"></span>
                <span class="font-bold text-brand-700" x-text="course.feeAfn + ' AFN'"></span>
              </div>
              <a :href="whatsappUrl('Course: ' + loc(course.title))" target="_blank" class="block text-center w-full bg-brand-600 text-white font-bold text-xs py-2 rounded-lg">
                <span x-show="currentLang === 'fa'">ثبت‌نام آنلاین در واتساپ</span>
                <span x-show="currentLang === 'ps'">په واټساپ کې نوم لیکنه</span>
                <span x-show="currentLang === 'en'">Enroll via WhatsApp</span>
              </a>
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- 3. LOGISTICS SECTOR -->
    <template x-if="schema.industry === 'logistics' && schema.logistics">
      <div class="space-y-8">
        <h3 class="text-2xl font-bold text-slate-900">
          <span x-show="currentLang === 'fa'">مسیرهای فعال ترانزیت و باربری</span>
          <span x-show="currentLang === 'ps'">د ترانزیت او لېږد فعالې لارې</span>
          <span x-show="currentLang === 'en'">Active Freight Routes & Tariffs</span>
        </h3>
        <div class="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table class="w-full text-xs sm:text-sm text-start">
            <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th class="p-3.5">
                  <span x-show="currentLang === 'fa'">مبدأ</span>
                  <span x-show="currentLang === 'ps'">پیل</span>
                  <span x-show="currentLang === 'en'">Origin</span>
                </th>
                <th class="p-3.5">
                  <span x-show="currentLang === 'fa'">مقصد</span>
                  <span x-show="currentLang === 'ps'">موخه</span>
                  <span x-show="currentLang === 'en'">Destination</span>
                </th>
                <th class="p-3.5">
                  <span x-show="currentLang === 'fa'">مدت رسیدن</span>
                  <span x-show="currentLang === 'ps'">د رسیدو موده</span>
                  <span x-show="currentLang === 'en'">Transit Days</span>
                </th>
                <th class="p-3.5">
                  <span x-show="currentLang === 'fa'">نرخ هر کیلو</span>
                  <span x-show="currentLang === 'ps'">د کیلو بیه</span>
                  <span x-show="currentLang === 'en'">Rate / KG</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <template x-for="r in schema.logistics.routes" :key="r.id">
                <tr class="hover:bg-slate-50">
                  <td class="p-3.5 font-bold" x-text="loc(r.origin)"></td>
                  <td class="p-3.5 font-bold" x-text="loc(r.destination)"></td>
                  <td class="p-3.5 text-slate-500" x-text="r.transitTimeDays + ' Days'"></td>
                  <td class="p-3.5 font-extrabold text-brand-700" x-text="r.ratePerKgAfn + ' AFN/kg'"></td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 4. EXPORT SECTOR -->
    <template x-if="schema.industry === 'export' && schema.export">
      <div class="space-y-8">
        <h3 class="text-2xl font-bold text-slate-900">
          <span x-show="currentLang === 'fa'">محصولات صادراتی افغانستان</span>
          <span x-show="currentLang === 'ps'">د افغانستان صادراتي توکي</span>
          <span x-show="currentLang === 'en'">Export Commodities & Global Trade</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <template x-for="item in schema.export.commodities" :key="item.id">
            <div class="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h4 class="text-lg font-bold text-slate-900" x-text="loc(item.title)"></h4>
              <p class="text-xs text-brand-700 font-bold" x-text="'Origin: ' + loc(item.originProvince)"></p>
              <p class="text-xs text-slate-500" x-text="'Grade: ' + loc(item.gradeSpec)"></p>
              <p class="text-xs text-slate-500" x-text="'MOQ: ' + item.minOrderQuantityKg + ' KG'"></p>
              <a :href="whatsappUrl('Export Inquiry: ' + loc(item.title))" target="_blank" class="block text-center w-full bg-brand-600 text-white font-bold text-xs py-2 rounded-lg">
                <span x-show="currentLang === 'fa'">درخواست قیمت عمده (RFQ)</span>
                <span x-show="currentLang === 'ps'">د عمده بیې غوښتنه</span>
                <span x-show="currentLang === 'en'">Request Export Quote</span>
              </a>
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- 5. RETAIL SECTOR -->
    <template x-if="schema.industry === 'retail' && schema.retail">
      <div class="space-y-8">
        <h3 class="text-2xl font-bold text-slate-900">
          <span x-show="currentLang === 'fa'">محصولات و کالاهای فروشگاه</span>
          <span x-show="currentLang === 'ps'">د پلورنځي اجناس او توکي</span>
          <span x-show="currentLang === 'en'">Product Catalog</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <template x-for="p in schema.retail.products" :key="p.id">
            <div class="glass-card rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <h4 class="text-base font-bold text-slate-900" x-text="loc(p.name)"></h4>
                <p class="text-xs text-slate-500 mt-1" x-text="loc(p.description)"></p>
              </div>
              <div class="pt-3 border-t border-slate-100 flex justify-between items-center">
                <span class="text-sm font-black text-brand-700" x-text="p.priceAfn.toLocaleString() + ' AFN'"></span>
                <a :href="whatsappUrl('Order: ' + loc(p.name))" target="_blank" class="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold">
                  <span x-show="currentLang === 'fa'">سفارش در واتساپ</span>
                  <span x-show="currentLang === 'ps'">په واټساپ فرمایش</span>
                  <span x-show="currentLang === 'en'">Order WhatsApp</span>
                </a>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- 6. SERVICES / CONSULTANCY SECTOR -->
    <template x-if="schema.industry === 'services' && schema.services">
      <div class="space-y-8">
        <h3 class="text-2xl font-bold text-slate-900">
          <span x-show="currentLang === 'fa'">خدمات و حوزه‌های مشاوره</span>
          <span x-show="currentLang === 'ps'">خدمات او تخصصي مشورې</span>
          <span x-show="currentLang === 'en'">Professional Services</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <template x-for="srv in schema.services.offerings" :key="srv.id">
            <div class="glass-card rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h4 class="text-lg font-bold text-slate-900" x-text="loc(srv.title)"></h4>
              <p class="text-xs text-slate-600" x-text="loc(srv.description)"></p>
              <a :href="whatsappUrl('Consultation: ' + loc(srv.title))" target="_blank" class="block text-center w-full bg-brand-600 text-white font-bold text-xs py-2 rounded-lg">
                <span x-show="currentLang === 'fa'">درخواست مشاوره</span>
                <span x-show="currentLang === 'ps'">د مشورې غوښتنه</span>
                <span x-show="currentLang === 'en'">Book Consultation</span>
              </a>
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- OPERATING HOURS & LOCATION -->
    <section class="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div class="space-y-4">
          <h3 class="text-2xl font-bold text-slate-900">
            <span x-show="currentLang === 'fa'">ساعات کاری و پذیرش</span>
            <span x-show="currentLang === 'ps'">کاري وختونه او د مراجعې ساعتونه</span>
            <span x-show="currentLang === 'en'">Hours of Operation</span>
          </h3>
          <div class="space-y-2 text-sm text-slate-600">
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="font-medium" x-text="loc(schema.operatingHours.regular.days)"></span>
              <span class="font-bold text-slate-800" x-text="schema.operatingHours.regular.hours"></span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="font-medium">
                <span x-show="currentLang === 'fa'">پنج‌شنبه:</span>
                <span x-show="currentLang === 'ps'">پنجشنبه:</span>
                <span x-show="currentLang === 'en'">Thursday:</span>
              </span>
              <span class="font-bold" :class="schema.operatingHours.thursday?.status === 'closed' ? 'text-red-600' : 'text-slate-800'" x-text="schema.operatingHours.thursday?.status === 'closed' ? (currentLang === 'fa' ? 'رخصت (بسته)' : currentLang === 'ps' ? 'رخصتي' : 'Closed') : (schema.operatingHours.thursday?.hours || '09:00 - 13:00')"></span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="font-medium">
                <span x-show="currentLang === 'fa'">جمعه:</span>
                <span x-show="currentLang === 'ps'">جمعه:</span>
                <span x-show="currentLang === 'en'">Friday:</span>
              </span>
              <span class="font-bold text-red-600" x-text="currentLang === 'fa' ? 'رخصت عمومی' : currentLang === 'ps' ? 'عمومي رخصتي' : 'Closed'"></span>
            </div>
          </div>
        </div>

        <div class="bg-brand-50 rounded-2xl p-6 border border-brand-100 space-y-4 text-center sm:text-start">
          <h4 class="font-bold text-slate-900 text-base" x-text="loc(schema.header.businessName)"></h4>
          <p class="text-xs text-slate-600 leading-relaxed" x-text="loc(schema.header.address)"></p>
          <div class="pt-2">
            <a :href="whatsappUrl()" target="_blank" class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition">
              <span x-show="currentLang === 'fa'">ارتباط مستقیم در واتساپ</span>
              <span x-show="currentLang === 'ps'">په واټساپ کې مستقیم تماس</span>
              <span x-show="currentLang === 'en'">Direct WhatsApp Dispatch</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="bg-slate-900 text-slate-400 text-xs py-8 px-4 border-t border-slate-800 mt-auto">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-start">
      <div>
        <p class="font-semibold text-slate-200" x-text="loc(schema.header.businessName) + ' © ' + new Date().getFullYear()"></p>
        <p class="text-slate-500 text-[11px] mt-0.5">
          <span x-show="currentLang === 'fa'">میزبانی شده در شبکه لبه مستقل آریا کلاود</span>
          <span x-show="currentLang === 'ps'">د آریا کلاوډ په خپلواک ابری سرور کې کوربه شوی</span>
          <span x-show="currentLang === 'en'">Hosted on Aria Sovereign Cloud & Aria Global Edge</span>
        </p>
      </div>
      <div class="flex items-center gap-4 text-[11px]">
        <span>TLS 1.3 Secure</span>
        <span>•</span>
        <span>Offline PWA Ready</span>
        <span>•</span>
        <span x-text="'v' + schema.version"></span>
      </div>
    </div>
  </footer>

  <script>
    function ariaSite() {
      // Read the schema from a JSON data block rather than an HTML attribute,
      // so an apostrophe or quote in generated copy cannot break the page.
      var el = document.getElementById('aria-schema');
      var initialSchema = el && el.textContent ? JSON.parse(el.textContent) : {};
      return {
        schema: initialSchema,
        currentLang: 'fa',
        dir: 'rtl',
        setLanguage(lang) {
          this.currentLang = lang;
          this.dir = (lang === 'fa' || lang === 'ps') ? 'rtl' : 'ltr';
          document.documentElement.dir = this.dir;
          document.documentElement.lang = lang;
        },
        loc(localizedObj) {
          if (!localizedObj) return '';
          if (typeof localizedObj === 'string') return localizedObj;
          return localizedObj[this.currentLang] || localizedObj.fa || localizedObj.en || '';
        },
        whatsappUrl(customIntent) {
          const phone = this.schema.whatsappCta?.phoneNumber || this.schema.header.whatsappPhone || '93700123456';
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          let msg = this.loc(this.schema.whatsappCta?.prefilledMessage) || 'سلام، جهت هماهنگی و معلومات پیام می‌فرستم.';
          if (customIntent) {
            msg = msg + ' [' + customIntent + ']';
          }
          return 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(msg);
        }
      };
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
