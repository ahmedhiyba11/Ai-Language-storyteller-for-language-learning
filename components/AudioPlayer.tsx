import React from 'react';
import { Story } from '../types';

interface AudioPlayerProps {
    isPlaying: boolean;
    isDisabled: boolean;
    onPlayPause: () => void;
    story: Story | null;
    currentSegmentIndex: number | null;
    playbackRate: number;
    onPlaybackRateChange: (rate: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ isPlaying, isDisabled, onPlayPause, story, currentSegmentIndex, playbackRate, onPlaybackRateChange }) => {

    const getStatusText = () => {
        if (isDisabled && !story) return "Generate a story to begin";
        if (isPlaying && currentSegmentIndex !== null) {
            return `Playing sentence ${currentSegmentIndex + 1} of ${story?.segments.length}`;
        }
        if (!isPlaying && currentSegmentIndex !== null) {
            return `Paused at sentence ${currentSegmentIndex + 1}`;
        }
        if (story) {
            return `Ready to play (${story.segments.length} sentences)`;
        }
        return "Ready";
    }

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-800 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:border data-[theme='high-contrast']:border-white rounded-lg w-full">
            <button 
                onClick={onPlayPause} 
                disabled={isDisabled} 
                className="bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white data-[theme='high-contrast']:bg-yellow-400 data-[theme='high-contrast']:hover:bg-yellow-500 data-[theme='high-contrast']:text-black font-bold h-12 w-12 rounded-full flex items-center justify-center transition-transform transform hover:scale-105 duration-200 flex-shrink-0"
                aria-label={isPlaying ? 'Pause story' : 'Play story from beginning'}
            >
                {isPlaying ? (
                    <i className="fas fa-pause text-xl"></i>
                ) : (
                    <i className="fas fa-play text-xl"></i>
                )}
            </button>
            <div className="flex-grow">
                 <div className="text-slate-300 data-[theme='high-contrast']:text-slate-100 font-medium">Story Audio</div>
                 <div className="text-sm text-slate-400 data-[theme='high-contrast']:text-slate-300 capitalize">{getStatusText()}</div>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="speed-control" className="text-sm font-medium text-slate-300 data-[theme='high-contrast']:text-slate-100">
                    <i className="fas fa-tachometer-alt mr-1"></i> Speed
                </label>
                <input
                    id="speed-control"
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.25"
                    value={playbackRate}
                    onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
                    className="w-24 h-2 bg-slate-700 data-[theme='high-contrast']:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    disabled={isDisabled}
                    aria-label="Playback speed control"
                />
                <span className="text-sm font-mono w-12 text-center text-slate-400 data-[theme='high-contrast']:text-slate-300" aria-live="off">
                    {playbackRate.toFixed(2)}x
                </span>
            </div>
        </div>
    );
};