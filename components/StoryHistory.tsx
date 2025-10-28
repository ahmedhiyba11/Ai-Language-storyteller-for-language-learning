import React from 'react';
import { type StoryHistoryItem } from '../types';

interface StoryHistoryProps {
    history: StoryHistoryItem[];
    onLoadStory: (item: StoryHistoryItem) => void;
    onDeleteStory: (id: number) => void;
    onClearHistory: () => void;
}

const HistoryItemCard: React.FC<{
    item: StoryHistoryItem;
    onLoad: () => void;
    onDelete: () => void;
}> = ({ item, onLoad, onDelete }) => (
    <li className="flex flex-col bg-slate-700 data-[theme='high-contrast']:bg-gray-900 p-4 rounded-lg shadow-md gap-3">
        <div>
            <p className="font-bold text-slate-100 data-[theme='high-contrast']:text-white truncate" title={item.title}>
                {item.title}
            </p>
            <p className="text-sm text-slate-400 data-[theme='high-contrast']:text-slate-300">
                {item.language.name} - {new Date(item.id).toLocaleDateString()}
            </p>
        </div>
        <div className="flex items-center justify-end gap-2 mt-2">
            <button
                onClick={onDelete}
                className="text-slate-500 hover:text-red-500 data-[theme='high-contrast']:text-slate-400 data-[theme='high-contrast']:hover:text-red-400 transition-opacity text-sm py-1 px-2"
                aria-label={`Delete story: ${item.title}`}
            >
                <i className="fas fa-trash-alt mr-1"></i> Delete
            </button>
            <button
                onClick={onLoad}
                className="bg-teal-600 hover:bg-teal-700 text-white data-[theme='high-contrast']:bg-yellow-500 data-[theme='high-contrast']:hover:bg-yellow-600 data-[theme='high-contrast']:text-black font-semibold text-sm py-1 px-3 rounded-md transition-colors"
                aria-label={`Load story: ${item.title}`}
            >
                <i className="fas fa-book-open mr-1"></i> Load
            </button>
        </div>
    </li>
);

export const StoryHistory: React.FC<StoryHistoryProps> = ({ history, onLoadStory, onDeleteStory, onClearHistory }) => {
    
    const handleClearClick = () => {
        if (window.confirm('Are you sure you want to delete all saved stories? This action cannot be undone.')) {
            onClearHistory();
        }
    };

    return (
        <div className="h-full flex flex-col">
            {history.length > 0 && (
                <div className="mb-4 text-right">
                    <button
                        onClick={handleClearClick}
                        className="text-sm text-slate-400 hover:text-red-500 data-[theme='high-contrast']:hover:text-red-400 font-semibold transition-colors"
                        aria-label="Clear all saved stories"
                    >
                        <i className="fas fa-trash-alt mr-1"></i> Clear History
                    </button>
                </div>
            )}
            {history.length > 0 ? (
                <ul className="space-y-4 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                    {history.map(item => (
                        <HistoryItemCard
                            key={item.id}
                            item={item}
                            onLoad={() => onLoadStory(item)}
                            onDelete={() => onDeleteStory(item.id)}
                        />
                    ))}
                </ul>
            ) : (
                <p className="text-slate-400 italic">Saved stories will appear here.</p>
            )}
        </div>
    );
};