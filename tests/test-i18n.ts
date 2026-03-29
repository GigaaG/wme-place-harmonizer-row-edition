import { readFileSync } from "node:fs";

import type { LocaleFile } from "../src/types/i18n.ts";
import { setRuntimeLocale } from "../src/i18n/runtime.ts";

const englishLocale = JSON.parse(
  readFileSync(
    new URL("../../wme-place-harmonizer-row-data/locales/en.json", import.meta.url),
    "utf8"
  )
) as LocaleFile;

setRuntimeLocale(englishLocale);
