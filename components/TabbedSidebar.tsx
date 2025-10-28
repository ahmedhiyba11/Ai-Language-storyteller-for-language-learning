import React, { useState } from 'react';

interface TabbedSidebarProps {
    tabs: { [key: string]: { icon: string, content: React.ReactNode } };
}

export const TabbedSidebar: React.FC<TabbedSidebarProps> = ({ tabs }) => {
    const tabKeys = Object.keys(tabs);
    const [activeTab, setActiveTab] = useState<string>(tabKeys[0]);

    const baseTabClass = "flex-1 py-3 px-4 text-center font-semibold transition-colors duration-200 rounded-t-lg";
    const inactiveTabClass = "text-slate-400 bg-slate-800 hover:bg-slate-700/50 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:hover:bg-gray-800";
    const activeTabClass = "text-indigo-400 bg-slate-700/80 data-[theme='high-contrast']:text-cyan-400 data-[theme='high-contrast']:bg-gray-800";


    return (
        <div className="bg-slate-800 data-[theme='high-contrast']:bg-black data-[theme='high-contrast']:border data-[theme='high-contrast']:border-white rounded-xl shadow-lg h-full flex flex-col">
            <div className="flex border-b border-slate-700 data-[theme='high-contrast']:border-slate-600">
                {tabKeys.map(key => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`${baseTabClass} ${activeTab === key ? activeTabClass : inactiveTabClass}`}
                        role="tab"
                        aria-selected={activeTab === key}
                    >
                        <i className={`${tabs[key].icon} mr-2`}></i> {key}
                    </button>
                ))}
            </div>
            <div className="p-6 flex-grow overflow-hidden">
                {tabs[activeTab].content}
            </div>
        </div>
    );
};