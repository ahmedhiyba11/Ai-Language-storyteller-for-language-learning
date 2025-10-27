import React from 'react';
import { type Word } from '../types';

interface VocabularyListProps {
    vocabulary: Word[];
    onDeleteWord: (id: number) => void;
    onPlayWordAudio: (word: Word) => void;
}

const WordCard: React.FC<{ word: Word; onDelete: () => void; onPlayAudio: () => void; }> = ({ word, onDelete, onPlayAudio }) => {
    return (
        <li className="flex flex-col bg-slate-700 data-[theme='high-contrast']:bg-gray-900 p-4 rounded-lg shadow-md gap-3">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h4 className="text-xl font-bold text-slate-100 data-[theme='high-contrast']:text-white">{word.text}</h4>
                        <button
                            onClick={onPlayAudio}
                            className="text-slate-400 hover:text-teal-400 data-[theme='high-contrast']:hover:text-yellow-300 transition-colors"
                            aria-label={`Play audio for ${word.text}`}
                        >
                            <i className="fas fa-volume-up"></i>
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


export const VocabularyList: React.FC<VocabularyListProps> = ({ vocabulary, onDeleteWord, onPlayWordAudio }) => {
    const listId = "vocab-list-heading";
    return (
        <div role="region" aria-labelledby={listId} className="bg-slate-800 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:border data-[theme='high-contrast']:border-white p-6 rounded-xl shadow-lg h-full">
            <h3 id={listId} className="text-2xl font-bold text-indigo-400 data-[theme='high-contrast']:text-cyan-400 mb-4">
               <i className="fas fa-clipboard-list mr-2"></i> Vocabulary Clipboard
            </h3>
            {vocabulary.length > 0 ? (
                <ul className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {vocabulary.map((word) => (
                       <WordCard 
                           key={word.id} 
                           word={word} 
                           onDelete={() => onDeleteWord(word.id)}
                           onPlayAudio={() => onPlayWordAudio(word)}
                       />
                    ))}
                </ul>
            ) : (
                <p className="text-slate-400 italic">Select words from the story to save them here.</p>
            )}
        </div>
    );
};