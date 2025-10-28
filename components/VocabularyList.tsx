import React, { useState } from 'react';
import { type Word } from '../types';

interface VocabularyListProps {
    vocabulary: Word[];
    onDeleteWord: (id: number) => void;
    onPlayWordAudio: (word: Word) => void;
    loadingWordAudioId?: number | null;
    onRecordPronunciation: (word: Word) => void;
    recordingState: { wordId: number | null; status: 'idle' | 'recording' | 'processing' };
    pronunciationFeedback: { wordId: number | null; message: string | null };
    onClearPronunciationFeedback: (wordId: number) => void;
}

const WordCard: React.FC<{ 
    word: Word; 
    onDelete: () => void; 
    onPlayAudio: () => void; 
    isLoading: boolean;
    onRecord: () => void;
    isRecording: boolean;
    isProcessing: boolean;
    isAnotherRecording: boolean;
    feedback: string | null;
    onClearFeedback: () => void;
}> = ({ word, onDelete, onPlayAudio, isLoading, onRecord, isRecording, isProcessing, isAnotherRecording, feedback, onClearFeedback }) => {
    const [isTranslationVisible, setIsTranslationVisible] = useState(false);

    const getRecordButtonContent = () => {
        if (isProcessing) return <i className="fas fa-spinner fa-spin"></i>;
        if (isRecording) return <i className="fas fa-microphone-slash"></i>;
        return <i className="fas fa-microphone"></i>;
    };
    
    const recordButtonDisabled = isLoading || isAnotherRecording;

    return (
        <li className="flex flex-col bg-slate-700 data-[theme='high-contrast']:bg-gray-900 p-4 rounded-lg shadow-md gap-3">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h4 className="text-xl font-bold text-slate-100 data-[theme='high-contrast']:text-white">{word.text}</h4>
                        <button
                            onClick={onPlayAudio}
                            disabled={isLoading || isRecording || isProcessing}
                            className="text-slate-400 hover:text-teal-400 data-[theme='high-contrast']:hover:text-yellow-300 transition-colors disabled:cursor-not-allowed disabled:text-slate-500"
                            aria-label={isLoading ? `Loading audio for ${word.text}` : `Play audio for ${word.text}`}
                        >
                            {isLoading ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                                <i className="fas fa-volume-up"></i>
                            )}
                        </button>
                        {word.translation && (
                             <button
                                onClick={() => setIsTranslationVisible(!isTranslationVisible)}
                                className="text-slate-400 hover:text-teal-400 data-[theme='high-contrast']:hover:text-yellow-300 transition-colors"
                                aria-label={`Translate ${word.text}`}
                                aria-expanded={isTranslationVisible}
                            >
                                <i className="fas fa-language"></i>
                            </button>
                        )}
                        <button
                            onClick={onRecord}
                            disabled={recordButtonDisabled}
                            className={`transition-colors disabled:cursor-not-allowed disabled:text-slate-500 ${
                                isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-teal-400 data-[theme=\'high-contrast\']:hover:text-yellow-300'
                            }`}
                            aria-label={isRecording ? `Stop recording pronunciation for ${word.text}` : `Record pronunciation for ${word.text}`}
                            title="Record your pronunciation"
                        >
                            {getRecordButtonContent()}
                        </button>
                    </div>
                    <div className="text-sm text-slate-400 data-[theme='high-contrast']:text-slate-300 flex items-center gap-2">
                        <span>{word.partOfSpeech}</span>
                        <span className="font-mono text-xs">/ {word.ipa} /</span>
                    </div>
                </div>
                <button
                    onClick={onDelete}
                    className="text-slate-500 hover:text-red-500 data-[theme='high-contrast']:text-slate-400 data-[theme='high-contrast']:hover:text-red-400 transition-opacity"
                    aria-label={`Delete word: ${word.text}`}
                >
                    <i className="fas fa-trash-alt"></i>
                </button>
            </div>

            <p className="text-slate-300 data-[theme='high-contrast']:text-slate-200 italic border-l-2 border-teal-500 data-[theme='high-contrast']:border-yellow-400 pl-3">
                "{word.contextSentence}"
            </p>

            {isTranslationVisible && word.translation && (
                 <p className="text-slate-300 data-[theme='high-contrast']:text-slate-200 border-l-2 border-indigo-500 data-[theme='high-contrast']:border-cyan-400 pl-3">
                    <strong>EN:</strong> {word.translation}
                </p>
            )}

            {feedback && (
                <div className="mt-2 p-3 bg-slate-600/50 data-[theme='high-contrast']:bg-gray-800 rounded-lg relative">
                    <p className="text-slate-200 pr-6"><strong className="text-teal-400 data-[theme='high-contrast']:text-yellow-300">Feedback:</strong> {feedback}</p>
                    <button
                        onClick={onClearFeedback}
                        className="absolute top-2 right-2 text-slate-400 hover:text-white"
                        aria-label="Dismiss feedback"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {word.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {word.tags.map(tag => (
                        <span key={tag} className="text-xs bg-slate-600 data-[theme='high-contrast']:bg-gray-700 text-slate-200 data-[theme='high-contrast']:text-slate-100 px-2 py-1 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </li>
    );
};


export const VocabularyList: React.FC<VocabularyListProps> = ({ vocabulary, onDeleteWord, onPlayWordAudio, loadingWordAudioId, onRecordPronunciation, recordingState, pronunciationFeedback, onClearPronunciationFeedback }) => {
    return (
        <>
            {vocabulary.length > 0 ? (
                <ul className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar">
                    {vocabulary.map((word) => {
                        const isThisWordRecording = recordingState.status === 'recording' && recordingState.wordId === word.id;
                        const isThisWordProcessing = recordingState.status === 'processing' && recordingState.wordId === word.id;
                        const isAnotherRecording = recordingState.status !== 'idle' && recordingState.wordId !== word.id;

                       return (
                            <WordCard 
                               key={word.id} 
                               word={word} 
                               onDelete={() => onDeleteWord(word.id)}
                               onPlayAudio={() => onPlayWordAudio(word)}
                               isLoading={loadingWordAudioId === word.id}
                               onRecord={() => onRecordPronunciation(word)}
                               isRecording={isThisWordRecording}
                               isProcessing={isThisWordProcessing}
                               isAnotherRecording={isAnotherRecording}
                               feedback={pronunciationFeedback.wordId === word.id ? pronunciationFeedback.message : null}
                               onClearFeedback={() => onClearPronunciationFeedback(word.id)}
                            />
                       );
                    })}
                </ul>
            ) : (
                <p className="text-slate-400 italic">Select words from the story to save them here.</p>
            )}
        </>
    );
};