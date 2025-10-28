import React from 'react';
import { type Theme } from '../types';

interface AccessibilityControlsProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isDyslexiaFont: boolean;
    setIsDyslexiaFont: (isDyslexiaFont: boolean) => void;
    isStoryContrast: boolean;
    setIsStoryContrast: (isStoryContrast: boolean) => void;
}

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({ theme, setTheme, isDyslexiaFont, setIsDyslexiaFont, isStoryContrast, setIsStoryContrast }) => {
    
    const toggleTheme = () => {
        setTheme(theme === 'default' ? 'high-contrast' : 'default');
    };

    const toggleFont = () => {
        setIsDyslexiaFont(!isDyslexiaFont);
    };

    const toggleStoryContrast = () => {
        setIsStoryContrast(!isStoryContrast);
    };

    const baseButtonClass = "flex items-center gap-2 p-2 rounded-lg border-2 transition-colors duration-200";
    const highContrastButtonClass = "border-slate-500 hover:bg-slate-700 data-[theme='high-contrast']:border-slate-300 data-[theme='high-contrast']:hover:bg-gray-700";
    const activeHighContrastButtonClass = "bg-slate-700 data-[theme='high-contrast']:bg-gray-700";

    return (
        <div className="absolute top-0 right-0 flex items-center gap-2 p-2">
            <button
                onClick={toggleTheme}
                aria-pressed={theme === 'high-contrast'}
                title="Toggle High Contrast Mode"
                className={`${baseButtonClass} ${highContrastButtonClass} ${theme === 'high-contrast' ? activeHighContrastButtonClass : ''}`}
            >
                <i className="fas fa-adjust" aria-hidden="true"></i>
                <span className="hidden sm:inline">Contrast</span>
            </button>
            <button
                onClick={toggleFont}
                aria-pressed={isDyslexiaFont}
                title="Toggle Dyslexia-Friendly Font"
                className={`${baseButtonClass} ${highContrastButtonClass} ${isDyslexiaFont ? activeHighContrastButtonClass : ''}`}
            >
                <i className="fas fa-font" aria-hidden="true"></i>
                 <span className="hidden sm:inline">Font</span>
            </button>
            <button
                onClick={toggleStoryContrast}
                aria-pressed={isStoryContrast}
                title="Toggle Story Contrast"
                className={`${baseButtonClass} ${highContrastButtonClass} ${isStoryContrast ? activeHighContrastButtonClass : ''}`}
            >
                <i className="fas fa-circle-half-stroke" aria-hidden="true"></i>
                <span className="hidden sm:inline">Story</span>
            </button>
        </div>
    );
};