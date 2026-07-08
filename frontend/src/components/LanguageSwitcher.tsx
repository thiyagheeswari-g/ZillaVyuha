import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, COUNTRY_FLAG } from "../i18n/languageConfig";
import "./LanguageSwitcher.css";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(o => o.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("zv_lang", code);
    setOpen(false);
  };

  return (
    <div className="lang-switcher" ref={ref}>
      <button className="lang-pill" onClick={() => setOpen(!open)}>
        <span className="lang-flag">{COUNTRY_FLAG}</span>
        <span className="lang-code">{current.label}</span>
        <span className="lang-caret">▾</span>
      </button>

      {open && (
        <div className="lang-dropdown">
          <div className="lang-group-header">
            <span>{COUNTRY_FLAG}</span> India
          </div>
          {LANGUAGES.map((opt) => (
            <button
              key={opt.code}
              className={`lang-option ${opt.code === i18n.language ? "active" : ""}`}
              onClick={() => changeLanguage(opt.code)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
