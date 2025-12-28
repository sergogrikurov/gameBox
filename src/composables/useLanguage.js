import { ref } from "vue";

const language = ref(null);

export function useLanguage() {
  if (!language.value) {
    const saved = localStorage.getItem("language");
    if (saved) {
      language.value = saved;
    }
  }

  function setLanguage(lang) {
    language.value = lang;
    localStorage.setItem("language", lang);
  }

  return {
    language,
    setLanguage,
  };
}
