import React from 'react';
// FIX: Rename imported type `StoryOptions` to `StoryOptionsType` to avoid conflict with the component name.
import { type StoryOptions as StoryOptionsType, type Difficulty, type Tone, type VocabFocus, type StoryLength } from '../types';
import { DIFFICULTIES, TONES, VOCAB_FOCUSES, STORY_LENGTHS } from '../constants';

interface StoryOptionsProps {
    options: StoryOptionsType;
    onOptionsChange: (newOptions: StoryOptionsType) => void;
    disabled: boolean;
}

const Selector: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { id: string; label: string }[];
    disabled: boolean;
}> = ({ id, label, value, onChange, options, disabled }) => (
    <div className="flex flex-col gap-1 w-full">
        <label htmlFor={id} className="text-sm text-slate-300 data-[theme='high-contrast']:text-slate-100 font-medium">
            {label}
        </label>
        <select
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="bg-slate-700 border border-slate-600 text-white text-md rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5
                       data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:border-white data-[theme='high-contrast']:focus:ring-yellow-400 data-[theme='high-contrast']:focus:border-yellow-400"
        >
            {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

export const StoryOptions: React.FC<StoryOptionsProps> = ({ options, onOptionsChange, disabled }) => {
    const handleOptionChange = (field: keyof StoryOptionsType, value: string) => {
        onOptionsChange({ ...options, [field]: value });
    };

    return (
        <div className="mt-4 p-4 bg-slate-800/50 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:border data-[theme='high-contrast']:border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-200 data-[theme='high-contrast']:text-slate-100 mb-3 text-center sm:text-left">Story Personalization</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Selector
                    id="difficulty-select"
                    label="Difficulty Level"
                    value={options.difficulty}
                    onChange={(e) => handleOptionChange('difficulty', e.target.value as Difficulty)}
                    options={DIFFICULTIES}
                    disabled={disabled}
                />
                <Selector
                    id="tone-select"
                    label="Story Tone"
                    value={options.tone}
                    onChange={(e) => handleOptionChange('tone', e.target.value as Tone)}
                    options={TONES}
                    disabled={disabled}
                />
                <Selector
                    id="vocab-focus-select"
                    label="Vocabulary Focus"
                    value={options.vocabFocus}
                    onChange={(e) => handleOptionChange('vocabFocus', e.target.value as VocabFocus)}
                    options={VOCAB_FOCUSES}
                    disabled={disabled}
                />
                 <Selector
                    id="length-select"
                    label="Story Length"
                    value={options.length}
                    onChange={(e) => handleOptionChange('length', e.target.value as StoryLength)}
                    options={STORY_LENGTHS}
                    disabled={disabled}
                />
            </div>
        </div>
    );
};