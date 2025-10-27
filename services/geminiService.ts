import { GoogleGenAI, Type, Modality } from '@google/genai';
import { type Story, type StorySegment, type Language } from '../types';

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

async function textToSpeech(text: string, languageCode: string): Promise<string> {
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

export async function generateStory(language: Language): Promise<Story> {
    const prompt = `Generate a very simple, short story (about 4 to 6 sentences long) suitable for a beginner language learner. The story should be interesting for any age. Provide the story segmented by sentence. For each sentence, provide the text in ${language.name} and also the English translation.`;

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
