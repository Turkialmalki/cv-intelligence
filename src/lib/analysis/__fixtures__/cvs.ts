/**
 * Synthetic CV fixtures used only by the test suite.
 * These are invented people — they must never be reachable from the product.
 */

export const STRONG_CV = `Sara Al-Otaibi
Riyadh, Saudi Arabia
sara.alotaibi@gmail.com | +966 55 123 4567
linkedin.com/in/saraalotaibi | github.com/saraalotaibi

Professional Summary
Supply chain manager with 9 years in FMCG distribution across the GCC.
Reduced regional logistics cost by 23% while scaling throughput to 1,400 daily
shipments. Led a team of 18 across three distribution centres.

Experience

Senior Supply Chain Manager
Almarai Company - Riyadh
Mar 2021 - Present
- Reduced regional logistics cost by 23% (SAR 4.2M annually) by renegotiating
  contracts with 14 carriers.
- Led a team of 18 across three distribution centres, cutting order-to-delivery
  time from 72 to 41 hours.
- Implemented a demand forecasting model that lowered stockouts by 31% across
  220 SKUs.
- Launched a vendor scorecard adopted company-wide, improving on-time delivery
  from 84% to 96%.

Logistics Manager
Panda Retail Company - Jeddah
Jun 2017 - Feb 2021
- Managed inbound logistics for 62 stores with an annual budget of SAR 11M.
- Automated inventory reconciliation, saving 340 staff hours per month.
- Negotiated warehousing terms that cut storage cost per pallet by 18%.

Logistics Coordinator
Aramex - Dammam
Aug 2015 - May 2017
- Coordinated 900 monthly shipments across 6 markets with 99.2% accuracy.
- Built a routing dashboard adopted by 4 regional teams.

Education

Bachelor of Science in Industrial Engineering
King Saud University - Riyadh
2011 - 2015

Skills
Supply Chain: Demand Forecasting, Inventory Management, Procurement, WMS, ERP
Analytics: SQL, Power BI, Excel Modeling, Tableau
Methods: Lean, Six Sigma, Agile, Vendor Management

Certifications
Certified Supply Chain Professional (CSCP), APICS, 2020
Lean Six Sigma Green Belt, 2018

Languages
Arabic (Native), English (Fluent)
`;

export const WEAK_CV = `Ahmed
ahmed123@hotmail.com

Objective
I am a hard working and self motivated person. I am a team player and a fast
learner. I am looking for a challenging position in a dynamic company where I
can use my skills and grow my career and contribute to the success of the
organization and develop myself professionally in a good environment.

Work
Sales
Responsible for sales activities
Worked on customer service
Helped the team

Assistant
Responsible for daily tasks
Assisted in various duties

Education
Bachelor degree

Skills
Microsoft Office, Communication, Teamwork, Leadership, Hard working
`;

/**
 * Identical to STRONG_CV in structure and wording, but with every measurable
 * figure removed. Used to prove that quantification alone moves the score.
 */
export const STRONG_CV_WITHOUT_METRICS = `Sara Al-Otaibi
Riyadh, Saudi Arabia
sara.alotaibi@gmail.com | +966 55 123 4567
linkedin.com/in/saraalotaibi | github.com/saraalotaibi

Professional Summary
Supply chain manager with extensive experience in FMCG distribution across the
GCC. Reduced regional logistics cost while scaling throughput. Led a team
across several distribution centres.

Experience

Senior Supply Chain Manager
Almarai Company - Riyadh
Mar 2021 - Present
- Reduced regional logistics cost by renegotiating contracts with carriers.
- Led a team across distribution centres, cutting order-to-delivery time.
- Implemented a demand forecasting model that lowered stockouts across SKUs.
- Launched a vendor scorecard adopted company-wide, improving on-time delivery.

Logistics Manager
Panda Retail Company - Jeddah
Jun 2017 - Feb 2021
- Managed inbound logistics for stores with a substantial annual budget.
- Automated inventory reconciliation, saving staff hours every month.
- Negotiated warehousing terms that cut storage cost per pallet.

Logistics Coordinator
Aramex - Dammam
Aug 2015 - May 2017
- Coordinated monthly shipments across markets with high accuracy.
- Built a routing dashboard adopted by regional teams.

Education

Bachelor of Science in Industrial Engineering
King Saud University - Riyadh
2011 - 2015

Skills
Supply Chain: Demand Forecasting, Inventory Management, Procurement, WMS, ERP
Analytics: SQL, Power BI, Excel Modeling, Tableau
Methods: Lean, Six Sigma, Agile, Vendor Management

Certifications
Certified Supply Chain Professional (CSCP), APICS, 2020
Lean Six Sigma Green Belt, 2018

Languages
Arabic (Native), English (Fluent)
`;

