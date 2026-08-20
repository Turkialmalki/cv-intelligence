/**
 * Bilingual UI copy.
 *
 * The Arabic here is written as Arabic, not translated from the English.
 * Where a literal translation would read stiff or foreign, the Arabic line
 * says the same thing the way a Saudi professional would actually say it.
 */

export type Locale = "en" | "ar";

export const LOCALES: Locale[] = ["en", "ar"];

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export const dictionary = {
  en: {
    meta: {
      title: "CV Intelligence — Know what is holding your CV back",
      description:
        "Upload your CV and get an explainable ATS readiness score out of 100, with the exact issues holding it back and how to fix them.",
    },
    nav: {
      howItWorks: "How it works",
      whatWeCheck: "What we check",
      scanCta: "Scan My CV",
      backHome: "Back to home",
    },
    landing: {
      eyebrow: "ATS Readiness Score",
      headline: "Know what is holding your CV back.",
      subhead:
        "Most CVs are filtered out before a human reads them. In under a minute, see your CV the way screening software and recruiters see it — with the exact issues, and exactly how to fix them.",
      primaryCta: "Scan My CV",
      secondaryCta: "See what we check",
      trustFree: "Free · No account needed",
      trustTime: "Takes about 60 seconds",
      trustPrivate: "Private and secure",
      disclaimer:
        "Simulated against common ATS parsing, recruiter readability, CV structure and job-matching criteria. Not the score of any specific applicant tracking system.",
      featuresTitle: "Nine dimensions, one honest score",
      featuresSubtitle:
        "Every point deducted comes with the evidence behind it and the fix that recovers it.",
      howTitle: "How it works",
      howSubtitle: "Three steps. No account, no waiting.",
      steps: [
        {
          title: "Upload your CV",
          body: "PDF, Word or plain text. Add a job description if you want to see how well you match a specific role.",
        },
        {
          title: "Watch the scan",
          body: "Your CV is parsed and checked across nine dimensions — the same things screening software and recruiters look at.",
        },
        {
          title: "Get your report",
          body: "An explainable score, every issue with its evidence, and a before/after built only from your own content.",
        },
      ],
      finalCtaTitle: "See your score in about a minute.",
      finalCtaBody:
        "No account. No credit card. Your CV is never made public.",
    },
    features: {
      ats: {
        title: "ATS Readiness",
        body: "Whether screening software can actually read your CV — columns, tables, text boxes and image-only files are the usual culprits.",
      },
      quality: {
        title: "CV Quality",
        body: "Structure, experience clarity, achievement strength and how easily a recruiter can scan you in six seconds.",
      },
      matching: {
        title: "Job Matching",
        body: "Paste a job description and see which required skills you match, which you are missing, and where the gap really is.",
      },
      bilingual: {
        title: "Arabic and English",
        body: "Arabic CVs are parsed and scored on the same footing — not translated and guessed at.",
      },
      privacy: {
        title: "Private by Default",
        body: "Your CV is processed securely, never made publicly accessible, and the original file is deleted after parsing.",
      },
      actionable: {
        title: "Actually Actionable",
        body: "Every finding names the evidence, why it matters, and the specific change that fixes it. No vague advice.",
      },
    },
    upload: {
      title: "Upload your CV",
      subtitle:
        "PDF, DOCX or TXT, up to 8 MB. Or paste the text directly if you prefer.",
      dropzone: "Drop your CV here, or click to browse",
      dropzoneActive: "Drop it here",
      dropzoneHint: "PDF, DOCX or TXT · Max 8 MB",
      pasteToggle: "Paste text instead",
      uploadToggle: "Upload a file instead",
      pastePlaceholder: "Paste the full text of your CV here…",
      remove: "Remove",
      jobDescriptionLabel: "Target job description",
      jobDescriptionOptional: "Optional",
      jobDescriptionHint:
        "Paste a real job posting to see how well your CV matches it. Leave blank and we make no assumption about the role you want.",
      jobDescriptionPlaceholder:
        "Paste the job description you are targeting…",
      targetRoleLabel: "Target job title",
      targetRolePlaceholder: "e.g. Senior Supply Chain Manager",
      nameLabel: "Your name",
      namePlaceholder: "Full name",
      emailLabel: "Your email",
      emailPlaceholder: "you@example.com",
      emailHint: "We send your report here so you can come back to it later.",
      submit: "Scan My CV",
      submitting: "Starting scan…",
      privacyNotice:
        "Your CV is processed securely and is never made publicly accessible.",
      errors: {
        noFile: "Please upload your CV or paste its text.",
        tooLarge: "That file is over 8 MB. Please upload a smaller file.",
        wrongType: "Please upload a PDF, DOCX or TXT file.",
        nameRequired: "Please enter your name.",
        emailRequired: "Please enter a valid email address.",
        generic: "Something went wrong. Please try again.",
      },
    },
    scan: {
      stages: [
        "Reading document",
        "Extracting content",
        "Checking ATS compatibility",
        "Detecting sections",
        "Reviewing experience",
        "Measuring achievement strength",
        "Checking skills",
        "Evaluating keywords",
        "Testing recruiter readability",
        "Comparing with target role",
        "Calculating score",
        "Building recommendations",
      ],
      analyzing: "Analysing your CV",
      almostThere: "Almost there…",
    },
    reveal: {
      eyebrow: "Your ATS Readiness Score",
      outOf: "out of 100",
      viewReport: "View My Full Report",
      potential: "Your realistic potential",
    },
    classifications: {
      exceptional: "Exceptional",
      strong: "Strong",
      competitive: "Competitive",
      needs_improvement: "Needs Improvement",
      weak: "Weak",
      critical: "Critical",
    },
    report: {
      eyebrow: "CV Intelligence Report",
      scoreLabel: "ATS Readiness Score",
      potentialLabel: "Realistic potential",
      couldReach: "Could reach",
      breakdownTitle: "Score breakdown",
      breakdownSubtitle:
        "Nine dimensions, weighted. Every deduction is explained below.",
      comparisonTitle: "Before and after",
      comparisonSubtitle:
        "Built only from what is already in your CV. Where a number is missing, you will see a prompt to add your own — never an invented figure.",
      comparisonBefore: "Your CV now",
      comparisonAfter: "Optimised direction",
      issuesTitle: "What is holding your CV back?",
      issuesSubtitle: "Sorted by impact on your score.",
      issuesEvidence: "Found in your CV",
      issuesWhy: "Why this matters",
      issuesFix: "How to fix it",
      issuesImpact: "Score impact",
      issuesAll: "All",
      issuesCritical: "Critical",
      issuesHigh: "High",
      issuesMedium: "Medium",
      issuesStrengths: "Strengths",
      prioritiesTitle: "Your fastest improvements",
      prioritiesSubtitle:
        "Three changes, ranked by how much score each one recovers.",
      prioritiesGain: "recovers about",
      prioritiesPoints: "points",
      jobMatchTitle: "Job match",
      jobMatchSubtitle: "How your CV compares with the role you provided.",
      jobMatchOverall: "Overall match",
      jobMatchSkills: "Skills",
      jobMatchExperience: "Experience relevance",
      jobMatchKeywords: "Keyword coverage",
      jobMatchSeniority: "Seniority fit",
      jobMatchMatched: "Skills you match",
      jobMatchMissing: "Skills the role asks for that are missing",
      jobMatchNone:
        "No job description was provided, so no assumption has been made about the role you are targeting. Add one to see a precise gap report.",
      lockedTitle: "Full optimisation",
      lockedSubtitle: "Included when you have your CV professionally rewritten.",
      lockedItems: [
        "Your complete optimised CV, rewritten end to end",
        "Every bullet rewritten with your real achievements",
        "Full keyword strategy for your target roles",
        "Downloadable DOCX and PDF, ATS-safe formatting",
        "Advanced job matching across multiple roles",
      ],
      upgradeTitle: "Ready to fix all of this?",
      upgradeBody:
        "Have your CV professionally rewritten using your real experience — every issue in this report addressed.",
      upgradeCta: "Transform My CV",
      upgradeFrom: "Your score now",
      upgradeTo: "After optimisation",
      feedbackTitle: "Was this report useful?",
      feedbackThanks: "Thank you — that helps.",
      feedbackPlaceholder: "Anything we could do better? (optional)",
      feedbackSubmit: "Send feedback",
      emailSent: "Report sent to your email.",
      emailResend: "Email me this report",
      emailSending: "Sending…",
      notFoundTitle: "Report not found",
      notFoundBody:
        "This report link is not valid, or it has been removed. Reports are private to the person who created them.",
      notFoundCta: "Scan a CV",
      disclaimer:
        "Simulated against common ATS parsing, recruiter readability, CV structure and job-matching criteria. This is not the score of any specific applicant tracking system such as Workday, Greenhouse or Taleo.",
      privacyNote:
        "Your CV was processed securely and is never made publicly accessible. This report link is private to you.",
      scannedOn: "Scanned",
      sections: {
        overview: "Overview",
        breakdown: "Breakdown",
        comparison: "Before / after",
        issues: "Issues",
        priorities: "Priorities",
        upgrade: "Optimise",
      },
    },
    severity: {
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
      positive: "Strength",
    },
    common: {
      loading: "Loading…",
      retry: "Try again",
      close: "Close",
      language: "العربية",
      points: "pts",
    },
  },

  ar: {
    meta: {
      title: "تحليل السيرة الذاتية — اعرف وش اللي يمنع سيرتك من الوصول",
      description:
        "ارفع سيرتك الذاتية واحصل على درجة جاهزية واضحة من 100، مع النقاط التي تعيقها وطريقة إصلاحها بالضبط.",
    },
    nav: {
      howItWorks: "كيف تعمل",
      whatWeCheck: "وش نفحص",
      scanCta: "افحص سيرتي الذاتية",
      backHome: "الرئيسية",
    },
    landing: {
      eyebrow: "درجة جاهزية السيرة الذاتية",
      headline: "اعرف وش اللي يمنع سيرتك الذاتية من الوصول للفرصة المناسبة.",
      subhead:
        "أغلب السير الذاتية تُستبعد قبل أن يقرأها إنسان. خلال أقل من دقيقة، شف سيرتك كما تراها أنظمة التوظيف ومسؤولو التوظيف — مع النقاط التي تعيقها وطريقة معالجتها بالضبط.",
      primaryCta: "افحص سيرتي الذاتية",
      secondaryCta: "شف وش نفحص",
      trustFree: "مجاني · بدون حساب",
      trustTime: "يستغرق دقيقة تقريبًا",
      trustPrivate: "خاص وآمن",
      disclaimer:
        "التقييم محاكاة لمعايير قراءة أنظمة التوظيف، ووضوح السيرة لمسؤول التوظيف، وهيكلتها، ومدى توافقها مع الوظيفة. وليس درجة صادرة عن نظام توظيف بعينه.",
      featuresTitle: "تسعة معايير، ونتيجة واحدة صادقة",
      featuresSubtitle:
        "كل نقطة تُخصم مرفقة بالدليل الذي بُنيت عليه وبالإصلاح الذي يستعيدها.",
      howTitle: "كيف تعمل",
      howSubtitle: "ثلاث خطوات. بدون حساب وبدون انتظار.",
      steps: [
        {
          title: "ارفع سيرتك الذاتية",
          body: "PDF أو Word أو نص. وتقدر تضيف وصف وظيفة إذا تبي تعرف مدى توافقك مع دور محدد.",
        },
        {
          title: "تابع الفحص",
          body: "تُقرأ سيرتك وتُفحص عبر تسعة معايير — نفس ما تنظر إليه أنظمة التوظيف ومسؤولو التوظيف.",
        },
        {
          title: "استلم تقريرك",
          body: "درجة مفسَّرة، وكل ملاحظة بدليلها، ومقارنة قبل/بعد مبنية من محتوى سيرتك أنت فقط.",
        },
      ],
      finalCtaTitle: "شف درجتك خلال دقيقة تقريبًا.",
      finalCtaBody: "بدون حساب. بدون بطاقة. وسيرتك ما تُنشر للعامة أبدًا.",
    },
    features: {
      ats: {
        title: "جاهزية السيرة لأنظمة التوظيف",
        body: "هل تقدر أنظمة التوظيف تقرأ سيرتك أصلاً — الأعمدة والجداول ومربعات النص والملفات المصوّرة هي السبب المعتاد.",
      },
      quality: {
        title: "جودة السيرة الذاتية",
        body: "الهيكلة، ووضوح الخبرات، وقوة الإنجازات، وسهولة تصفّح سيرتك خلال ست ثوانٍ.",
      },
      matching: {
        title: "التوافق مع الوظيفة",
        body: "الصق وصف وظيفة وشف أي المهارات المطلوبة متوفرة عندك، وأيها ناقصة، وأين الفجوة فعليًا.",
      },
      bilingual: {
        title: "العربية والإنجليزية",
        body: "السير العربية تُقرأ وتُقيَّم بنفس الدقة — لا تُترجم ولا يُخمَّن محتواها.",
      },
      privacy: {
        title: "خصوصية بشكل افتراضي",
        body: "تُعالج سيرتك بأمان، ولا تُتاح للعامة إطلاقًا، ويُحذف الملف الأصلي بعد قراءته.",
      },
      actionable: {
        title: "توصيات قابلة للتطبيق",
        body: "كل ملاحظة تذكر الدليل، وسبب أهميتها، والتغيير المحدد الذي يعالجها. بدون نصائح عامة.",
      },
    },
    upload: {
      title: "ارفع سيرتك الذاتية",
      subtitle: "PDF أو DOCX أو TXT، بحد أقصى 8 ميجابايت. أو الصق النص مباشرة.",
      dropzone: "أفلت سيرتك هنا، أو اضغط للاختيار",
      dropzoneActive: "أفلتها هنا",
      dropzoneHint: "PDF أو DOCX أو TXT · بحد أقصى 8 ميجابايت",
      pasteToggle: "الصق النص بدلاً من ذلك",
      uploadToggle: "ارفع ملف بدلاً من ذلك",
      pastePlaceholder: "الصق نص سيرتك الذاتية كاملاً هنا…",
      remove: "إزالة",
      jobDescriptionLabel: "وصف الوظيفة المستهدفة",
      jobDescriptionOptional: "اختياري",
      jobDescriptionHint:
        "الصق إعلان وظيفة حقيقي لتشوف مدى توافق سيرتك معه. واذا تركته فارغ ما نفترض أي وظيفة مستهدفة.",
      jobDescriptionPlaceholder: "الصق وصف الوظيفة التي تستهدفها…",
      targetRoleLabel: "المسمى الوظيفي المستهدف",
      targetRolePlaceholder: "مثال: مدير سلاسل إمداد أول",
      nameLabel: "اسمك",
      namePlaceholder: "الاسم الكامل",
      emailLabel: "بريدك الإلكتروني",
      emailPlaceholder: "you@example.com",
      emailHint: "نرسل تقريرك على هذا البريد عشان ترجع له وقت ما تبي.",
      submit: "افحص سيرتي الذاتية",
      submitting: "جاري بدء الفحص…",
      privacyNotice: "تتم معالجة سيرتك بشكل آمن ولا تُتاح للعامة إطلاقًا.",
      errors: {
        noFile: "الرجاء رفع سيرتك الذاتية أو لصق نصها.",
        tooLarge: "حجم الملف يتجاوز 8 ميجابايت. الرجاء رفع ملف أصغر.",
        wrongType: "الرجاء رفع ملف PDF أو DOCX أو TXT.",
        nameRequired: "الرجاء إدخال اسمك.",
        emailRequired: "الرجاء إدخال بريد إلكتروني صحيح.",
        generic: "صار خطأ ما. الرجاء المحاولة مرة أخرى.",
      },
    },
    scan: {
      stages: [
        "قراءة الملف",
        "استخراج المحتوى",
        "فحص التوافق مع أنظمة التوظيف",
        "تحديد الأقسام",
        "مراجعة الخبرات",
        "قياس قوة الإنجازات",
        "فحص المهارات",
        "تقييم الكلمات المفتاحية",
        "اختبار وضوح السيرة للقارئ",
        "المقارنة مع الوظيفة المستهدفة",
        "احتساب الدرجة",
        "إعداد التوصيات",
      ],
      analyzing: "جاري تحليل سيرتك الذاتية",
      almostThere: "على وشك الانتهاء…",
    },
    reveal: {
      eyebrow: "درجة جاهزية سيرتك الذاتية",
      outOf: "من 100",
      viewReport: "اعرض التقرير الكامل",
      potential: "النتيجة الممكنة بشكل واقعي",
    },
    classifications: {
      exceptional: "استثنائية",
      strong: "قوية",
      competitive: "تنافسية",
      needs_improvement: "تحتاج تحسين",
      weak: "ضعيفة",
      critical: "حرجة",
    },
    report: {
      eyebrow: "تقرير تحليل السيرة الذاتية",
      scoreLabel: "درجة جاهزية السيرة الذاتية",
      potentialLabel: "النتيجة الممكنة واقعيًا",
      couldReach: "يمكن أن تصل إلى",
      breakdownTitle: "تفصيل الدرجة",
      breakdownSubtitle: "تسعة معايير بأوزان مختلفة. وكل خصم مشروح بالأسفل.",
      comparisonTitle: "قبل وبعد",
      comparisonSubtitle:
        "مبنية فقط مما هو موجود في سيرتك. وإذا كان الرقم ناقصًا سترى خانة تضيف فيها رقمك الحقيقي — ولن نضع رقمًا من عندنا أبدًا.",
      comparisonBefore: "سيرتك الآن",
      comparisonAfter: "النسخة المقترحة",
      issuesTitle: "النقاط التي تحتاج تحسين",
      issuesSubtitle: "مرتبة حسب تأثيرها على درجتك.",
      issuesEvidence: "الموجود في سيرتك",
      issuesWhy: "ليش هذا مهم",
      issuesFix: "كيف تصلحها",
      issuesImpact: "التأثير على الدرجة",
      issuesAll: "الكل",
      issuesCritical: "حرجة",
      issuesHigh: "عالية",
      issuesMedium: "متوسطة",
      issuesStrengths: "نقاط القوة",
      prioritiesTitle: "أسرع التحسينات أثرًا",
      prioritiesSubtitle: "ثلاثة تغييرات مرتبة حسب ما تستعيده كل واحدة من الدرجة.",
      prioritiesGain: "تستعيد تقريبًا",
      prioritiesPoints: "نقطة",
      jobMatchTitle: "مدى توافق السيرة مع الوظيفة",
      jobMatchSubtitle: "مقارنة سيرتك بالوظيفة التي أدخلتها.",
      jobMatchOverall: "التوافق العام",
      jobMatchSkills: "المهارات",
      jobMatchExperience: "صلة الخبرة",
      jobMatchKeywords: "تغطية الكلمات المفتاحية",
      jobMatchSeniority: "توافق المستوى الوظيفي",
      jobMatchMatched: "مهارات متوفرة عندك",
      jobMatchMissing: "مهارات تطلبها الوظيفة وغير موجودة",
      jobMatchNone:
        "ما تم إدخال وصف وظيفة، لذلك لم نفترض أي وظيفة مستهدفة. أضف وصفًا لتحصل على تقرير دقيق بالفجوات.",
      lockedTitle: "التطوير الكامل",
      lockedSubtitle: "يشمله تطوير سيرتك الذاتية بشكل احترافي.",
      lockedItems: [
        "سيرتك الذاتية كاملة بنسخة مطوّرة من البداية للنهاية",
        "إعادة صياغة كل نقطة بإنجازاتك الحقيقية",
        "استراتيجية كلمات مفتاحية كاملة للوظائف المستهدفة",
        "ملفات DOCX وPDF جاهزة للتحميل وبتنسيق يناسب أنظمة التوظيف",
        "تحليل توافق متقدم مع أكثر من وظيفة",
      ],
      upgradeTitle: "جاهز تعالج كل هذا؟",
      upgradeBody:
        "طوّر سيرتك الذاتية بشكل احترافي بالاعتماد على خبرتك الحقيقية — مع معالجة كل ملاحظة في هذا التقرير.",
      upgradeCta: "طوّر سيرتي الذاتية بالكامل",
      upgradeFrom: "درجتك الآن",
      upgradeTo: "بعد التطوير",
      feedbackTitle: "هل كان التقرير مفيدًا؟",
      feedbackThanks: "شكرًا لك — هذا يساعدنا.",
      feedbackPlaceholder: "أي شيء نقدر نحسّنه؟ (اختياري)",
      feedbackSubmit: "أرسل الملاحظة",
      emailSent: "تم إرسال التقرير على بريدك.",
      emailResend: "أرسل لي التقرير بالبريد",
      emailSending: "جاري الإرسال…",
      notFoundTitle: "التقرير غير موجود",
      notFoundBody:
        "هذا الرابط غير صالح أو تمت إزالته. التقارير خاصة بمن أنشأها فقط.",
      notFoundCta: "افحص سيرة ذاتية",
      disclaimer:
        "التقييم محاكاة لمعايير قراءة أنظمة التوظيف، ووضوح السيرة لمسؤول التوظيف، وهيكلتها، ومدى توافقها مع الوظيفة. وهو ليس درجة صادرة عن نظام توظيف بعينه مثل Workday أو Greenhouse أو Taleo.",
      privacyNote:
        "تمت معالجة سيرتك بشكل آمن ولا تُتاح للعامة إطلاقًا. ورابط التقرير خاص بك وحدك.",
      scannedOn: "تاريخ الفحص",
      sections: {
        overview: "نظرة عامة",
        breakdown: "التفصيل",
        comparison: "قبل / بعد",
        issues: "الملاحظات",
        priorities: "الأولويات",
        upgrade: "التطوير",
      },
    },
    severity: {
      critical: "حرجة",
      high: "عالية",
      medium: "متوسطة",
      low: "منخفضة",
      positive: "نقطة قوة",
    },
    common: {
      loading: "جاري التحميل…",
      retry: "حاول مرة أخرى",
      close: "إغلاق",
      language: "English",
      points: "نقطة",
    },
  },
} as const;

export type Dictionary = (typeof dictionary)["en"];

export function getDictionary(locale: Locale): Dictionary {
  return dictionary[locale] as Dictionary;
}
