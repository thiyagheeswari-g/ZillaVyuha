import React, { useState, useEffect } from 'react';
import { translateDynamicText } from '../utils/translateText';
import { useTranslation } from 'react-i18next';

export const TranslatedText: React.FC<{ text: string }> = ({ text }) => {
  const { i18n } = useTranslation();
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let isMounted = true;
    const fetchTranslation = async () => {
      const result = await translateDynamicText(text, i18n.language);
      if (isMounted) setTranslated(result);
    };
    fetchTranslation();
    return () => { isMounted = false; };
  }, [text, i18n.language]);

  return <>{translated}</>;
};
