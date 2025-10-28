import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { LanguageSelector } from './components/LanguageSelector';
import { StoryDisplay } from './components/StoryDisplay';
import { VocabularyList } from './components/VocabularyList';
import { AudioPlayer } from './components/AudioPlayer';
import { AccessibilityControls } from './components/AccessibilityControls';
import { StoryOptions } from './components/StoryOptions';
import { StoryHistory } from './components/StoryHistory';
import { TabbedSidebar } from './components/TabbedSidebar';
import { RadioPlayer } from './components/RadioPlayer';
import { generateStory, getWordDetails, textToSpeech, comparePronunciation } from './services/geminiService';
import { decodeAudioData, blobToBase64 } from './utils/audioUtils';
import { getStoryFromCache, saveStoryToCache } from './utils/cache';
import { type Story, type Language, type Word, type Theme, type StoryOptions as StoryOptionsType, type StoryHistoryItem, type CachedStoryItem } from './types';
import { LANGUAGES, TONES, DIFFICULTIES, VOCAB_FOCUSES } from './constants';

type AudioState = {
  status: 'idle' | 'playing' | 'paused';
  currentSegmentIndex: number | null;
  isContinuous: boolean;
};

type AudioAction =
  | { type: 'PLAY'; payload: { startIndex: number; isContinuous: boolean } }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'SEGMENT_ENDED'; payload: { audioBuffersCount: number } };

const initialAudioState: AudioState = {
  status: 'idle',
  currentSegmentIndex: null,
  isContinuous: false,
};

function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'PLAY':
      return {
        ...state,
        status: 'playing',
        currentSegmentIndex: action.payload.startIndex,
        isContinuous: action.payload.isContinuous,
      };
    case 'PAUSE':
      if (state.status === 'playing') {
        return { ...state, status: 'paused' };
      }
      return state;
    case 'STOP':
      return initialAudioState;
    case 'SEGMENT_ENDED':
      if (
        state.isContinuous &&
        state.currentSegmentIndex !== null &&
        state.currentSegmentIndex < action.payload.audioBuffersCount - 1
      ) {
        return {
          ...state,
          currentSegmentIndex: state.currentSegmentIndex + 1,
        };
      }
      return initialAudioState; // End of story or not continuous play
    default:
      return state;
  }
}

