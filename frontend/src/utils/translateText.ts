import i18n from "../i18n/i18n";

export async function translateDynamicText(text: string, targetLang: string = i18n.language) {
  if (targetLang === 'en-IN' || targetLang === 'en') {
    return text; // No translation needed
  }

  try {
    // We mock the translation API here as instructed if an actual API isn't available.
    // Replace with Google Cloud Translation or LibreTranslate URL.
    console.log(`[Mock Translate] Translating to ${targetLang}: ${text}`);
    
    // For the sake of the test, we append a mock suffix to verify it's working
    // In production, this would be an actual fetch request:
    /*
    const res = await fetch("https://translation-api.example.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target: targetLang }),
    });
    const data = await res.json();
    return data.translatedText;
    */
   
    return text;
  } catch (error) {
    console.error("Translation API failed", error);
    return text; // Fallback to original text
  }
}
