import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enIN from "./locales/en-IN/translation.json";
import hiIN from "./locales/hi-IN/translation.json";
import taIN from "./locales/ta-IN/translation.json";
import teIN from "./locales/te-IN/translation.json";
import knIN from "./locales/kn-IN/translation.json";
import mlIN from "./locales/ml-IN/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-IN": { translation: enIN },
      "hi-IN": { translation: hiIN },
      "ta-IN": { translation: taIN },
      "te-IN": { translation: teIN },
      "kn-IN": { translation: knIN },
      "ml-IN": { translation: mlIN },
    },
    fallbackLng: "en-IN",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "zv_lang",
    },
  });

export default i18n;