const App: React.FC = () => {
    const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]);
    const [story, setStory] = useState<Story | null>(null);
    const [vocabulary, setVocabulary] = useState<Word[]>([]);
    const [storyHistory, setStoryHistory] = useState<StoryHistoryItem[]>([]);
    const [selectedText, setSelectedText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSavingWord, setIsSavingWord] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingWordAudioId, setLoadingWordAudioId] = useState<number | null>(null);

    const [theme, setTheme] = useState<Theme>('default');
    const [isDyslexiaFont, setIsDyslexiaFont] = useState<boolean>(false);
    const [isStoryContrast, setIsStoryContrast] = useState<boolean>(false);
    const [playbackRate, setPlaybackRate] = useState<number>(1.0);

    const [storyOptions, setStoryOptions] = useState<StoryOptionsType>({
        difficulty: 'A1',
        tone: 'childrens-story',
        vocabFocus: 'general',
        length: 'short',
        isComplexMode: false,
    });

    const [audioState, dispatch] = useReducer(audioReducer, initialAudioState);
    const audioContextRef = useRef<AudioContext>();
    const audioBuffersRef = useRef<AudioBuffer[]>([]);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const wordAudioBuffersRef = useRef<Map<number, AudioBuffer>>(new Map());

    const [recordingState, setRecordingState] = useState<{ wordId: number | null; status: 'idle' | 'recording' | 'processing' }>({ wordId: null, status: 'idle' });
    const [pronunciationFeedback, setPronunciationFeedback] = useState<{ wordId: number | null; message: string | null }>({ wordId: null, message: null });
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const wordAudioBase64Ref = useRef<Map<number, string>>(new Map());

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);
    
    useEffect(() => {
        document.documentElement.classList.toggle('font-dyslexia', isDyslexiaFont);
    }, [isDyslexiaFont]);

    useEffect(() => {
        try {
            const savedVocabulary = localStorage.getItem('vocabulary');
            if (savedVocabulary) setVocabulary(JSON.parse(savedVocabulary));

            const savedHistory = localStorage.getItem('storyHistory');
            if (savedHistory) setStoryHistory(JSON.parse(savedHistory));

        } catch (e) {
            console.error("Failed to load data from localStorage", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('vocabulary', JSON.stringify(vocabulary));
        } catch (e) {
            console.error("Failed to save vocabulary to localStorage", e);
        }
    }, [vocabulary]);

    useEffect(() => {
        try {
            localStorage.setItem('storyHistory', JSON.stringify(storyHistory));
        } catch (e) {
            console.error("Failed to save story history to localStorage", e);
        }
    }, [storyHistory]);


    const stopAudio = useCallback(() => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.onended = null;
            try {
                sourceNodeRef.current.stop();
            } catch (e) {
                // Ignore errors from stopping already-stopped sources
            }
            sourceNodeRef.current = null;
        }
        dispatch({ type: 'STOP' });
    }, []);

    useEffect(() => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.playbackRate.value = playbackRate;
        }
    }, [playbackRate]);
    
    useEffect(() => {
        const playCurrentSegment = async () => {
            if (audioState.status !== 'playing' || audioState.currentSegmentIndex === null) {
                return;
            }
    
            const index = audioState.currentSegmentIndex;
            if (index >= audioBuffersRef.current.length) {
                dispatch({ type: 'STOP' });
                return;
            }
    
            // Stop any previous sound before playing the new one
            if (sourceNodeRef.current) {
                sourceNodeRef.current.onended = null;
                try { sourceNodeRef.current.stop(); } catch(e) { /* ignore */ }
            }

            const audioBuffer = audioBuffersRef.current[index];
            if (!audioContextRef.current || !audioBuffer) {
                // If a buffer is missing, skip to the next segment in continuous play
                if (audioState.isContinuous) {
                    dispatch({ type: 'SEGMENT_ENDED', payload: { audioBuffersCount: audioBuffersRef.current.length } });
                } else {
                    dispatch({ type: 'STOP' });
                }
                return;
            }
    
            // Robustly resume AudioContext if it's suspended
            if (audioContextRef.current.state === 'suspended') {
                try {
                    await audioContextRef.current.resume();
                } catch (err) {
                    console.error("Failed to resume AudioContext:", err);
                    setError("Could not play audio. Please interact with the page and try again.");
                    dispatch({ type: 'STOP' });
                    return;
                }
            }
    
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = playbackRate;
            source.connect(audioContextRef.current.destination);
            
            source.onended = () => {
                // Only dispatch if this is the currently active source
                if (sourceNodeRef.current === source) {
                    dispatch({ type: 'SEGMENT_ENDED', payload: { audioBuffersCount: audioBuffersRef.current.length } });
                }
            };
            
            source.start(0);
            sourceNodeRef.current = source;
        };
    
        playCurrentSegment();
    
        // Cleanup function to stop audio when the component unmounts or dependencies change
        return () => {
            if (sourceNodeRef.current) {
                sourceNodeRef.current.onended = null;
            }
        };
    }, [audioState.status, audioState.currentSegmentIndex, audioState.isContinuous, playbackRate]);

    const createCacheKey = (languageCode: string, options: StoryOptionsType) => {
        return `${languageCode}-${options.difficulty}-${options.tone}-${options.vocabFocus}-${options.length}-${options.isComplexMode}`;
    };

    const rehydrateAudio = useCallback(async (audioData: string[]) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const buffers = await Promise.all(
            audioData.map(data => data ? decodeAudioData(data, audioContextRef.current!) : Promise.resolve(null))
        );
        audioBuffersRef.current = buffers.filter(b => b !== null) as AudioBuffer[];
    }, []);

    const handleGenerateStory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        stopAudio();
        setStory(null);
        setSelectedText('');

        try {
            // Always generate a new story instead of checking cache first.
            // This ensures the "Generate New Story" button always provides fresh content.
            const newStory = await generateStory(selectedLanguage, storyOptions);

            // Save the newly generated story to the cache, overwriting any previous entry for these options.
            const cacheKey = createCacheKey(selectedLanguage.code, storyOptions);
            const itemToCache: CachedStoryItem = {
                story: newStory,
                language: selectedLanguage,
                options: storyOptions,
            };
            await saveStoryToCache(cacheKey, itemToCache);
            
            setStory(newStory);
            await rehydrateAudio(newStory.audio);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setStory(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLanguage, stopAudio, storyOptions, rehydrateAudio]);
    
    const handlePlayPauseToggle = () => {
        if (audioState.status === 'playing') {
            if (sourceNodeRef.current) {
                sourceNodeRef.current.onended = null;
                try { sourceNodeRef.current.stop(); } catch(e) {}
                sourceNodeRef.current = null;
            }
            dispatch({ type: 'PAUSE' });
        } else {
            // If idle or paused, start playing.
            const startIndex = audioState.currentSegmentIndex !== null ? audioState.currentSegmentIndex : 0;
            dispatch({ type: 'PLAY', payload: { startIndex, isContinuous: true } });
        }
    };
    
    const handleSegmentClick = (index: number) => {
        // If the user clicks the currently playing segment, treat it as a pause.
        if (audioState.status === 'playing' && audioState.currentSegmentIndex === index) {
            handlePlayPauseToggle();
        } else {
            // Otherwise, play the single segment
            dispatch({ type: 'PLAY', payload: { startIndex: index, isContinuous: false } });
        }
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

            const newWord: Word = {
                id: Date.now(),
                text: selectedText,
                language: selectedLanguage,
                contextSentence: contextSentence,
                partOfSpeech: details.partOfSpeech,
                ipa: details.ipa,
                translation: details.translation,
                tags: [difficultyTag, ...details.tags],
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
        wordAudioBase64Ref.current.delete(id);
    };

    const handlePlayWordAudio = async (word: Word) => {
        setError(null);

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
                source.playbackRate.value = playbackRate;
                source.connect(audioContextRef.current.destination);
                source.start(0);
            }
            return;
        }
    
        setLoadingWordAudioId(word.id);
        try {
            const languageCodeForTTS = word.language.ttsCode || word.language.code;
            const audioData = await textToSpeech(word.text, languageCodeForTTS, true);
            wordAudioBase64Ref.current.set(word.id, audioData);
            const buffer = await decodeAudioData(audioData, audioContextRef.current);
            if (buffer) {
                wordAudioBuffersRef.current.set(word.id, buffer);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.playbackRate.value = playbackRate;
                source.connect(audioContextRef.current.destination);
                source.start(0);
            } else {
                throw new Error("Failed to process the generated audio.");
            }
        } catch (err) {
            console.error("Failed to play word audio", err);
            setError(err instanceof Error ? err.message : "Could not play audio for this word.");
        } finally {
            setLoadingWordAudioId(null);
        }
    };

    const handleRecordPronunciation = async (word: Word) => {
        setError(null);
        setPronunciationFeedback({ wordId: null, message: null });
    
        if (recordingState.status === 'recording' && recordingState.wordId === word.id) {
            mediaRecorderRef.current?.stop();
            return;
        }
    
        if (recordingState.status !== 'idle') return;
    
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            recordedChunksRef.current = [];
    
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };
    
            mediaRecorderRef.current.onstop = async () => {
                setRecordingState({ wordId: word.id, status: 'processing' });
                try {
                    const userAudioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                    const userAudioBase64 = await blobToBase64(userAudioBlob);
    
                    let originalAudioBase64 = wordAudioBase64Ref.current.get(word.id);
                    if (!originalAudioBase64) {
                        const languageCodeForTTS = word.language.ttsCode || word.language.code;
                        originalAudioBase64 = await textToSpeech(word.text, languageCodeForTTS, true);
                        if (originalAudioBase64) {
                            wordAudioBase64Ref.current.set(word.id, originalAudioBase64);
                        } else {
                            throw new Error("Could not generate reference audio for comparison.");
                        }
                    }
                    
                    const result = await comparePronunciation(userAudioBase64, originalAudioBase64, word.text, word.language.name);
                    setPronunciationFeedback({ wordId: word.id, message: result.feedback });
    
                } catch (err) {
                     setError(err instanceof Error ? err.message : "Failed to get pronunciation feedback.");
                } finally {
                    stream.getTracks().forEach(track => track.stop());
                    setRecordingState({ wordId: null, status: 'idle' });
                }
            };
    
            mediaRecorderRef.current.start();
            setRecordingState({ wordId: word.id, status: 'recording' });
    
        } catch (err) {
            console.error("Error starting recording:", err);
            setError("Microphone access was denied or an error occurred. Please enable microphone permissions in your browser settings.");
            setRecordingState({ wordId: null, status: 'idle' });
        }
    };
    
    const handleClearPronunciationFeedback = (wordId: number) => {
        if (pronunciationFeedback.wordId === wordId) {
            setPronunciationFeedback({ wordId: null, message: null });
        }
    };

    const handleOptionsChange = (newOptions: StoryOptionsType) => {
        stopAudio();
        setStory(null);
        setStoryOptions(newOptions);
    };

    const handleSaveStory = () => {
        if (!story) return;
    
        const newHistoryItem: StoryHistoryItem = {
            id: Date.now(),
            story,
            language: selectedLanguage,
            options: storyOptions,
            title: story.segments[0].english,
        };
    
        if (storyHistory.length > 0 && storyHistory[0].title === newHistoryItem.title && storyHistory[0].language.code === newHistoryItem.language.code) {
            return;
        }
    
        setStoryHistory(prev => [newHistoryItem, ...prev]);
    };

    const handleLoadStoryFromHistory = useCallback(async (item: StoryHistoryItem) => {
        stopAudio();
        setError(null);
        setSelectedText('');
        setIsLoading(true);
    
        setStory(item.story);
        setSelectedLanguage(item.language);
        setStoryOptions(item.options);
    
        await rehydrateAudio(item.story.audio);
    
        setIsLoading(false);
    }, [stopAudio, rehydrateAudio]);
    
    const handleDeleteStoryFromHistory = (id: number) => {
        setStoryHistory(prev => prev.filter(item => item.id !== id));
    };

    const handleClearStoryHistory = () => {
        setStoryHistory([]);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:text-white font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                 <header className="text-center mb-8 relative">
                    <h1 className="text-4xl sm:text-5xl font-bold text-teal-400 data-[theme='high-contrast']:text-yellow-300">
                        <i className="fas fa-book-open-reader mr-3"></i>AI Language Storyteller
                    </h1>
                    <p className="text-slate-400 data-[theme='high-contrast']:text-slate-200 mt-2 text-lg">Your personal AI-powered language learning companion</p>
                    <AccessibilityControls 
                        theme={theme} 
                        setTheme={setTheme} 
                        isDyslexiaFont={isDyslexiaFont} 
                        setIsDyslexiaFont={setIsDyslexiaFont}
                        isStoryContrast={isStoryContrast}
                        setIsStoryContrast={setIsStoryContrast}
                    />
                </header>

                <div className="bg-slate-800 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:border data-[theme='high-contrast']:border-white p-6 rounded-xl shadow-2xl mb-8">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <LanguageSelector
                            languages={LANGUAGES}
                            selectedLanguage={selectedLanguage}
                            onChange={(lang) => {
                                stopAudio();
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
                    {error && <p className="text-red-400 data-[theme='high-contrast']:text-red-400 text-center mt-4" role="alert">Error: {error}</p>}
                </div>
                
                <main role="main" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                         <StoryDisplay 
                            segments={story?.segments} 
                            onSelectionChange={handleSelectionChange} 
                            languageName={selectedLanguage.name} 
                            isLoading={isLoading}
                            currentSegmentIndex={audioState.currentSegmentIndex}
                            onSegmentClick={handleSegmentClick}
                            isStoryContrast={isStoryContrast}
                         />
                         <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 flex-wrap">
                            {story && (
                                <AudioPlayer 
                                    isPlaying={audioState.status === 'playing'}
                                    isDisabled={isLoading || !story} 
                                    onPlayPause={handlePlayPauseToggle} 
                                    story={story}
                                    currentSegmentIndex={audioState.currentSegmentIndex}
                                    playbackRate={playbackRate}
                                    onPlaybackRateChange={setPlaybackRate}
                                />
                            )}
                             {story && !isLoading && (
                                <button
                                    onClick={handleSaveStory}
                                    className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 data-[theme='high-contrast']:bg-yellow-600 data-[theme='high-contrast']:hover:bg-yellow-700 data-[theme='high-contrast']:text-black text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition duration-200"
                                    title="Save story to your history"
                                >
                                    <i className="fas fa-save"></i> Save Story
                                </button>
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
                        <TabbedSidebar
                            tabs={{
                                'Vocabulary': {
                                    icon: 'fas fa-clipboard-list',
                                    content: <VocabularyList 
                                        vocabulary={vocabulary} 
                                        onDeleteWord={handleDeleteWord}
                                        onPlayWordAudio={handlePlayWordAudio}
                                        loadingWordAudioId={loadingWordAudioId}
                                        onRecordPronunciation={handleRecordPronunciation}
                                        recordingState={recordingState}
                                        pronunciationFeedback={pronunciationFeedback}
                                        onClearPronunciationFeedback={handleClearPronunciationFeedback}
                                    />
                                },
                                'History': {
                                    icon: 'fas fa-history',
                                    content: <StoryHistory 
                                        history={storyHistory}
                                        onLoadStory={handleLoadStoryFromHistory}
                                        onDeleteStory={handleDeleteStoryFromHistory}
                                        onClearHistory={handleClearStoryHistory}
                                    />
                                },
                                'Radio': {
                                    icon: 'fas fa-broadcast-tower',
                                    content: <RadioPlayer language={selectedLanguage} />
                                }
                            }}
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
