
import React from 'react';
import { type Word } from '../types';

interface VocabularyListProps {
    vocabulary: Word[];
    onDeleteWord: (id: number) => void;
}

export const VocabularyList: React.FC<VocabularyListProps> = ({ vocabulary, onDeleteWord }) => {
    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg h-full">
            <h3 className="text-2xl font-bold text-indigo-400 mb-4">
               <i className="fas fa-clipboard-list mr-2"></i> Vocabulary Clipboard
            </h3>
            {vocabulary.length > 0 ? (
                <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {vocabulary.map((word) => (
                        <li
                            key={word.id}
                            className="flex items-center justify-between bg-slate-700 p-3 rounded-lg group"
                        >
                            <span className="text-slate-200">{word.text}</span>
                            <button
                                onClick={() => onDeleteWord(word.id)}
                                className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label={`Delete word: ${word.text}`}
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-slate-400 italic">Select words from the story to save them here.</p>
            )}
        </div>
    );
};
