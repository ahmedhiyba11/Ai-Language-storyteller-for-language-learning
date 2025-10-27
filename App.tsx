import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LanguageSelector } from './components/LanguageSelector';
import { StoryDisplay } from './components/StoryDisplay';
import { VocabularyList } from './components/VocabularyList';
import { AudioPlayer } from './components/AudioPlayer';
import { AccessibilityControls } from './components/AccessibilityControls';
import { StoryOptions } from './components/StoryOptions';
import { generateStory, getWordDetails, textToSpeech } from './services/geminiService';
import { decodeAudioData } from './utils/audioUtils';
import { getStoryFromCache, saveStoryToCache } from './utils/cache';
import { type Story, type Language, type Word, type Theme, type StoryOptions as StoryOptionsType } from './types';
import { LANGUAGES, TONES, DIFFICULTIES, VOCAB_FOCUSES } from './constants';

const App: React.FC = () => {
    const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]);
    const [story, setStory] = useState<Story | null>(null);
    const [vocabulary, setVocabulary] = useState<Word[]>([]);
    const [selectedText, setSelectedText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSavingWord, setIsSavingWord] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number | null>(null);

    const [theme, setTheme] = useState<Theme>('default');
    const [isDyslexiaFont, setIsDyslexiaFont] = useState<boolean>(false);

    const [storyOptions, setStoryOptions] = useState<StoryOptionsType>({
        difficulty: 'A1',
        tone: 'childrens-story',
        vocabFocus: 'general',
    });

    const audioContextRef = useRef<AudioContext>();
    const audioBuffersRef = useRef<AudioBuffer[]>([]);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const isContinuousPlayRef = useRef(false);
    const wordAudioBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());
    
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);
    
    useEffect(() => {
        document.documentElement.classList.toggle('font-dyslexia', isDyslexiaFont);
    }, [isDyslexiaFont]);

    useEffect(() => {
        try {
            const savedVocabulary = localStorage.getItem('vocabulary');
            if (savedVocabulary) {
                setVocabulary(JSON.parse(savedVocabulary));
            }
        } catch (e) {
            console.error("Failed to load vocabulary from localStorage", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('vocabulary', JSON.stringify(vocabulary));
        } catch (e) {
            console.error("Failed to save vocabulary to localStorage", e);
        }
    }, [vocabulary]);

    const stopPlayback = useCallback((clearState = true) => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.onended = null;
            try {
                sourceNodeRef.current.stop();
            } catch (e) {
                // Ignore errors from stopping already-stopped sources
            }
            sourceNodeRef.current = null;
        }
        if (clearState) {
            setIsPlaying(false);
            setCurrentSegmentIndex(null);
            isContinuousPlayRef.current = false;
        }
    }, []);

    const playSegment = useCallback((index: number) => {
        if (index >= audioBuffersRef.current.length) {
            if (isContinuousPlayRef.current) {
                stopPlayback();
            }
            return;
        }

        stopPlayback(false); // Stop current playback without clearing state

        const audioBuffer = audioBuffersRef.current[index];
        if (!audioContextRef.current || !audioBuffer) {
            if (isContinuousPlayRef.current) {
                playSegment(index + 1);
            }
            return;
        }
        
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
            if (sourceNodeRef.current !== source) return;
            
            if (isContinuousPlayRef.current) {
                playSegment(index + 1);
            } else {
                stopPlayback();
            }
        };
        
        source.start(0);
        sourceNodeRef.current = source;
        setCurrentSegmentIndex(index);
        setIsPlaying(true);

    }, [stopPlayback]);

    const createCacheKey = (languageCode: string, options: StoryOptionsType) => {
        return `${languageCode}-${options.difficulty}-${options.tone}-${options.vocabFocus}`;
    };

    const handleGenerateStory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        stopPlayback();
        setStory(null);
        setSelectedText('');

        try {
            const cacheKey = createCacheKey(selectedLanguage.code, storyOptions);
            const cachedStory = await getStoryFromCache(cacheKey);
            let newStory: Story;

            if (cachedStory) {
                newStory = cachedStory;
            } else {
                newStory = await generateStory(selectedLanguage, storyOptions);
                await saveStoryToCache(cacheKey, newStory);
            }

            setStory(newStory);

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const buffers = await Promise.all(
                newStory.audio.map(data => data ? decodeAudioData(data, audioContextRef.current!) : Promise.resolve(null))
            );
            audioBuffersRef.current = buffers.filter(b => b !== null) as AudioBuffer[];

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setStory(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLanguage, stopPlayback, storyOptions]);
    
    const handlePlayPauseToggle = () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            isContinuousPlayRef.current = true;
            playSegment(currentSegmentIndex !== null ? currentSegmentIndex : 0);
        }
    };
    
    const handleSegmentClick = (index: number) => {
        isContinuousPlayRef.current = false;
        playSegment(index);
    };

    const handleSelectionChange = () => {
        const text = window.getSelection()?.toString().trim() ?? '';
        if (text) {
            setSelectedText(text);
        }
    };

    const handleSaveWord = async () => {
        if (!selectedText || !story || vocabulary.some(word => word.text === selectedText)) {
            setSelectedText('');
            window.getSelection()?.removeAllRanges();
            return;
        }
    
        setIsSavingWord(true);
        setError(null);
    
        try {
            let contextSentence = '';
            const segment = story.segments.find(s => {
                if (s.translated.includes(selectedText)) {
                    contextSentence = s.translated;
                    return true;
                }
                return false;
            });
    
            if (!segment) {
                throw new Error("Please select a word from the translated story text to save it.");
            }
    
            const details = await getWordDetails(selectedText, contextSentence, selectedLanguage.name);
    
            const difficultyTag = DIFFICULTIES.find(d => d.id === storyOptions.difficulty)?.label || storyOptions.difficulty;
            const toneTag = TONES.find(t => t.id === storyOptions.tone)?.label || storyOptions.tone;
            const vocabTag = VOCAB_FOCUSES.find(v => v.id === storyOptions.vocabFocus)?.label || storyOptions.vocabFocus;

            const newWord: Word = {
                id: Date.now(),
                text: selectedText,
                language: selectedLanguage,
                contextSentence: contextSentence,
                partOfSpeech: details.partOfSpeech,
                ipa: details.ipa,
                tags: [difficultyTag, toneTag, vocabTag].filter(tag => tag !== 'General'),
            };
    
            setVocabulary(prev => [newWord, ...prev]);
        } catch (err) {
            console.error("Error saving word:", err);
            setError(err instanceof Error ? err.message : "Could not save word.");
        } finally {
            setSelectedText('');
            window.getSelection()?.removeAllRanges();
            setIsSavingWord(false);
        }
    };

    const handleDeleteWord = (id: number) => {
        setVocabulary(prev => prev.filter(word => word.id !== id));
        wordAudioBuffersRef.current.delete(id);
    };

    const handlePlayWordAudio = async (word: Word) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
    
        if (wordAudioBuffersRef.current.has(word.id)) {
            const buffer = wordAudioBuffersRef.current.get(word.id);
            if (buffer) {
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContextRef.current.destination);
                source.start(0);
            }
            return;
        }
    
        try {
            const languageCodeForTTS = word.language.ttsCode || word.language.code;
            const audioData = await textToSpeech(word.text, languageCodeForTTS);
            if (audioData) {
                const buffer = await decodeAudioData(audioData, audioContextRef.current);
                if (buffer) {
                    wordAudioBuffersRef.current.set(word.id, buffer);
                    const source = audioContextRef.current.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContextRef.current.destination);
                    source.start(0);
                }
            }
        } catch (err) {
            console.error("Failed to play word audio", err);
            setError("Could not play audio for this word.");
        }
    };

    const handleOptionsChange = (newOptions: StoryOptionsType) => {
        stopPlayback();
        setStory(null);
        setStoryOptions(newOptions);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:text-white font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                 <header className="text-center mb-8 relative">
                    <h1 className="text-4xl sm:text-5xl font-bold text-teal-400 data-[theme='high-contrast']:text-yellow-300">
                        <i className="fas fa-book-open-reader mr-3"></i>AI Language Storyteller
                    </h1>
                    <p className="text-slate-400 data-[theme='high-contrast']:text-slate-200 mt-2 text-lg">Your personal AI-powered language learning companion</p>
                    <AccessibilityControls theme={theme} setTheme={setTheme} isDyslexiaFont={isDyslexiaFont} setIsDyslexiaFont={setIsDyslexiaFont} />
                </header>

                <div className="bg-slate-800 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:border data-[theme='high-contrast']:border-white p-6 rounded-xl shadow-2xl mb-8">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <LanguageSelector
                            languages={LANGUAGES}
                            selectedLanguage={selectedLanguage}
                            onChange={(lang) => {
                                stopPlayback();
                                setStory(null);
                                setSelectedLanguage(lang);
                            }}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleGenerateStory}
                            disabled={isLoading}
                            className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white data-[theme='high-contrast']:bg-yellow-400 data-[theme='high-contrast']:hover:bg-yellow-500 data-[theme='high-contrast']:text-black font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 duration-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-magic-wand-sparkles"></i> Generate New Story
                                </>
                            )}
                        </button>
                    </div>
                    <StoryOptions
                        options={storyOptions}
                        onOptionsChange={handleOptionsChange}
                        disabled={isLoading}
                    />
                    <div role="status" aria-live="polite" className="sr-only">
                        {isLoading && "Generating new story, please wait."}
                        {error && `An error occurred: ${error}`}
                    </div>
                    {error && <p className="text-red-400 data-[theme='high-contrast']:text-red-400 text-center mt-4">Error: {error}</p>}
                </div>
                
                <main role="main" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                         <StoryDisplay 
                            segments={story?.segments} 
                            onSelectionChange={handleSelectionChange} 
                            languageName={selectedLanguage.name} 
                            isLoading={isLoading}
                            currentSegmentIndex={currentSegmentIndex}
                            onSegmentClick={handleSegmentClick}
                         />
                         <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                            {story && (
                                <AudioPlayer 
                                    isPlaying={isPlaying} 
                                    isDisabled={isLoading || !story} 
                                    onPlayPause={handlePlayPauseToggle} 
                                    story={story}
                                    currentSegmentIndex={currentSegmentIndex}
                                />
                            )}
                            {selectedText && (
                                <button
                                    onClick={handleSaveWord}
                                    disabled={isSavingWord}
                                    className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 data-[theme='high-contrast']:bg-cyan-500 data-[theme='high-contrast']:hover:bg-cyan-600 data-[theme='high-contrast']:text-black text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
                                >
                                    {isSavingWord ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-plus-circle"></i> Save "{selectedText}"
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <VocabularyList 
                            vocabulary={vocabulary} 
                            onDeleteWord={handleDeleteWord}
                            onPlayWordAudio={handlePlayWordAudio}
                        />
                    </div>
                </main>

                <footer className="text-center text-sm text-slate-400 data-[theme='high-contrast']:text-slate-300 py-8 mt-8 border-t border-slate-700 data-[theme='high-contrast']:border-slate-600">
                    <p className="mb-2">Made with <span role="img" aria-label="love" className="text-red-500">❤️</span> by Ahmed Hiba — for all language learners who dream big but can’t afford subscriptions.</p>
                    <p>Share your thoughts or feedback: <a href="mailto:AhmedHiyba11@gmail.com" className="text-teal-400 hover:underline data-[theme='high-contrast']:text-yellow-300">AhmedHiyba11@gmail.com</a></p>
                </footer>

            </div>
        </div>
    );
};

export default App;