/**
 * Static language resources used by the deterministic engine.
 * Everything here is bilingual (English + Arabic) so an Arabic CV is scored
 * on the same footing as an English one.
 */

export const SECTION_TYPES = [
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
  "projects",
  "languages",
  "awards",
  "volunteering",
  "references",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/** Heading aliases, lower-cased. Arabic entries are stored un-normalised. */
export const SECTION_HEADINGS: Record<SectionType, string[]> = {
  summary: [
    "summary",
    "professional summary",
    "career summary",
    "profile",
    "professional profile",
    "about me",
    "about",
    "objective",
    "career objective",
    "personal statement",
    "overview",
    "الملف الشخصي",
    "نبذة",
    "نبذة عني",
    "نبذة مختصرة",
    "الملخص",
    "ملخص",
    "ملخص مهني",
    "الملخص المهني",
    "الملخص الوظيفي",
    "نبذة شخصية",
    "المقدمة",
    "الهدف الوظيفي",
    "الهدف المهني",
  ],
  experience: [
    "experience",
    "work",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "work history",
    "career history",
    "professional background",
    "relevant experience",
    "الخبرات",
    "الخبرة",
    "الخبرة العملية",
    "الخبرات العملية",
    "الخبرات المهنية",
    "التاريخ الوظيفي",
    "المسار المهني",
    "السجل الوظيفي",
  ],
  education: [
    "education",
    "academic background",
    "academic qualifications",
    "qualifications",
    "educational background",
    "التعليم",
    "المؤهلات",
    "المؤهلات العلمية",
    "المؤهل العلمي",
    "الدراسة",
    "التحصيل العلمي",
  ],
  skills: [
    "skills",
    "technical skills",
    "core skills",
    "key skills",
    "competencies",
    "core competencies",
    "core competencies and achievements",
    "core competencies & achievements",
    "competencies and achievements",
    "key competencies",
    "professional skills",
    "skills & competencies",
    "skills and competencies",
    "technical proficiencies",
    "areas of expertise",
    "expertise",
    "technologies",
    "tools",
    "المهارات",
    "المهارات التقنية",
    "المهارات الأساسية",
    "الكفاءات",
    "مجالات الخبرة",
    "الأدوات",
  ],
  certifications: [
    "certifications",
    "certificates",
    "certification",
    "licenses",
    "licences",
    "professional certifications",
    "courses",
    "training",
    "الشهادات",
    "الشهادات المهنية",
    "الدورات",
    "الدورات التدريبية",
    "التدريب",
    "الرخص المهنية",
  ],
  projects: [
    "projects",
    "key projects",
    "selected projects",
    "personal projects",
    "portfolio",
    "المشاريع",
    "المشاريع البارزة",
    "أعمال",
    "نماذج أعمال",
  ],
  languages: ["languages", "language skills", "اللغات", "المهارات اللغوية"],
  awards: [
    "awards",
    "honors",
    "honours",
    "achievements",
    "recognition",
    "awards & certificate",
    "awards & certificates",
    "awards and certificates",
    "awards & recognition",
    "honors & awards",
    "awards & achievements",
    "الجوائز والشهادات",
    "الجوائز والتكريم",
    "الجوائز",
    "التكريم",
    "الإنجازات",
    "التقديرات",
  ],
  volunteering: [
    "volunteering",
    "volunteer experience",
    "community involvement",
    "extracurricular",
    "التطوع",
    "العمل التطوعي",
    "الأنشطة",
    "الأنشطة اللاصفية",
  ],
  references: [
    "references",
    "referees",
    "المراجع",
    "التزكيات",
    "الجهات المرجعية",
  ],
};

/** Sections a competitive CV is expected to contain, with their weight. */
export const EXPECTED_SECTIONS: Array<{
  type: SectionType;
  weight: number;
  required: boolean;
}> = [
  { type: "summary", weight: 2, required: false },
  { type: "experience", weight: 4, required: true },
  { type: "education", weight: 2.5, required: true },
  { type: "skills", weight: 2.5, required: true },
  { type: "certifications", weight: 0.5, required: false },
  { type: "projects", weight: 0.25, required: false },
  { type: "languages", weight: 0.25, required: false },
];

/** Conventional reading order recruiters and parsers expect. */
export const CANONICAL_ORDER: SectionType[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
  "projects",
  "languages",
  "awards",
  "volunteering",
  "references",
];

export const STRONG_ACTION_VERBS = new Set<string>([
  "accelerated", "achieved", "acquired", "administered", "advanced", "advised",
  "analyzed", "architected", "authored", "automated", "boosted", "brokered",
  "built", "captured", "centralized", "chaired", "championed", "coached",
  "consolidated", "constructed", "converted", "coordinated", "created",
  "cultivated", "cut", "decreased", "defined", "delivered", "deployed",
  "designed", "developed", "devised", "diagnosed", "directed", "doubled",
  "drove", "eliminated", "enabled", "engineered", "enhanced", "established",
  "exceeded", "executed", "expanded", "expedited", "facilitated", "forecasted",
  "formulated", "founded", "generated", "grew", "guided", "headed",
  "implemented", "improved", "increased", "influenced", "initiated",
  "innovated", "instituted", "integrated", "introduced", "launched", "led",
  "leveraged", "maximized", "mentored", "migrated", "minimized", "mobilized",
  "modernized", "negotiated", "onboarded", "optimized", "orchestrated",
  "overhauled", "pioneered", "prevented", "prioritized", "produced",
  "programmed", "quantified", "raised", "rebuilt", "redesigned", "reduced",
  "refactored", "reengineered", "resolved", "restructured", "revamped",
  "saved", "scaled", "secured", "shaped", "shipped", "simplified",
  "spearheaded", "standardized", "steered", "streamlined", "strengthened",
  "supervised", "sustained", "transformed", "tripled", "unified", "upgraded",
  "validated", "won",
  // Arabic
  "أنجزت", "طوّرت", "طورت", "أطلقت", "قدت", "قُدت", "أدرت", "بنيت", "صممت",
  "حسّنت", "حسنت", "زدت", "خفضت", "قلّلت", "قللت", "أسست", "نفّذت", "نفذت",
  "حققت", "رفعت", "وفّرت", "وفرت", "اختصرت", "أشرفت", "قدّمت", "قدمت",
  "أعدت هيكلة", "دربت", "درّبت", "وسّعت", "وسعت", "أتمتت", "ضاعفت",
]);

export const WEAK_OPENERS = new Set<string>([
  "responsible", "responsibilities", "duties", "tasked", "worked", "helped",
  "assisted", "participated", "involved", "handled", "dealt", "did", "made",
  "used", "utilized", "supported", "attended", "familiar", "exposure",
  "knowledge", "understanding", "in charge",
  // Arabic
  "مسؤول", "مسئول", "مسؤولياتي", "المهام", "مهامي", "ساعدت", "شاركت",
  "عملت على", "قمت", "كنت", "تعاملت", "اطلعت",
]);

export const FILLER_PHRASES = [
  "hard working", "hard-working", "team player", "self motivated",
  "self-motivated", "detail oriented", "detail-oriented", "go getter",
  "go-getter", "think outside the box", "results driven", "results-driven",
  "dynamic professional", "excellent communication skills",
  "strong work ethic", "fast learner", "passionate about",
  "لاعب جماعي", "أعمل بجد", "طموح", "أسعى للتميز", "شغوف",
  "أتحمل ضغط العمل", "روح الفريق",
];

export const GENERIC_SKILLS = new Set<string>([
  "microsoft office", "ms office", "office", "word", "excel", "powerpoint",
  "outlook", "email", "internet", "typing", "communication",
  "communication skills", "teamwork", "team work", "leadership",
  "problem solving", "time management", "hard working", "organization",
  "multitasking", "flexibility", "adaptability", "creativity",
  "الحاسب الآلي", "مايكروسوفت أوفيس", "التواصل", "العمل الجماعي",
  "إدارة الوقت", "حل المشكلات", "القيادة",
]);

/** Recognisable technical / domain skills used to judge specificity. */
export const TECHNICAL_SKILL_HINTS = [
  "python", "javascript", "typescript", "java", "kotlin", "swift", "golang",
  "go", "rust", "c++", "c#", ".net", "php", "ruby", "scala", "r", "matlab",
  "sql", "nosql", "postgresql", "mysql", "mongodb", "redis", "oracle",
  "snowflake", "bigquery", "databricks", "spark", "hadoop", "kafka", "airflow",
  "dbt", "etl", "react", "next.js", "vue", "angular", "svelte", "node.js",
  "django", "flask", "spring", "laravel", "rails", "graphql", "rest api",
  "react native", "redux", "redux toolkit", "expo", "flutter", "swiftui",
  "monorepo", "clean architecture", "design systems", "storybook",
  "accessibility", "observability", "dynatrace", "datadog", "sentry",
  "web performance", "core web vitals", "responsive design", "tailwind",
  "unit testing", "e2e testing", "jest", "cypress", "playwright",
  "microservices", "docker", "kubernetes", "terraform", "ansible", "jenkins",
  "github actions", "ci/cd", "aws", "azure", "gcp", "linux", "bash",
  "machine learning", "deep learning", "nlp", "computer vision", "tensorflow",
  "pytorch", "scikit-learn", "pandas", "numpy", "tableau", "power bi", "looker",
  "figma", "sketch", "adobe xd", "photoshop", "illustrator", "after effects",
  "salesforce", "hubspot", "sap", "oracle erp", "workday", "servicenow",
  "jira", "confluence", "agile", "scrum", "kanban", "safe", "prince2", "pmp",
  "itil", "six sigma", "lean", "iso 9001", "ifrs", "gaap", "sox", "cpa",
  "financial modeling", "valuation", "budgeting", "forecasting", "audit",
  "risk management", "compliance", "aml", "kyc", "basel",
  "seo", "sem", "google ads", "meta ads", "google analytics", "ga4", "crm",
  "content marketing", "brand strategy", "market research", "a/b testing",
  "supply chain", "procurement", "logistics", "inventory management", "wms",
  "erp", "mrp", "autocad", "solidworks", "revit", "primavera", "hse", "osha",
  "recruitment", "talent acquisition", "payroll", "hris", "employee relations",
];

/** Words that indicate seniority / ownership / scope. */
export const SENIORITY_TERMS = {
  executive: [
    "chief", "ceo", "cto", "cfo", "coo", "president", "vice president", "vp",
    "managing director", "partner", "board", "الرئيس التنفيذي", "نائب الرئيس",
    "العضو المنتدب", "المدير العام",
  ],
  leadership: [
    "head of", "director", "manager", "lead", "principal", "supervisor",
    "team lead", "department head", "مدير", "رئيس قسم", "قائد فريق", "مشرف",
    "رئيس",
  ],
  senior: [
    "senior", "sr.", "staff", "specialist", "consultant", "expert", "أول",
    "أخصائي", "استشاري", "خبير",
  ],
  entry: [
    "junior", "jr.", "intern", "trainee", "graduate", "assistant", "entry",
    "متدرب", "مبتدئ", "مساعد", "خريج",
  ],
} as const;

export const OWNERSHIP_TERMS = [
  "owned", "accountable", "p&l", "budget", "roadmap", "strategy", "stakeholder",
  "cross-functional", "end-to-end", "company-wide", "organization-wide",
  "board-level", "governance", "led a team", "managed a team", "direct reports",
  "مسؤولية كاملة", "الميزانية", "الاستراتيجية", "أصحاب المصلحة",
  "متعدد الوظائف", "على مستوى الشركة", "فريق مكوّن من", "تقارير مباشرة",
];

export const BUSINESS_IMPACT_TERMS = [
  "revenue", "profit", "margin", "cost", "savings", "roi", "growth",
  "retention", "churn", "conversion", "efficiency", "productivity", "uptime",
  "sla", "customer satisfaction", "nps", "market share", "throughput",
  "الإيرادات", "الأرباح", "التكاليف", "التوفير", "العائد", "النمو",
  "الاحتفاظ", "التحويل", "الكفاءة", "الإنتاجية", "رضا العملاء", "الحصة السوقية",
];

/** Tokens that never count as meaningful job-match keywords. */
export const STOPWORDS = new Set<string>([
  "of", "in", "on", "to", "at", "by", "as", "or", "an", "is", "be", "it",
  "we", "us", "its", "his", "her", "him", "she", "he", "do", "does", "did",
  "up", "out", "off", "via", "per", "if", "so", "no", "yes", "may", "each",
  "both", "own", "same", "very", "just", "only", "some", "many", "much",
  "using", "use", "used", "within", "across", "including", "include",
  "the", "and", "for", "with", "you", "your", "our", "are", "will", "have",
  "has", "this", "that", "from", "they", "their", "them", "who", "what",
  "when", "where", "which", "would", "should", "could", "can", "all", "any",
  "not", "but", "was", "were", "been", "being", "into", "over", "under",
  "more", "most", "other", "such", "than", "then", "there", "these", "those",
  "about", "also", "role", "job", "work", "working", "team", "teams",
  "company", "position", "candidate", "candidates", "opportunity", "join",
  "looking", "seeking", "required", "requirements", "responsibilities",
  "qualifications", "preferred", "plus", "must", "years", "year", "ability",
  "strong", "good", "excellent", "well", "new", "one", "two", "three",
  "في", "من", "على", "إلى", "عن", "مع", "أن", "أو", "التي", "الذي", "هذا",
  "هذه", "ذلك", "كل", "بعض", "قد", "لا", "ما", "هو", "هي", "كان", "يكون",
  "لدى", "عند", "بين", "خلال", "بعد", "قبل", "حول", "وظيفة", "الوظيفة",
  "العمل", "الشركة", "المتطلبات", "المهام", "المؤهلات", "سنوات", "خبرة",
]);

export const MONTHS = [
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct",
  "nov", "dec",
  "يناير", "فبراير", "مارس", "أبريل", "ابريل", "مايو", "يونيو", "يوليو",
  "أغسطس", "اغسطس", "سبتمبر", "أكتوبر", "اكتوبر", "نوفمبر", "ديسمبر",
  "محرم", "صفر", "ربيع", "جمادى", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة",
  "ذو الحجة",
];

export const PRESENT_TERMS = [
  "present", "current", "now", "to date", "ongoing",
  "حتى الآن", "الحالي", "حاليا", "حالياً", "مستمر", "إلى الآن",
];
