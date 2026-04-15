export type TranslationId = 'web' | 'kjv' | 'asv';

export interface Translation {
  id: TranslationId;
  name: string;
  fullName: string;
  year: number;
  description: string;
}

export const TRANSLATIONS: Translation[] = [
  {
    id: 'web',
    name: 'WEB',
    fullName: 'World English Bible',
    year: 2000,
    description: 'Modern English, public domain',
  },
  {
    id: 'kjv',
    name: 'KJV',
    fullName: 'King James Version',
    year: 1611,
    description: 'Traditional, public domain',
  },
  {
    id: 'asv',
    name: 'ASV',
    fullName: 'American Standard Version',
    year: 1901,
    description: 'Literal, public domain',
  },
];

export const DEFAULT_TRANSLATION: TranslationId = 'web';
