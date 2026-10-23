import fs from "node:fs";
import assert from "node:assert/strict";
const root = "C:/NIVASafe/scripts/releases", prior = "admin-directory-cards-20261022-01", task = "hide-image-authorizations-20261022-01";
for (const helper of ["prepare.mjs", "validate.mjs", "release.mjs"]) {
  let source = fs.readFileSync(`${root}/${prior}/${helper}`, "utf8");
  if (helper === "prepare.mjs") {
    assert(source.includes('task = "admin-directory-cards-20261022-01"'));
    source = source.replace('task = "admin-directory-cards-20261022-01"', `task = "${task}"`)
      .replaceAll("admin-support-dedup-20261022-01", prior)
      .replaceAll("admin-cards.css", "hide-image-authorizations.css")
      .replaceAll("/* Owner-requested three-column global admin user and membership-request cards. */", "/* Owner-requested temporary hiding of the account image authorization UI only. */");
  }
  if (helper === "release.mjs") source = source.replace("/assets/admin-directory-cards-", "/assets/hide-image-authorizations-").replaceAll('publicBytes("/admin",', 'publicBytes("/profile",');
  fs.writeFileSync(`${root}/${task}/${helper}`, source, { flag: "wx" });
}
