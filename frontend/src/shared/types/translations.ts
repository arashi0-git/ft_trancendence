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
