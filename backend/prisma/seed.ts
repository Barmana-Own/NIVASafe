import { GlobalRole, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateRpn, calculateRula, riskLevel } from "@nivasafe/domain";
const db = new PrismaClient();

const catalogJob = (id: string, titleFa: string, titleEn: string, keywords: string[], departmentFa: string, departmentEn: string) => ({
  id,
  titleFa,
  titleEn,
  keywords,
  departmentFa,
  departmentEn,
  descriptionFa: null,
  descriptionEn: null,
  equipment: [],
  materials: [],
  controls: [],
  active: true,
});

const catalogProcess = (id: string, titleFa: string, titleEn: string, keywords: string[], departmentFa: string, departmentEn: string) => ({
  ...catalogJob(id, titleFa, titleEn, keywords, departmentFa, departmentEn),
  descriptionFa: `اجرای ایمن فرایند ${titleFa} طبق دستورالعمل مصوب و الزامات HSE.`,
  descriptionEn: `Perform ${titleEn} safely according to approved work instructions and HSE requirements.`,
  equipment: ["تجهیزات فرایند", "ابزار دستی", "تجهیزات اندازه‌گیری"],
  materials: ["مواد اولیه", "مواد مصرفی", "محصول یا قطعات"],
  controls: ["دستورالعمل کار ایمن", "بازرسی پیش از کار", "آموزش و تجهیزات حفاظت فردی"],
});

const starterGlobalJobCatalog = [
  { id: "9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b101", titleFa: "اپراتور خط مونتاژ", titleEn: "Assembly line operator", keywords: ["مونتاژ", "اپراتور", "خط تولید", "assembly", "operator"], departmentFa: "تولید و مونتاژ", departmentEn: "Production and assembly", descriptionFa: "انجام عملیات مونتاژ و کنترل اولیه قطعات در ایستگاه کاری.", descriptionEn: "Assembly and initial inspection of parts at a work station.", equipment: ["میز مونتاژ", "ابزار دستی", "دستگاه پیچ‌بند", "جرثقیل سقفی"], materials: ["قطعات تولیدی", "پیچ و مهره", "روغن روانکار", "مواد بسته‌بندی"], controls: ["آموزش کار ایمن", "محافظ دستگاه", "بازرسی روزانه ابزار", "تجهیزات حفاظت فردی"] },
  { id: "9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b102", titleFa: "اپراتور ماشین‌آلات", titleEn: "Machine operator", keywords: ["ماشین", "اپراتور دستگاه", "تولید", "machine", "operator"], departmentFa: "تولید", departmentEn: "Production", descriptionFa: "راه‌اندازی، تنظیم و پایش ماشین‌آلات تولیدی طبق دستورالعمل کار.", descriptionEn: "Set up, operate, and monitor production machinery according to work instructions.", equipment: ["ماشین‌آلات تولیدی", "تابلو برق", "ابزار اندازه‌گیری", "لیفتراک"], materials: ["مواد اولیه", "روغن و گریس", "قطعات یدکی", "مواد شوینده"], controls: ["قفل و برچسب‌گذاری", "محافظ ثابت و متحرک", "دستورالعمل بهره‌برداری", "بازرسی و نگهداری پیشگیرانه"] },
  { id: "9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b103", titleFa: "جوشکار", titleEn: "Welder", keywords: ["جوشکاری", "جوشکار", "برشکاری", "welding", "welder"], departmentFa: "ساخت و تعمیرات", departmentEn: "Fabrication and maintenance", descriptionFa: "اجرای عملیات جوشکاری و برشکاری قطعات فلزی در محل تعیین‌شده.", descriptionEn: "Perform welding and cutting operations on metal parts in a designated work area.", equipment: ["دستگاه جوش", "سنگ فرز", "کپسول گاز", "تهویه موضعی"], materials: ["الکترود", "گاز محافظ", "قطعات فلزی", "مواد ضد پاشش"], controls: ["مجوز کار گرم", "پرده جوشکاری", "بازرسی کابل و کپسول", "تهویه و تجهیزات حفاظت فردی"] },
  { id: "9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b104", titleFa: "کاربر انبار و جابه‌جایی دستی", titleEn: "Warehouse and material handler", keywords: ["انبار", "حمل دستی", "بارگیری", "warehouse", "material handling"], departmentFa: "انبار و لجستیک", departmentEn: "Warehouse and logistics", descriptionFa: "دریافت، چیدمان، برداشت و جابه‌جایی مواد و کالا در انبار.", descriptionEn: "Receive, store, pick, and move materials and goods in the warehouse.", equipment: ["قفسه انبار", "ترولی", "لیفتراک", "ترازو"], materials: ["کالا و مواد اولیه", "پالت", "بسته‌بندی", "مواد شوینده"], controls: ["مسیر تردد مشخص", "آموزش حمل دستی", "ظرفیت‌گذاری قفسه", "بازرسی لیفتراک و نظم انبار"] },
] as const;

