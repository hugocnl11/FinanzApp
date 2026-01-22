import React from 'react';
import { cn } from '../utils/cn';

interface TabsProps {
  tabs: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex space-x-2 mb-8', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          aria-controls={`tab-panel-${tab.value}`}
          tabIndex={value === tab.value ? 0 : -1}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            value === tab.value
              ? 'bg-gray-100 dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
          )}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
} 