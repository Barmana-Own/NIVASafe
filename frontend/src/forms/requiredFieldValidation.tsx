import { useEffect } from "react";

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const requiredErrorAttribute = "data-required-error";
const requiredAriaInvalidAttribute = "data-required-aria-invalid";

function isFormControl(element: Element): element is FormControl {
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
}

function hasRequiredControl(form: HTMLFormElement): boolean {
  return Array.from(form.elements).some((element) => isFormControl(element) && element.required);
}

function missingRequiredControls(form: HTMLFormElement): FormControl[] {
  return Array.from(form.elements).filter(isFormControl).filter((element) => element.required && element.willValidate && element.validity.valueMissing);
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
      missing[0].focus();
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
