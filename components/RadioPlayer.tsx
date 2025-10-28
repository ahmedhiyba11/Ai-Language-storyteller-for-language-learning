import React, { useState, useRef, useEffect, useCallback } from 'react';
import { type Language } from '../types';

interface RadioPlayerProps {
    language: Language;
}

export const RadioPlayer: React.FC<RadioPlayerProps> = ({ language }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentStreamIndex, setCurrentStreamIndex] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    const cleanupVisualizer = useCallback(() => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
    }, []);

    // Effect to stop audio and reset state when the language changes
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        }
        setIsPlaying(false);
        setIsLoading(false);
        setError(null);
        setCurrentStreamIndex(0);
        cleanupVisualizer();
    }, [language, cleanupVisualizer]);
    
    const drawVisualizer = useCallback(() => {
        if (!analyserRef.current || !canvasRef.current) return;
        const analyser = analyserRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            animationFrameIdRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 1.5;
            let barHeight;
            let x = 0;

            const isHighContrast = document.documentElement.dataset.theme === 'high-contrast';
            ctx.fillStyle = isHighContrast ? '#facc15' : '#2dd4bf'; 

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                if (barHeight < 2) barHeight = 2; 

                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 2;
            }
        };
        draw();
    }, []);

    const setupVisualizer = useCallback(() => {
        if (!audioRef.current) return;
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioContext = audioContextRef.current;
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        if (!sourceRef.current || sourceRef.current.mediaElement !== audioRef.current) {
             cleanupVisualizer();
             sourceRef.current = audioContext.createMediaElementSource(audioRef.current);
        }
        
        if (!analyserRef.current) {
            analyserRef.current = audioContext.createAnalyser();
        }
        const analyser = analyserRef.current;
        analyser.fftSize = 128;

        sourceRef.current.connect(analyser);
        analyser.connect(audioContext.destination);

        drawVisualizer();
    }, [drawVisualizer, cleanupVisualizer]);

    // Effect for handling the actual playback logic
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !isLoading || isPlaying || !language.radioUrls?.length) {
            return;
        }

        if (currentStreamIndex >= language.radioUrls.length) {
            setError("All available streams for this station failed. Please try again later.");
            setIsLoading(false);
            setIsPlaying(false);
            return;
        }

        const url = language.radioUrls[currentStreamIndex];
        audio.src = url;
        audio.play().catch(err => {
            if (err.name === 'NotAllowedError') {
                setError('Playback was blocked by the browser. Click play to start.');
                setIsLoading(false);
            }
            // Other errors are handled by the 'error' event listener, which will trigger a fallback
        });

    }, [isLoading, isPlaying, currentStreamIndex, language]);

    // Effect for setting up and tearing down audio element event listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePlaying = () => {
            setIsLoading(false);
            setIsPlaying(true);
            setError(null);
            setupVisualizer();
        };

        const handlePause = () => {
            setIsPlaying(false);
            cleanupVisualizer();
        };
        
        const handleError = (e: ErrorEvent) => {
            // Only try to fallback if we are in a loading state
            if (isLoading) {
                console.error(`Stream error on URL: ${audio.src}`);
                setCurrentStreamIndex(index => index + 1);
            }
        };

        const handleWaiting = () => {
            if (isPlaying) {
                setIsLoading(true);
            }
        };

        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('error', handleError as EventListener);
        audio.addEventListener('waiting', handleWaiting);

        return () => {
            audio.removeEventListener('playing', handlePlaying);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('error', handleError as EventListener);
            audio.removeEventListener('waiting', handleWaiting);
        };
    }, [isLoading, isPlaying, setupVisualizer, cleanupVisualizer]);


    const handlePlayPause = () => {
        if (!language.radioUrls || language.radioUrls.length === 0) return;

        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            setError(null);
            setCurrentStreamIndex(0);
            setIsLoading(true);
        }
    };

    if (!language.radioName || !language.radioUrls || language.radioUrls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <i className="fas fa-satellite-dish text-5xl text-slate-500 mb-4"></i>
                <h4 className="text-xl font-semibold text-slate-300">No Radio Available</h4>
                <p className="text-slate-400 mt-1">A live radio station for {language.name} is not available at this time.</p>
            </div>
        );
    }
    
    let buttonIcon;
    if (isLoading) {
        buttonIcon = <i className="fas fa-spinner fa-spin text-2xl"></i>;
    } else if (isPlaying) {
        buttonIcon = <i className="fas fa-pause text-2xl"></i>;
    } else {
        buttonIcon = <i className="fas fa-play text-2xl"></i>;
    }

    return (
        <div className="flex flex-col items-center justify-between h-full text-center p-4 bg-slate-700/50 data-[theme='high-contrast']:bg-gray-900 rounded-lg">
             <audio ref={audioRef} preload="none" crossOrigin="anonymous"/>
            
            <div className="w-full">
                <div className="flex items-center justify-center gap-3">
                     <i className="fas fa-broadcast-tower text-3xl text-teal-400 data-[theme='high-contrast']:text-yellow-300"></i>
                     <div>
                        <h3 className="text-xl font-bold text-slate-100">{language.radioName}</h3>
                        <p className="text-sm text-slate-400">Live News & Talk in {language.name}</p>
                     </div>
                </div>

                <div className="mt-3 h-6 text-center text-teal-300 data-[theme='high-contrast']:text-yellow-200">
                    {isPlaying && (
                        <p className="font-semibold" title="Currently On Air">
                           <i className="fas fa-satellite-dish mr-2 animate-pulse"></i>
                           Currently On Air
                        </p>
                    )}
                </div>
            </div>

            <div className="w-full h-24 flex items-center justify-center my-4">
                {error ? (
                     <div className="text-red-400 flex flex-col items-center gap-2">
                        <i className="fas fa-exclamation-triangle text-3xl"></i>
                        <p className="text-sm max-w-xs">{error}</p>
                    </div>
                ) : isPlaying ? (
                    <canvas ref={canvasRef} width="250" height="80"></canvas>
                ) : (
                    <div className="text-slate-500 text-3xl">
                        <i className="fas fa-headphones"></i>
                    </div>
                )}
            </div>
             
             <div className="w-full flex flex-col items-center">
                 {isPlaying && (
                     <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full mb-4 animate-pulse">
                         LIVE
                     </div>
                 )}
                 <button
                    onClick={handlePlayPause}
                    className={`bg-teal-500 hover:bg-teal-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white data-[theme='high-contrast']:bg-yellow-400 data-[theme='high-contrast']:hover:bg-yellow-500 data-[theme='high-contrast']:text-black font-bold h-16 w-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 duration-200 shadow-lg ${isLoading ? 'animate-pulse' : ''}`}
                    aria-label={isPlaying ? `Pause ${language.radioName}` : `Play ${language.radioName}`}
                 >
                    {buttonIcon}
                 </button>
             </div>
        </div>
    );
};
