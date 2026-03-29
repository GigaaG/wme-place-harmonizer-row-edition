export interface LocaleFile {
  locale: string;
  messages: Record<string, string>;
}

export type LocalizedTextList = Record<string, string[]>;
