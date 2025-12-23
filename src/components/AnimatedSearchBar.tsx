// AnimatedSearchBar Component - Matching Original App Animations
// Features: Pulse glow, icon bounce, slide expand, border flow

import { useState, useRef, useEffect } from 'react';
import './AnimatedSearchBar.css';

interface AnimatedSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function AnimatedSearchBar({ value, onChange, placeholder = "Buscar..." }: AnimatedSearchBarProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    const handleToggle = () => {
        if (isExpanded && value === '') {
            setIsExpanded(false);
        } else if (isExpanded && value !== '') {
            onChange('');
        } else {
            setIsExpanded(true);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (value === '') {
            setTimeout(() => setIsExpanded(false), 200);
        }
    };

    return (
        <div className="search-container">
            <div className={`search-input-wrapper ${isFocused ? 'focused' : ''} ${isExpanded ? 'expanded' : ''}`}>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    className={`search-input ${isExpanded ? 'expanded' : ''}`}
                />
            </div>

            <button
                onClick={handleToggle}
                className={`search-btn ${isExpanded ? 'expanded' : ''}`}
            >
                {isExpanded && value ? (
                    <svg
                        className="search-btn-icon clear-icon"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                ) : (
                    <svg
                        className="search-btn-icon"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                )}
            </button>
        </div>
    );
}
