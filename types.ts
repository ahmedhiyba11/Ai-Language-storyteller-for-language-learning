export interface Language {
    name: string;
    code: string;
    ttsCode?: string; // Optional specific code for TTS if different
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
}
