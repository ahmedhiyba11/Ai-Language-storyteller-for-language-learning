import { GoogleGenAI, Type, Modality } from '@google/genai';
import { type Story, type StorySegment, type Language, type StoryOptions } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const storySegmentSchema = {
    type: Type.OBJECT,
    properties: {
        english: {
            type: Type.STRING,
            description: "A single sentence of the story in English.",
        },
        translated: {
            type: Type.STRING,
            description: "The translation of that sentence in the target language.",
        },
    },
    required: ["english", "translated"],
};

const storySchema = {
    type: Type.ARRAY,
    items: storySegmentSchema,
};

const wordDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        partOfSpeech: { type: Type.STRING, description: "The part of speech of the word (e.g., Noun, Verb, Adjective)." },
        ipa: { type: Type.STRING, description: "The International Phonetic Alphabet (IPA) transcription of the word." }
    },
    required: ["partOfSpeech", "ipa"]
};


export async function textToSpeech(text: string, languageCode: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                       // Using a generic voice for broad compatibility
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            console.warn(`No audio data received from API for segment: "${text}"`);
            return "";
        }
        return base64Audio;
    } catch (error) {
        console.error(`Error with Text-to-Speech for text "${text}":`, error);
        return "";
    }
}

export async function getWordDetails(word: string, contextSentence: string, languageName: string): Promise<{ partOfSpeech: string; ipa: string; }> {
    const prompt = `Analyze the word "${word}" from the language "${languageName}". The word appears in the sentence: "${contextSentence}".
Provide the following details in a JSON object:
1. "partOfSpeech": The grammatical part of speech (e.g., Noun, Verb, Adjective).
2. "ipa": The International Phonetic Alphabet (IPA) transcription for the word.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: wordDetailsSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error getting word details:", error);
        throw new Error("Could not retrieve details for the selected word.");
    }
}


export async function generateStory(language: Language, options: StoryOptions): Promise<Story> {
    const { difficulty, tone, vocabFocus } = options;

    const toneMap = {
        'childrens-story': "a children's story",
        'daily-conversation': 'a daily conversation',
        'news-style': 'a news-style report',
        'fairy-tale': 'a fairy tale'
    };

    const focusMap = {
        'general': '',
        'travel': 'Focus on using vocabulary related to travel.',
        'food': 'Focus on using vocabulary related to food and dining.',
        'work': 'Focus on using vocabulary related to the workplace.',
        'verbs': 'Focus on using a variety of verbs.'
    };

    const prompt = `Generate a simple, 4-sentence story for a language learner at the ${difficulty} (CEFR) level. The story should be in the style of ${toneMap[tone]}. ${focusMap[vocabFocus]} For each sentence, provide the text in ${language.name} and its English translation.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: storySchema,
                temperature: 0.8,
            },
        });

        const jsonText = response.text.trim();
        const segments: StorySegment[] = JSON.parse(jsonText);
        
        if (!Array.isArray(segments) || segments.length === 0) {
            throw new Error("Invalid story format received from API.");
        }

        const languageCodeForTTS = language.ttsCode || language.code;
        const audioPromises = segments.map(segment => textToSpeech(segment.translated, languageCodeForTTS));
        const audio = await Promise.all(audioPromises);
        
        const validSegments: StorySegment[] = [];
        const validAudio: string[] = [];
        audio.forEach((audioData, index) => {
            if (audioData) {
                validSegments.push(segments[index]);
                validAudio.push(audioData);
            }
        });

        if (validSegments.length === 0) {
            throw new Error("Failed to generate audio for any story segment.");
        }
        
        return { segments: validSegments, audio: validAudio };

    } catch (error) {
        console.error("Error generating story:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to parse the story from the AI. Please try again.");
        }
        throw new Error("Failed to generate story. Please try again.");
    }
}