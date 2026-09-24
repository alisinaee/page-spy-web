import { initReactI18next } from 'react-i18next';
import i18next from 'i18next';
import en from './en.json';

const resources = {
  en: {
    translation: en,
  },
} as const;

i18next.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en'],
  interpolation: {
    escapeValue: false,
  },
});

export const getTranslation = (key: string) => {
  const lang = i18next.resolvedLanguage || 'en';
  const res = i18next.getResource(lang, 'translation', key);
  return res || key;
};

export const isCN = () => false;

export default i18next;