/** STRONG_CV with the entire contact block removed. */
export const STRONG_CV_WITHOUT_CONTACT = STRONG_CV.split("\n")
  .filter(
    (line) =>
      !line.includes("@") &&
      !line.includes("+966") &&
      !line.includes("linkedin.com") &&
      !line.includes("Riyadh, Saudi Arabia") &&
      line.trim() !== "Sara Al-Otaibi",
  )
  .join("\n");

export const ARABIC_CV = `فيصل الشمري
الرياض، المملكة العربية السعودية
faisal.alshammari@gmail.com | ٩٦٦٥٠١٢٣٤٥٦٧+
linkedin.com/in/faisalalshammari

الملخص المهني
مدير تسويق رقمي بخبرة ٨ سنوات في قطاع التجزئة. رفعت معدل التحويل بنسبة ٣٤٪
وخفضت تكلفة اكتساب العميل بنسبة ٢٢٪ خلال عامين. أدرت فريقًا مكوّنًا من ١٢ شخصًا.

الخبرات العملية

مدير التسويق الرقمي
شركة جرير للتسويق - الرياض
مارس ٢٠٢١ - حتى الآن
- رفعت معدل التحويل بنسبة ٣٤٪ عبر إعادة تصميم رحلة الشراء.
- خفضت تكلفة اكتساب العميل بنسبة ٢٢٪ بإعادة توزيع ميزانية ٦ مليون ريال.
- أدرت فريقًا مكوّنًا من ١٢ شخصًا عبر ٤ قنوات تسويقية.

أخصائي تسويق أول
مجموعة العثيم - جدة
يونيو ٢٠١٧ - فبراير ٢٠٢١
- أطلقت ١٤ حملة رقمية حققت عائدًا بلغ ٣.٢ ضعف الإنفاق.
- بنيت لوحة تحليلات اعتمدتها ٣ فرق إقليمية.

التعليم

بكالوريوس إدارة أعمال
جامعة الملك سعود - الرياض
٢٠١٣ - ٢٠١٧

المهارات
التسويق الرقمي: Google Ads, Meta Ads, SEO, GA4
التحليلات: SQL, Power BI, A/B Testing
الأدوات: HubSpot, Salesforce, CRM

الشهادات
شهادة Google Analytics المتقدمة، ٢٠٢٢

اللغات
العربية (اللغة الأم)، الإنجليزية (متقدم)
`;

export const JOB_DESCRIPTION_SUPPLY_CHAIN = `Senior Supply Chain Manager

We are looking for a Senior Supply Chain Manager to lead our regional
distribution operations.

Responsibilities:
- Own end-to-end supply chain planning across the GCC region
- Lead demand forecasting and inventory management for a large SKU portfolio
- Manage vendor negotiations and procurement contracts
- Drive continuous improvement using Lean and Six Sigma methodologies
- Build reporting using SQL, Power BI and Tableau

Requirements:
- 7+ years in supply chain or logistics management
- Hands-on experience with WMS and ERP systems
- Strong analytics background, SQL and Power BI required
- Lean or Six Sigma certification preferred
- Experience managing a distributed team
`;

export const JOB_DESCRIPTION_SOFTWARE = `Senior Backend Engineer

We are hiring a Senior Backend Engineer to build our payments platform.

Requirements:
- Strong Python and TypeScript experience
- Deep knowledge of PostgreSQL and Redis
- Experience with Kubernetes, Docker and Terraform on AWS
- Building microservices and GraphQL APIs
- CI/CD with GitHub Actions
`;

/** A PDF that produced almost nothing on extraction. */
export const IMAGE_BASED_TEXT = "   \n \n  ";
