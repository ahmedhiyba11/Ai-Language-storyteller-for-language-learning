import React from 'react';
import { type StorySegment } from '../types';

interface StoryDisplayProps {
    segments: StorySegment[] | undefined;
    onSelectionChange: () => void;
    onSegmentClick: (index: number) => void;
    currentSegmentIndex: number | null;
    languageName: string;
    isLoading: boolean;
}

const StoryColumn: React.FC<{
    title: string;
    segments: StorySegment[] | undefined;
    textExtractor: (segment: StorySegment) => string;
    onSegmentClick?: (index: number) => void;
    currentSegmentIndex: number | null;
    placeholder: string;
    isLoading: boolean;
}> = ({ title, segments, textExtractor, onSegmentClick, currentSegmentIndex, placeholder, isLoading }) => (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex-1 min-h-[200px]">
        <h3 className="text-xl font-bold text-teal-400 mb-4">{title}</h3>
        {isLoading && !segments ? (
            <div className="space-y-4 animate-pulse">
                {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-slate-700 rounded w-full"></div>)}
            </div>
        ) : segments && segments.length > 0 ? (
            <div className="space-y-2">
                {segments.map((segment, index) => (
                    <p
                        key={index}
                        onClick={() => onSegmentClick?.(index)}
                        className={`p-2 rounded transition-colors duration-200 ${onSegmentClick ? 'cursor-pointer' : ''} ${currentSegmentIndex === index ? 'bg-teal-900/50' : onSegmentClick ? 'hover:bg-slate-700/50' : ''}`}
                    >
                        {textExtractor(segment)}
                    </p>
                ))}
            </div>
        ) : (
            <p className="text-slate-400 italic">{placeholder}</p>
        )}
    </div>
);


export const StoryDisplay: React.FC<StoryDisplayProps> = ({ segments, onSelectionChange, onSegmentClick, currentSegmentIndex, languageName, isLoading }) => {
    return (
        <div className="flex flex-col md:flex-row gap-6" onMouseUp={onSelectionChange}>
            <StoryColumn
                title="English"
                segments={segments}
                textExtractor={segment => segment.english}
                currentSegmentIndex={currentSegmentIndex}
                placeholder="Your story's English translation will appear here..."
                isLoading={isLoading}
            />
            <StoryColumn
                title={languageName}
                segments={segments}
                textExtractor={segment => segment.translated}
                onSegmentClick={onSegmentClick}
                currentSegmentIndex={currentSegmentIndex}
                placeholder={`Your story in ${languageName} will appear here...`}
                isLoading={isLoading}
            />
        </div>
    );
};
