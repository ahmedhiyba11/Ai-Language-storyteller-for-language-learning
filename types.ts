// FIX: Define the Language interface and remove circular import.
export interface Language {
    name: string;
    code: string;
    ttsCode?: string;
}

export interface StorySegment {
    english: string;
    translated: string;
}

export interface Story {
    segments: StorySegment[];
    audio: string[]; // array of base64 audio data for each translated segment
}

export interface Word {
    id: number;
    text: string;
    language: Language; // The language of the word
    contextSentence: string;
    partOfSpeech: string;
    ipa: string;
    tags: string[];
}

export type Theme = 'default' | 'high-contrast';

export type Font = 'default' | 'dyslexia';

export type Difficulty = 'A1' | 'A2' | 'B1' | 'B2';

export type Tone = 'childrens-story' | 'daily-conversation' | 'news-style' | 'fairy-tale';

export type VocabFocus = 'general' | 'travel' | 'food' | 'work' | 'verbs';

export interface StoryOptions {
    difficulty: Difficulty;
    tone: Tone;
    vocabFocus: VocabFocus;
}
