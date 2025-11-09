export type TranslationSection = Record<string, string>;

export interface DifficultyTranslations {
  easy?: string;
  medium?: string;
  hard?: string;
}

export interface PlayerSelectorTranslations {
  label?: string;
  selectPlaceholder?: string;
  aiOption?: string;
  customOption?: string;
  aiDifficulty?: string;
  difficulty?: DifficultyTranslations;
  customAlias?: string;
  customPlaceholder?: string;
  currentUser?: string;
  loginUserOption?: string;
  loginUserNameLabel?: string;
  aiDisplayName?: string;
  leftSideLabel?: string;
  rightSideLabel?: string;
}

export type TemplateVariables = Record<string, string | number>;

export function formatTemplate(
  template: string,
  variables: TemplateVariables,
): string {
  return Object.entries(variables).reduce(
    (acc, [key, value]) =>
      acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value)),
    template,
  );
}

export interface PasswordToggleTranslations {
  show?: string;
  hide?: string;
}

export interface RegisterFormErrorTranslations {
  required?: string;
  usernameLength?: string;
  emailInvalid?: string;
  emailExists?: string;
  passwordLength?: string;
  passwordMismatch?: string;
  usernameExists?: string;
  generic?: string;
}

export interface RegisterFormStatusTranslations {
  submitting?: string;
}

export interface RegisterFormTranslations {
  title?: string;
  usernameLabel?: string;
  usernamePlaceholder?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  passwordHelp?: string;
  confirmLabel?: string;
  confirmPlaceholder?: string;
  submit?: string;
  login?: string;
  home?: string;
  errors?: RegisterFormErrorTranslations;
  status?: RegisterFormStatusTranslations;
  passwordToggle?: PasswordToggleTranslations;
}

export interface RegisterPageTranslations {
  heading?: string;
  home?: string;
}

export interface RegisterTranslations {
  page?: RegisterPageTranslations;
  form?: RegisterFormTranslations;
}
