import { type Language, type Difficulty, type Tone, type VocabFocus } from './types';

export const LANGUAGES: Language[] = [
    { name: 'Italian', code: 'it' },
    { name: 'French', code: 'fr' },
    { name: 'Spanish', code: 'es' },
    { name: 'German', code: 'de' },
    { name: 'Portuguese', code: 'pt' },
    { name: 'Japanese', code: 'ja' },
    { name: 'Korean', code: 'ko' },
    { name: 'Mandarin Chinese', code: 'zh', ttsCode: 'zh-cmn' },
];

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
    { id: 'A1', label: 'Beginner (A1)' },
    { id: 'A2', label: 'Elementary (A2)' },
    { id: 'B1', label: 'Intermediate (B1)' },
    { id: 'B2', label: 'Upper-Intermediate (B2)' },
];

export const TONES: { id: Tone; label: string }[] = [
    { id: 'childrens-story', label: "Children's Story" },
    { id: 'daily-conversation', label: 'Daily Conversation' },
    { id: 'news-style', label: 'News Style' },
    { id: 'fairy-tale', label: 'Fairy Tale' },
];

export const VOCAB_FOCUSES: { id: VocabFocus; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'travel', label: 'Travel' },
    { id: 'food', label: 'Food' },
    { id: 'work', label: 'Work' },
    { id: 'verbs', label: 'Verbs' },
];
