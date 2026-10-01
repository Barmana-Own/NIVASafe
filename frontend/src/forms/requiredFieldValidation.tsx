import { useEffect } from "react";

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const requiredErrorAttribute = "data-required-error";
const requiredAriaInvalidAttribute = "data-required-aria-invalid";

function isFormControl(element: Element): element is FormControl {
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
}

function visibleValidationTarget(control: FormControl): HTMLElement {
  if (control.getAttribute("aria-hidden") === "true") {
    const trigger = control.closest(".styled-select")?.querySelector<HTMLElement>(".styled-select-trigger");
    if (trigger) return trigger;
  }
  return control;
}

function hasRequiredControl(form: HTMLFormElement): boolean {
  return Array.from(form.elements).some((element) => isFormControl(element) && element.required);
}

function missingRequiredControls(form: HTMLFormElement): FormControl[] {
  return Array.from(form.elements).filter(isFormControl).filter((element) => element.required && element.willValidate && element.validity.valueMissing);
}

/** Focus and bring the first invalid control into view without hiding it behind a sticky header. */
export function focusAndScrollToFirstInvalid(form: HTMLFormElement | null): HTMLElement | null {
  if (!form) return null;
  const invalid = Array.from(form.elements).find((element): element is FormControl => {
    if (!isFormControl(element)) return false;
    return element.getAttribute("aria-invalid") === "true" || (element.willValidate && !element.validity.valid);
  });
  if (!invalid) return null;
  const target = visibleValidationTarget(invalid);
  target.focus({ preventScroll: true });
  if (typeof target.scrollIntoView === "function") {
    const reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center", inline: "nearest" });
  }
  return target;
}

export function RequiredFieldValidation() {
  useEffect(() => {
    const markFormsAsCustomValidated = () => {
      document.querySelectorAll<HTMLFormElement>("form").forEach((form) => {
        if (hasRequiredControl(form)) form.noValidate = true;
      });
    };
    const onSubmit = (event: Event) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      if (event.target.dataset.validation === "custom") return;
      const missing = missingRequiredControls(event.target);
      if (!missing.length) return;
      event.preventDefault();
      event.stopPropagation();
      missing.forEach((control) => {
        control.setAttribute(requiredErrorAttribute, "true");
        if (!control.hasAttribute("aria-invalid")) {
          control.setAttribute("aria-invalid", "true");
          control.setAttribute(requiredAriaInvalidAttribute, "true");
        }
      });
      missing.forEach((control) => {
        const target = visibleValidationTarget(control);
        if (target === control) return;
        target.setAttribute(requiredErrorAttribute, "true");
        target.setAttribute("aria-invalid", "true");
        target.setAttribute(requiredAriaInvalidAttribute, "true");
      });
      focusAndScrollToFirstInvalid(event.target);
    };
    const clearRequiredError = (event: Event) => {
      if (!(event.target instanceof Element) || !isFormControl(event.target)) return;
      const control = event.target;
      if (control.getAttribute(requiredErrorAttribute) !== "true" || control.validity.valueMissing) return;
      control.removeAttribute(requiredErrorAttribute);
      if (control.getAttribute(requiredAriaInvalidAttribute) === "true") {
        control.removeAttribute("aria-invalid");
        control.removeAttribute(requiredAriaInvalidAttribute);
      }
      const target = visibleValidationTarget(control);
      if (target !== control && target.getAttribute(requiredAriaInvalidAttribute) === "true") {
        target.removeAttribute(requiredErrorAttribute);
        target.removeAttribute("aria-invalid");
        target.removeAttribute(requiredAriaInvalidAttribute);
      }
    };

    markFormsAsCustomValidated();
    const observer = new MutationObserver(markFormsAsCustomValidated);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("input", clearRequiredError, true);
    document.addEventListener("change", clearRequiredError, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("input", clearRequiredError, true);
      document.removeEventListener("change", clearRequiredError, true);
    };
  }, []);
  return null;
}
