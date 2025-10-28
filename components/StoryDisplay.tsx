import React from 'react';
import { type StorySegment } from '../types';

interface StoryDisplayProps {
    segments: StorySegment[] | undefined;
    onSelectionChange: () => void;
    onSegmentClick: (index: number) => void;
    currentSegmentIndex: number | null;
    languageName: string;
    isLoading: boolean;
    isStoryContrast: boolean;
}

const StoryColumn: React.FC<{
    title: string;
    titleId: string;
    segments: StorySegment[] | undefined;
    textExtractor: (segment: StorySegment) => string;
    onSegmentClick?: (index: number) => void;
    currentSegmentIndex: number | null;
    placeholder: string;
    isLoading: boolean;
    isStoryContrast: boolean;
}> = ({ title, titleId, segments, textExtractor, onSegmentClick, currentSegmentIndex, placeholder, isLoading, isStoryContrast }) => (
    <div 
        role="region" 
        aria-labelledby={titleId} 
        className="bg-slate-800 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:border data-[theme='high-contrast']:border-white p-6 rounded-xl shadow-lg flex-1 min-h-[200px] data-[story-contrast=true]:bg-slate-200 data-[story-contrast=true]:text-slate-900"
        data-story-contrast={isStoryContrast}
    >
        <h3 
            id={titleId} 
            className="text-xl font-bold text-teal-400 data-[theme='high-contrast']:text-yellow-300 mb-4 data-[story-contrast=true]:text-teal-600"
        >
            {title}
        </h3>
        {isLoading && !segments ? (
            <div className="space-y-4 animate-pulse">
                {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-slate-700 data-[theme='high-contrast']:bg-gray-800 rounded w-full data-[story-contrast=true]:bg-slate-300"></div>)}
            </div>
        ) : segments && segments.length > 0 ? (
            <div className="space-y-1">
                {segments.map((segment, index) => {
                    const content = textExtractor(segment);
                    const isInteractive = !!onSegmentClick;
                    const baseClasses = `p-2 rounded transition-colors duration-200 w-full text-left`;
                    const stateClasses = isInteractive
                        ? `cursor-pointer ${currentSegmentIndex === index 
                            ? 'bg-teal-900/50 data-[theme=\'high-contrast\']:bg-yellow-300/30 data-[story-contrast=true]:bg-teal-200' 
                            : 'hover:bg-slate-700/50 data-[theme=\'high-contrast\']:hover:bg-gray-700 data-[story-contrast=true]:hover:bg-slate-300/50'}`
                        : '';

                    if (isInteractive) {
                        return (
                            <button
                                key={index}
                                onClick={() => onSegmentClick(index)}
                                className={`${baseClasses} ${stateClasses}`}
                                aria-label={`Play sentence ${index + 1}: ${content}`}
                            >
                                {content}
                            </button>
                        );
                    }
                    return (
                        <p key={index} className={`${baseClasses} ${stateClasses}`}>
                            {content}
                        </p>
                    );
                })}
            </div>
        ) : (
            <p className="text-slate-400 italic data-[story-contrast=true]:text-slate-600">{placeholder}</p>
        )}
    </div>
);


export const StoryDisplay: React.FC<StoryDisplayProps> = ({ segments, onSelectionChange, onSegmentClick, currentSegmentIndex, languageName, isLoading, isStoryContrast }) => {
    return (
        <div className="flex flex-col md:flex-row gap-6" onMouseUp={onSelectionChange}>
            <StoryColumn
                title="English"
                titleId="english-story-column"
                segments={segments}
                textExtractor={segment => segment.english}
                currentSegmentIndex={currentSegmentIndex}
                placeholder="Your story's English translation will appear here..."
                isLoading={isLoading}
                isStoryContrast={isStoryContrast}
            />
            <StoryColumn
                title={languageName}
                titleId="translated-story-column"
                segments={segments}
                textExtractor={segment => segment.translated}
                onSegmentClick={onSegmentClick}
                currentSegmentIndex={currentSegmentIndex}
                placeholder={`Your story in ${languageName} will appear here...`}
                isLoading={isLoading}
                isStoryContrast={isStoryContrast}
            />
        </div>
    );
};