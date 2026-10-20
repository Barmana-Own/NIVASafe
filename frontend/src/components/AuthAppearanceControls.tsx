import { useAppearance } from "../AppearanceProvider";
import { LanguageSwitcher, useI18n } from "../i18n";
import { ThemeSwitcher } from "./UI";

export function AuthAppearanceControls({ showLanguage = true }: { showLanguage?: boolean }) {
  const { theme, changeTheme } = useAppearance();
  const { t } = useI18n();
  return <div className="auth-appearance-controls" role="group" aria-label={t("redesign.appearance")}><ThemeSwitcher theme={theme} onChange={changeTheme}/>{showLanguage && <LanguageSwitcher className="auth-language-switch"/>}</div>;
}