const additionalGlobalJobCatalog = [
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b201", "کارشناس ایمنی و بهداشت حرفه‌ای", "HSE officer", ["ایمنی", "بهداشت حرفه‌ای", "HSE", "safety"], "ایمنی و بهداشت", "HSE"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b202", "مسئول ایمنی کارگاه", "Site safety officer", ["ایمنی کارگاه", "کارگاه", "ناظر ایمنی", "site safety"], "ایمنی کارگاه", "Site safety"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b203", "بازرس ایمنی", "Safety inspector", ["بازرسی ایمنی", "بازرس", "inspection"], "ایمنی و بهداشت", "HSE"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b204", "کارشناس بهداشت حرفه‌ای", "Occupational health specialist", ["بهداشت", "پایش عوامل زیان‌آور", "occupational health"], "بهداشت حرفه‌ای", "Occupational health"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b205", "کارشناس محیط زیست", "Environmental specialist", ["محیط زیست", "پسماند", "environment"], "محیط زیست", "Environment"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b206", "کارشناس کنترل کیفیت", "Quality control specialist", ["کنترل کیفیت", "کیفیت", "QC", "quality"], "کنترل کیفیت", "Quality control"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b207", "اپراتور دستگاه CNC", "CNC machine operator", ["CNC", "ماشین‌کاری", "تراشکاری", "cnc"], "تولید و ماشین‌کاری", "Production and machining"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b208", "اپراتور دستگاه پرس", "Press machine operator", ["پرس", "پرسکاری", "press"], "تولید", "Production"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b209", "اپراتور دستگاه برش", "Cutting machine operator", ["برش", "دستگاه برش", "cutting"], "تولید", "Production"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b210", "اپراتور بسته‌بندی", "Packaging operator", ["بسته‌بندی", "بسته بندی", "packaging"], "تولید و بسته‌بندی", "Production and packaging"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b211", "اپراتور دیگ بخار", "Boiler operator", ["دیگ بخار", "بویلر", "boiler"], "تاسیسات", "Utilities"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b212", "اپراتور تصفیه‌خانه", "Treatment plant operator", ["تصفیه‌خانه", "تصفیه خانه", "آب و فاضلاب", "treatment plant"], "تاسیسات و محیط زیست", "Utilities and environment"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b213", "تعمیرکار مکانیک", "Mechanical maintenance technician", ["تعمیرات مکانیک", "مکانیک", "maintenance", "mechanical"], "تعمیرات و نگهداری", "Maintenance"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b214", "تکنسین برق صنعتی", "Industrial electrician", ["برق صنعتی", "تکنسین برق", "electrical"], "تعمیرات برق", "Electrical maintenance"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b215", "تکنسین ابزار دقیق", "Instrumentation technician", ["ابزار دقیق", "کنترل", "instrumentation"], "ابزار دقیق و کنترل", "Instrumentation and control"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b216", "تکنسین تاسیسات", "Utilities technician", ["تاسیسات", "موتورخانه", "utilities"], "تاسیسات", "Utilities"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b217", "اپراتور جرثقیل سقفی", "Overhead crane operator", ["جرثقیل", "جرثقیل سقفی", "crane"], "حمل و جابه‌جایی", "Material handling"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b218", "راننده لیفتراک", "Forklift operator", ["لیفتراک", "راننده لیفتراک", "forklift"], "انبار و لجستیک", "Warehouse and logistics"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b219", "راننده کامیون", "Truck driver", ["کامیون", "راننده", "حمل جاده‌ای", "truck driver"], "حمل و نقل", "Transportation"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b220", "مسئول بارگیری و تخلیه", "Loading and unloading operator", ["بارگیری", "تخلیه", "loading", "unloading"], "انبار و لجستیک", "Warehouse and logistics"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b221", "کارگر انبار", "Warehouse worker", ["انبار", "چیدمان", "warehouse"], "انبار", "Warehouse"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b222", "کارگر حمل دستی", "Manual material handler", ["حمل دستی", "بلند کردن بار", "manual handling"], "انبار و لجستیک", "Warehouse and logistics"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b223", "نقاش صنعتی", "Industrial painter", ["نقاشی صنعتی", "رنگ‌کاری", "رنگ کاری", "painting"], "رنگ و پوشش", "Painting and coating"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b224", "کار با مواد شیمیایی", "Chemical handling operator", ["مواد شیمیایی", "مواد خطرناک", "chemical"], "تولید و آزمایشگاه", "Production and laboratory"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b225", "کار در ارتفاع", "Work at height", ["ارتفاع", "داربست", "سقف", "work at height"], "پروژه و نصب", "Projects and installation"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b226", "نصب اسکلت فلزی", "Steel structure installation", ["اسکلت فلزی", "نصب سازه", "steel structure"], "اجرای پروژه", "Project execution"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b227", "عملیات بتن‌ریزی", "Concrete placement", ["بتن‌ریزی", "بتن ریزی", "قالب‌بندی", "concrete"], "اجرای پروژه", "Project execution"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b228", "عملیات خاکبرداری و گودبرداری", "Excavation and earthworks", ["خاکبرداری", "گودبرداری", "حفاری", "excavation"], "عمرانی و راه‌سازی", "Civil and road construction"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b229", "تعمیرات و نگهداری", "Maintenance operations", ["تعمیرات", "نگهداری", "تعمیر و نگهداری", "maintenance"], "تعمیرات و نگهداری", "Maintenance"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b230", "کارشناس آزمایشگاه", "Laboratory technician", ["آزمایشگاه", "نمونه‌برداری", "laboratory"], "آزمایشگاه", "Laboratory"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b231", "نظافت صنعتی", "Industrial cleaning operator", ["نظافت صنعتی", "شست‌وشو", "industrial cleaning"], "خدمات", "Services"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b232", "نگهبان", "Security guard", ["نگهبانی", "حفاظت", "security"], "حفاظت فیزیکی", "Security"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b233", "کارگر خدمات", "Facility services worker", ["خدمات", "نظافت", "facility services"], "خدمات", "Facilities"),
  catalogJob("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b234", "کارگر کشاورزی", "Agricultural worker", ["کشاورزی", "سم‌پاشی", "agriculture"], "کشاورزی", "Agriculture"),
] as const;

