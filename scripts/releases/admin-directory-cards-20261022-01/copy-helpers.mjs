import fs from "node:fs";
import assert from "node:assert/strict";
const root = "C:/NIVASafe/scripts/releases", prior = "member-directory-cards-20261022-01", task = "admin-directory-cards-20261022-01";
for (const helper of ["validate.mjs", "release.mjs"]) {
  let source = fs.readFileSync(`${root}/${prior}/${helper}`, "utf8");
  if (helper === "release.mjs") { assert(source.includes("/assets/member-directory-cards-")); source = source.replace("/assets/member-directory-cards-", "/assets/admin-directory-cards-").replaceAll('publicBytes("/members",', 'publicBytes("/admin",'); }
  fs.writeFileSync(`${root}/${task}/${helper}`, source, { flag: "wx" });
}
