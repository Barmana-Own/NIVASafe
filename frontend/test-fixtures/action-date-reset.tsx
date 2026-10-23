import { useState } from "react";
import { createRoot } from "react-dom/client";
import { set } from "idb-keyval";
import { LocalizedDateInput } from "../src/components/UI";
import { AutoSaveForm } from "../src/forms/AutoSaveForm";
import { LocaleProvider } from "../src/i18n";
import "../src/styles.css";

localStorage.setItem("nivasafe-locale", "en");
const draftKey = "nivasafe-test-action-date-delayed";
await set(draftKey, { dueDate: "2026-11-16" });
const originalGet = IDBObjectStore.prototype.get;
IDBObjectStore.prototype.get = function (query) {
  const request = originalGet.call(this, query);
  if (query === draftKey) {
    let delayed = false;
    request.addEventListener("success", (event) => {
      if (delayed) return;
      delayed = true;
      event.stopImmediatePropagation();
      window.setTimeout(() => request.dispatchEvent(new Event("success")), 700);
    });
  }
  return request;
};

function DateContractFixture() {
  const [revision, setRevision] = useState(0);
  const [mounted, setMounted] = useState(true);
  return <main style={{ padding: 24, maxWidth: 700 }}>
    <button type="button" onClick={() => setRevision((value) => value + 1)}>Rerender parent {revision}</button>
    <button type="button" onClick={() => setMounted(false)}>Unmount controls</button>
    {mounted && <>
      <form id="initial-date"><LocalizedDateInput name="dueDate" defaultValue="2026-10-20"/><button type="reset">Reset initial date</button></form>
      <AutoSaveForm id="delayed-date" storageKey={draftKey}><LocalizedDateInput name="dueDate"/><button type="reset">Reset empty date</button></AutoSaveForm>
    </>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<LocaleProvider><DateContractFixture/></LocaleProvider>);
