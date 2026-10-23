import fs from "node:fs";
import assert from "node:assert/strict";
const root = "C:/NIVASafe/scripts/releases", task = "sidebar-disclosures-20261022-01";
let source = fs.readFileSync(`${root}/admin-support-dedup-20261022-01/validate.mjs`, "utf8");
const oldTests = '"src/features/admin/adminWorkspace.test.tsx", "src/features/support/supportWorkspace.test.tsx", "src/features/support/supportModel.test.ts"';
assert(source.includes(oldTests));
source = source.replace(oldTests, '"src/layout", "src/features/assessments/assessmentMethods.test.tsx"').replace("frontend-support-admin-tests", "frontend-navigation-tests");
fs.writeFileSync(`${root}/${task}/validate.mjs`, source, { flag: "wx" });