const additionalGlobalProcessCatalog = [
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b301", "بازرسی و کنترل کیفیت محصول", "Product inspection and quality control", ["بازرسی محصول", "کنترل کیفیت", "کیفیت", "product inspection", "quality"], "کنترل کیفیت", "Quality control"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b302", "راه‌اندازی و تنظیم ماشین‌آلات", "Machine setup and adjustment", ["راه‌اندازی", "تنظیم دستگاه", "ماشین‌آلات", "machine setup"], "تولید", "Production"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b303", "تعویض قالب و ابزار", "Mold and tool changeover", ["تعویض قالب", "تعویض ابزار", "changeover", "tool change"], "تولید و تعمیرات", "Production and maintenance"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b304", "دریافت و انبارش مواد اولیه", "Receiving and storing raw materials", ["دریافت مواد", "انبارش", "مواد اولیه", "raw material storage"], "انبار و لجستیک", "Warehouse and logistics"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b305", "بارگیری و تخلیه مواد", "Material loading and unloading", ["بارگیری", "تخلیه", "حمل مواد", "loading", "unloading"], "انبار و لجستیک", "Warehouse and logistics"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b306", "بسته‌بندی و برچسب‌گذاری محصول", "Product packaging and labeling", ["بسته‌بندی", "برچسب‌گذاری", "محصول", "packaging", "labeling"], "تولید و بسته‌بندی", "Production and packaging"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b307", "نگهداری پیشگیرانه تجهیزات", "Preventive equipment maintenance", ["نگهداری پیشگیرانه", "سرویس دوره‌ای", "تعمیرات", "preventive maintenance"], "تعمیرات و نگهداری", "Maintenance"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b308", "تعمیرات برق صنعتی", "Industrial electrical maintenance", ["تعمیرات برق", "برق صنعتی", "تابلو برق", "electrical maintenance"], "تعمیرات برق", "Electrical maintenance"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b309", "تعمیرات مکانیکی تجهیزات", "Mechanical equipment maintenance", ["تعمیرات مکانیکی", "مکانیک", "ماشین‌آلات", "mechanical maintenance"], "تعمیرات مکانیک", "Mechanical maintenance"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b310", "نظافت و شست‌وشوی صنعتی", "Industrial cleaning and washing", ["نظافت صنعتی", "شست‌وشو", "مواد شوینده", "industrial cleaning"], "خدمات", "Facilities"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b311", "نمونه‌برداری و آزمون آزمایشگاهی", "Sampling and laboratory testing", ["نمونه‌برداری", "آزمایشگاه", "آزمون", "laboratory testing"], "آزمایشگاه", "Laboratory"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b312", "حمل‌ونقل داخلی مواد", "Internal material transportation", ["حمل داخلی", "جابه‌جایی مواد", "لجستیک", "internal transport"], "حمل و لجستیک", "Material handling and logistics"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b313", "عملیات لیفتراک", "Forklift operations", ["لیفتراک", "باربرداری", "انبار", "forklift operations"], "انبار و لجستیک", "Warehouse and logistics"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b314", "جابه‌جایی دستی بار", "Manual material handling", ["حمل دستی", "بلند کردن بار", "ارگونومی", "manual handling"], "انبار و لجستیک", "Warehouse and logistics"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b315", "جوشکاری و برشکاری", "Welding and cutting", ["جوشکاری", "برشکاری", "کار گرم", "welding", "cutting"], "ساخت و تعمیرات", "Fabrication and maintenance"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b316", "رنگ‌آمیزی و پوشش‌دهی", "Painting and coating", ["رنگ‌آمیزی", "پوشش‌دهی", "رنگ صنعتی", "painting", "coating"], "رنگ و پوشش", "Painting and coating"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b317", "نصب تجهیزات و راه‌اندازی", "Equipment installation and commissioning", ["نصب تجهیزات", "راه‌اندازی", "commissioning", "installation"], "پروژه و نصب", "Projects and installation"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b318", "کار با مواد شیمیایی", "Chemical handling", ["مواد شیمیایی", "مواد خطرناک", "آزمایشگاه", "chemical handling"], "تولید و آزمایشگاه", "Production and laboratory"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b319", "بهره‌برداری از موتورخانه", "Boiler and utility room operation", ["موتورخانه", "دیگ بخار", "تاسیسات", "utility room"], "تاسیسات", "Utilities"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b320", "پایش عوامل زیان‌آور محیط کار", "Occupational exposure monitoring", ["عوامل زیان‌آور", "پایش محیط کار", "بهداشت حرفه‌ای", "exposure monitoring"], "بهداشت حرفه‌ای", "Occupational health"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b321", "ارزیابی ریسک و بازرسی HSE", "HSE risk assessment and inspection", ["ارزیابی ریسک", "بازرسی HSE", "ایمنی", "risk assessment", "HSE inspection"], "ایمنی و بهداشت", "HSE"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b322", "مدیریت پسماند", "Waste management", ["پسماند", "تفکیک زباله", "محیط زیست", "waste management"], "محیط زیست", "Environment"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b323", "کنترل تردد و نگهبانی", "Access control and security", ["کنترل تردد", "نگهبانی", "حفاظت", "access control", "security"], "حفاظت فیزیکی", "Security"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b324", "فعالیت اداری و کار با رایانه", "Office and computer work", ["کار اداری", "رایانه", "دفتر", "office work", "computer work"], "اداری", "Administration"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b325", "عملیات عمرانی و خاکبرداری", "Civil and excavation operations", ["عمرانی", "خاکبرداری", "گودبرداری", "civil", "excavation"], "عمرانی و راه‌سازی", "Civil and road construction"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b326", "بتن‌ریزی و قالب‌بندی", "Concrete pouring and formwork", ["بتن‌ریزی", "قالب‌بندی", "ساختمان", "concrete", "formwork"], "اجرای پروژه", "Project execution"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b327", "نصب داربست و کار در ارتفاع", "Scaffold installation and work at height", ["داربست", "کار در ارتفاع", "سقوط", "scaffold", "work at height"], "پروژه و نصب", "Projects and installation"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b328", "مدیریت ایمنی پیمانکاران", "Contractor safety management", ["پیمانکار", "ایمنی پیمانکاران", "مجوز کار", "contractor safety"], "ایمنی و بهداشت", "HSE"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b329", "امور خدمات و نظافت", "Facility services and housekeeping", ["خدمات", "نظافت", "آبدارخانه", "facility services"], "خدمات", "Facilities"),
  catalogProcess("9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b330", "کشاورزی و سم‌پاشی", "Agriculture and spraying", ["کشاورزی", "سم‌پاشی", "آفت‌کش", "agriculture", "spraying"], "کشاورزی", "Agriculture"),
] as const;

