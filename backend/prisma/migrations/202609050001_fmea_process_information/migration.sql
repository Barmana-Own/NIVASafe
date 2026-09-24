-- Add the searchable FMEA job bank and persist the user-confirmed process information.
CREATE TABLE `JobCatalog` (
  `id` VARCHAR(36) NOT NULL,
  `organizationId` VARCHAR(36) NULL,
  `titleFa` VARCHAR(191) NOT NULL,
  `titleEn` VARCHAR(191) NOT NULL,
  `keywords` JSON NULL,
  `departmentFa` VARCHAR(191) NULL,
  `departmentEn` VARCHAR(191) NULL,
  `descriptionFa` TEXT NULL,
  `descriptionEn` TEXT NULL,
  `equipment` JSON NOT NULL,
  `materials` JSON NOT NULL,
  `controls` JSON NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `JobCatalog_organizationId_active_idx` (`organizationId`, `active`),
  KEY `JobCatalog_titleFa_idx` (`titleFa`),
  KEY `JobCatalog_titleEn_idx` (`titleEn`),
  CONSTRAINT `JobCatalog_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `FmeaAssessment`
  ADD COLUMN `jobCatalogId` VARCHAR(36) NULL,
  ADD COLUMN `department` VARCHAR(191) NULL,
  ADD COLUMN `activityDescription` TEXT NULL,
  ADD COLUMN `equipment` JSON NULL,
  ADD COLUMN `materials` JSON NULL,
  ADD COLUMN `existingControls` JSON NULL,
  ADD COLUMN `specialConditions` TEXT NULL,
  ADD KEY `FmeaAssessment_jobCatalogId_idx` (`jobCatalogId`),
  ADD CONSTRAINT `FmeaAssessment_jobCatalogId_fkey` FOREIGN KEY (`jobCatalogId`) REFERENCES `JobCatalog` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- A small global catalog is available immediately after migration; organizations can add their own entries later.
INSERT INTO `JobCatalog` (`id`, `organizationId`, `titleFa`, `titleEn`, `keywords`, `departmentFa`, `departmentEn`, `descriptionFa`, `descriptionEn`, `equipment`, `materials`, `controls`, `active`, `createdAt`, `updatedAt`) VALUES
  ('9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b101', NULL, 'اپراتور خط مونتاژ', 'Assembly line operator', '["مونتاژ","اپراتور","خط تولید","assembly","operator"]', 'تولید و مونتاژ', 'Production and assembly', 'انجام عملیات مونتاژ و کنترل اولیه قطعات در ایستگاه کاری.', 'Assembly and initial inspection of parts at a work station.', '["میز مونتاژ","ابزار دستی","دستگاه پیچ‌بند","جرثقیل سقفی"]', '["قطعات تولیدی","پیچ و مهره","روغن روانکار","مواد بسته‌بندی"]', '["آموزش کار ایمن","محافظ دستگاه","بازرسی روزانه ابزار","تجهیزات حفاظت فردی"]', TRUE, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b102', NULL, 'اپراتور ماشین‌آلات', 'Machine operator', '["ماشین","اپراتور دستگاه","تولید","machine","operator"]', 'تولید', 'Production', 'راه‌اندازی، تنظیم و پایش ماشین‌آلات تولیدی طبق دستورالعمل کار.', 'Set up, operate, and monitor production machinery according to work instructions.', '["ماشین‌آلات تولیدی","تابلو برق","ابزار اندازه‌گیری","لیفتراک"]', '["مواد اولیه","روغن و گریس","قطعات یدکی","مواد شوینده"]', '["قفل و برچسب‌گذاری","محافظ ثابت و متحرک","دستورالعمل بهره‌برداری","بازرسی و نگهداری پیشگیرانه"]', TRUE, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b103', NULL, 'جوشکار', 'Welder', '["جوشکاری","جوشکار","برشکاری","welding","welder"]', 'ساخت و تعمیرات', 'Fabrication and maintenance', 'اجرای عملیات جوشکاری و برشکاری قطعات فلزی در محل تعیین‌شده.', 'Perform welding and cutting operations on metal parts in a designated work area.', '["دستگاه جوش","سنگ فرز","کپسول گاز","تهویه موضعی"]', '["الکترود","گاز محافظ","قطعات فلزی","مواد ضد پاشش"]', '["مجوز کار گرم","پرده جوشکاری","بازرسی کابل و کپسول","تهویه و تجهیزات حفاظت فردی"]', TRUE, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('9d8d5ed7-2f51-4dbb-9f8b-6d2d36b7b104', NULL, 'کاربر انبار و جابه‌جایی دستی', 'Warehouse and material handler', '["انبار","حمل دستی","بارگیری","warehouse","material handling"]', 'انبار و لجستیک', 'Warehouse and logistics', 'دریافت، چیدمان، برداشت و جابه‌جایی مواد و کالا در انبار.', 'Receive, store, pick, and move materials and goods in the warehouse.', '["قفسه انبار","ترولی","لیفتراک","ترازو"]', '["کالا و مواد اولیه","پالت","بسته‌بندی","مواد شوینده"]', '["مسیر تردد مشخص","آموزش حمل دستی","ظرفیت‌گذاری قفسه","بازرسی لیفتراک و نظم انبار"]', TRUE, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
