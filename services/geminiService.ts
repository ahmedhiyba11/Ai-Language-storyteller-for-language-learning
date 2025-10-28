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
        ipa: { type: Type.STRING, description: "The International Phonetic Alphabet (IPA) transcription of the word." },
        translation: { type: Type.STRING, description: "The English translation of the word." },
        tags: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "A list of 2-3 specific, granular tags describing the word's context in the sentence (e.g., 'cooking', 'travel-planning', 'animal'). Do not use generic tags like 'food' or 'travel'." 
        }
    },
    required: ["partOfSpeech", "ipa", "translation", "tags"]
};

const pronunciationFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        feedback: {
            type: Type.STRING,
            description: "A simple, encouraging, one-sentence feedback on the pronunciation."
        }
    },
    required: ["feedback"]
};


export async function textToSpeech(text: string, languageCode: string, throwOnError: boolean = false): Promise<string> {
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
            const warningMsg = `No audio data received from API for segment: "${text}"`;
            console.warn(warningMsg);
            if (throwOnError) {
                throw new Error("The AI did not return audio for this item.");
            }
            return "";
        }
        return base64Audio;
    } catch (error) {
        console.error(`Error with Text-to-Speech for text "${text}":`, error);
        if (throwOnError) {
            throw new Error("Failed to generate audio due to a network or API issue.");
        }
        return "";
    }
}

export async function getWordDetails(word: string, contextSentence: string, languageName: string): Promise<{ partOfSpeech: string; ipa: string; translation: string; tags: string[]; }> {
    const prompt = `Analyze the word "${word}" from the language "${languageName}". The word appears in the sentence: "${contextSentence}".
Provide the following details in a JSON object:
1. "partOfSpeech": The grammatical part of speech (e.g., Noun, Verb, Adjective).
2. "ipa": The International Phonetic Alphabet (IPA) transcription for the word.
3. "translation": The English translation of the word.
4. "tags": A list of 2-3 specific, granular tags describing the word's context in the sentence (e.g., 'cooking', 'travel-planning', 'animal'). Do not use generic tags like 'food' or 'travel'.`;

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
        if (error instanceof SyntaxError) {
            throw new Error("The AI returned unexpected details for the word.");
        }
        throw new Error("Could not retrieve details. The AI may not recognize the selected word.");
    }
}

export async function comparePronunciation(userAudioBase64: string, originalAudioBase64: string, word: string, languageName: string): Promise<{ feedback: string }> {
    const prompt = `You are a friendly language pronunciation coach.
A user is learning the word "${word}" in ${languageName}.
Compare the user's pronunciation (first audio part) with the correct pronunciation (second audio part).
Provide a simple, encouraging, one-sentence feedback. Examples: "That's perfect!", "Very close, try to make the 'r' sound stronger.", "Good effort, let's practice the vowel sound again."
Respond with a JSON object.`;

    const userAudioPart = {
        inlineData: {
            mimeType: 'audio/webm',
            data: userAudioBase64
        }
    };
    const originalAudioPart = {
        inlineData: {
            mimeType: 'audio/pcm;rate=24000',
            data: originalAudioBase64
        }
    };
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }, userAudioPart, originalAudioPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: pronunciationFeedbackSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error comparing pronunciation:", error);
        throw new Error("The AI could not compare the pronunciations. Please try again.");
    }
}


export async function generateStory(language: Language, options: StoryOptions): Promise<Story> {
    const { difficulty, tone, vocabFocus, length, isComplexMode } = options;

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

    const lengthMap = {
        'short': '4',
        'medium': '6',
        'long': '8'
    };

    const prompt = `
You are an expert in creating educational content for language learners.
Your task is to generate a simple, short, and engaging story for a language learner at the ${difficulty} (CEFR) level.
The story should be in the style of ${toneMap[tone]} and have exactly ${lengthMap[length]} sentences.

**Key Instructions:**

1.  **Narrative Structure:** The story MUST follow a clear three-part arc:
    *   **Introduction:** Introduce a character and setting.
    *   **Development:** Describe a simple action or event.
    *   **Conclusion:** Provide a simple resolution or concluding thought.

2.  **Coherence and Flow:** This is critical. Each sentence must logically and smoothly transition from the previous one. The entire story must form a single, coherent narrative that is easy to follow. Avoid disjointed sentences.

3.  **Vocabulary Focus:** ${focusMap[vocabFocus]}

**Output Format:**

Provide the output as a JSON array of objects. Each object represents a sentence and must have two keys: 'english' and 'translated' (for the ${language.name} text).

**Example (3-sentence story):**
\`\`\`json
[
  {
    "english": "A small rabbit lived in a green forest.",
    "translated": "[Sentence 1 in TARGET_LANGUAGE]"
  },
  {
    "english": "One day, it found a bright red carrot.",
    "translated": "[Sentence 2 in TARGET_LANGUAGE]"
  },
  {
    "english": "The rabbit was very happy and ate it all.",
    "translated": "[Sentence 3 in TARGET_LANGUAGE]"
  }
]
\`\`\`

Now, generate a new, different story following all these rules for the language: ${language.name}.
`;

    const modelName = isComplexMode ? "gemini-2.5-pro" : "gemini-2.5-flash";
    const modelConfig: {
        responseMimeType: "application/json";
        responseSchema: typeof storySchema;
        temperature: number;
        thinkingConfig?: { thinkingBudget: number };
    } = {
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 0.8,
    };

    if (isComplexMode) {
        modelConfig.thinkingConfig = { thinkingBudget: 32768 };
    }


    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: modelConfig,
        });

        const jsonText = response.text.trim();
        const segments: StorySegment[] = JSON.parse(jsonText);
        
        if (!Array.isArray(segments) || segments.length === 0) {
            throw new Error("The AI returned an empty or invalid story. Please try again.");
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
            throw new Error("The AI generated a story, but failed to create audio for it. Please try again.");
        }
        
        return { segments: validSegments, audio: validAudio };

    } catch (error) {
        console.error("Error generating story:", error);
        if (error instanceof Error && (error.message.includes("audio for it") || error.message.includes("invalid story"))) {
            throw error;
        }
        if (error instanceof SyntaxError) {
             throw new Error("The AI returned an unexpected story format. Please try generating again.");
        }
        throw new Error("Failed to generate story due to a network or API issue. Please check your connection and try again.");
    }
}