const globalJobCatalog = [...starterGlobalJobCatalog, ...additionalGlobalJobCatalog, ...additionalGlobalProcessCatalog];

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled in production");
  const passwordHash = await bcrypt.hash("Demo123!", 12);
  const definitions = [["admin@nivasafe.local", "مدیر NIVASafe", Role.ORG_ADMIN], ["assistant@nivasafe.local", "دستیار HSE", Role.ASSISTANT], ["hse@nivasafe.local", "مدیر HSE", Role.HSE_MANAGER], ["assessor@nivasafe.local", "ارزیاب", Role.ASSESSOR], ["viewer@nivasafe.local", "مشاهده‌گر", Role.VIEWER], ["superadmin@nivasafe.local", "سوپر ادمین NIVASafe", Role.SUPER_ADMIN]] as const;
  const users = await Promise.all(definitions.map(([email, displayName]) => db.user.upsert({ where: { email }, update: { displayName }, create: { email, displayName, passwordHash } })));
  await db.user.update({ where: { email: "superadmin@nivasafe.local" }, data: { globalRole: GlobalRole.SUPER_ADMIN } });
  const org = await db.organization.upsert({ where: { nationalId: "DEMO-A" }, update: {}, create: { nameFa: "شرکت ایمن‌گستر", nameEn: "Safe Growth Co.", nationalId: "DEMO-A", industry: "Manufacturing" } });
  const isolationOrg = await db.organization.upsert({ where: { nationalId: "DEMO-B" }, update: {}, create: { nameFa: "سازمان آزمایشی دوم", nameEn: "Isolation Test Org", nationalId: "DEMO-B", industry: "Construction" } });
  for (let index = 0; index < users.length; index++) await db.organizationMember.upsert({ where: { organizationId_userId: { organizationId: org.id, userId: users[index]!.id } }, update: { role: definitions[index]![2], active: true }, create: { organizationId: org.id, userId: users[index]!.id, role: definitions[index]![2] } });
  await db.organizationMember.upsert({ where: { organizationId_userId: { organizationId: isolationOrg.id, userId: users[0]!.id } }, update: { role: Role.ORG_ADMIN }, create: { organizationId: isolationOrg.id, userId: users[0]!.id, role: Role.ORG_ADMIN } });
  const permissions = ["users.read", "users.manage", "organizations.manage", "projects.read", "projects.manage", "assessments.create", "assessments.update", "assessments.delete", "assessments.approve", "reports.generate", "knowledge.manage", "ai.configure", "audit.read"];
  for (const key of permissions) await db.permission.upsert({ where: { key }, update: {}, create: { key } });
  const project = await db.project.upsert({ where: { organizationId_code: { organizationId: org.id, code: "MFG-01" } }, update: {}, create: { organizationId: org.id, name: "خط تولید نمونه", code: "MFG-01", description: "پروژه نمایشی ارزیابی ریسک" } });
  for (const job of globalJobCatalog) await db.jobCatalog.upsert({ where: { id: job.id }, update: job, create: job });
  let workProcess = await db.process.findFirst({ where: { organizationId: org.id, projectId: project.id, name: "مونتاژ" } }); workProcess ??= await db.process.create({ data: { organizationId: org.id, projectId: project.id, name: "مونتاژ", description: "فرایند مونتاژ قطعات" } });
  let activity = await db.activity.findFirst({ where: { organizationId: org.id, projectId: project.id, title: "جابه‌جایی دستی قطعات" } }); activity ??= await db.activity.create({ data: { organizationId: org.id, projectId: project.id, processId: workProcess.id, title: "جابه‌جایی دستی قطعات", jobTitle: "اپراتور مونتاژ", hazards: "ارگونومی، سقوط بار" } });
  let fmea = await db.fmeaAssessment.findFirst({ where: { organizationId: org.id, code: "FMEA-001", version: 1 } }); fmea ??= await db.fmeaAssessment.create({ data: { organizationId: org.id, projectId: project.id, activityId: activity.id, jobCatalogId: globalJobCatalog[0].id, title: "اپراتور خط مونتاژ", code: "FMEA-001", department: "تولید و مونتاژ", activityDescription: "انجام عملیات مونتاژ و کنترل اولیه قطعات در ایستگاه کاری.", equipment: globalJobCatalog[0].equipment, materials: globalJobCatalog[0].materials, existingControls: globalJobCatalog[0].controls, specialConditions: "کار در شیفت‌های مختلف در صورت نیاز.", status: "IN_PROGRESS" } });
  if (!(await db.fmeaItem.count({ where: { assessmentId: fmea.id } }))) { const rpn = calculateRpn(8, 5, 6); await db.fmeaItem.create({ data: { assessmentId: fmea.id, rowNumber: 1, processStep: "بلند کردن قطعه", failureMode: "سقوط قطعه", effect: "آسیب اندام", cause: "گرفتن نامناسب", preventiveControls: "آموزش", detectionControls: "بازرسی سرپرست", severity: 8, occurrence: 5, detection: 6, rpn, riskLevel: riskLevel(rpn), recommendation: "استفاده از ابزار بالابر" } }); }
  await db.fmeaVersion.upsert({ where: { assessmentId_version: { assessmentId: fmea.id, version: 1 } }, update: {}, create: { assessmentId: fmea.id, version: 1, snapshot: { title: fmea.title, code: fmea.code }, createdBy: users[0]!.id } });
  const inputs = { upperArm: 4, lowerArm: 3, wrist: 3, wristTwist: 2, neck: 4, trunk: 5, legs: 2, muscleUse: true, force: 2 }; const result = calculateRula(inputs);
  let rula = await db.rulaAssessment.findFirst({ where: { organizationId: org.id, title: "RULA اپراتور مونتاژ" } }); rula ??= await db.rulaAssessment.create({ data: { organizationId: org.id, projectId: project.id, activityId: activity.id, title: "RULA اپراتور مونتاژ", subjectCode: "OP-01", bodySide: "RIGHT", inputs, score: result.score, actionLevel: result.actionLevel, explanation: result.explanation, status: "APPROVED" } });
  await db.rulaVersion.upsert({ where: { assessmentId_version: { assessmentId: rula.id, version: 1 } }, update: {}, create: { assessmentId: rula.id, version: 1, snapshot: { title: rula.title, score: rula.score }, createdBy: users[0]!.id } });
  if (!(await db.correctiveAction.count({ where: { organizationId: org.id } }))) await db.correctiveAction.create({ data: { organizationId: org.id, projectId: project.id, fmeaId: fmea.id, title: "تأمین ابزار بالابر", description: "انتخاب و نصب ابزار جابه‌جایی مکانیکی", priority: "HIGH", assigneeName: "مدیر تولید", dueDate: new Date(Date.now() + 14 * 86400000) } });
  if (!(await db.knowledgeDocument.count({ where: { organizationId: org.id } }))) await db.knowledgeDocument.create({ data: { organizationId: org.id, title: "راهنمای کنترل ریسک", content: "برای کنترل ریسک ابتدا حذف خطر، سپس جایگزینی، کنترل مهندسی، کنترل اداری و تجهیزات حفاظت فردی را بررسی کنید.", tags: ["HSE", "risk"] } });
  const globalKnowledge = await db.knowledgeDocument.findFirst({ where: { isGlobal: true, title: "اصول پایه ایمنی NIVASafe", deletedAt: null } });
  if (!globalKnowledge) await db.knowledgeDocument.create({ data: { organizationId: org.id, isGlobal: true, title: "اصول پایه ایمنی NIVASafe", content: "این سند دانش پیش‌فرض همه شرکت‌هاست. در هر ارزیابی، خطر را شناسایی، ریسک را با روش استاندارد تحلیل و کنترل‌های سلسله‌مراتبی را ثبت کنید.", tags: ["NIVASafe", "HSE", "پیش‌فرض"], published: true, aiReadable: true, visibility: "ALL" } });
  if (!(await db.notification.count({ where: { organizationId: org.id, userId: users[0]!.id } }))) await db.notification.create({ data: { organizationId: org.id, userId: users[0]!.id, title: "ریسک بحرانی شناسایی شد", message: "FMEA-001 نیازمند بازبینی اقدام اصلاحی است.", link: "/fmea" } });
  console.info("Seed complete. Demo password for all accounts: Demo123!");
}
main().finally(() => db.$disconnect());
