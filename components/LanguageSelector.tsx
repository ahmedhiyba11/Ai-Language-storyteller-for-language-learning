import React from 'react';
import { type Language } from '../types';

interface LanguageSelectorProps {
    languages: Language[];
    selectedLanguage: Language;
    onChange: (language: Language) => void;
    disabled: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ languages, selectedLanguage, onChange, disabled }) => {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedLang = languages.find(lang => lang.code === event.target.value);
        if (selectedLang) {
            onChange(selectedLang);
        }
    };
    
    return (
        <div className="flex items-center gap-2">
            <label htmlFor="language-select" className="text-slate-300 data-[theme='high-contrast']:text-slate-100 font-medium">Learn:</label>
            <select
                id="language-select"
                value={selectedLanguage.code}
                onChange={handleChange}
                disabled={disabled}
                className="bg-slate-700 border border-slate-600 text-white text-md rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5
                           data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:border-white data-[theme='high-contrast']:focus:ring-yellow-400 data-[theme='high-contrast']:focus:border-yellow-400"
            >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.name}
                    </option>
                ))}
            </select>
        </div>
    );
};