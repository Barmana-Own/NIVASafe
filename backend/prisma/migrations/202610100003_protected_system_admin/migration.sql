ALTER TABLE `User` ADD COLUMN `protectedSystemAdmin` BOOLEAN NOT NULL DEFAULT false;
UPDATE `User` SET `protectedSystemAdmin`=true WHERE `email`='admin@app.nivasafe.com' AND `globalRole`='SUPER_ADMIN';
