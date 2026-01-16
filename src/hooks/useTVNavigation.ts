// TV Navigation Hook - Handles D-pad navigation for Smart TVs

import { useEffect, useCallback, useRef } from 'react';

// Key codes for TV remotes
const TV_KEYS = {
    // Arrow keys
    UP: ['ArrowUp', '38'],
    DOWN: ['ArrowDown', '40'],
    LEFT: ['ArrowLeft', '37'],
    RIGHT: ['ArrowRight', '39'],

    // Action keys - Samsung OK button uses 13, 29443, or space (32)
    ENTER: ['Enter', '13', '29443', ' ', '32', 'Select'],
    BACK: ['Backspace', 'XF86Back', '10009', '8', '461'], // Samsung, LG, etc.

    // Media keys
    PLAY: ['MediaPlayPause', '415'],
    PAUSE: ['MediaPause', '19'],
    STOP: ['MediaStop', '413'],

    // Color keys (Samsung/LG)
    RED: ['ColorF0Red', '403'],
    GREEN: ['ColorF1Green', '404'],
    YELLOW: ['ColorF2Yellow', '405'],
    BLUE: ['ColorF3Blue', '406'],
};

type Direction = 'up' | 'down' | 'left' | 'right';
type TVAction = 'enter' | 'back' | 'play' | 'pause' | 'stop';

interface UseTVNavigationOptions {
    onNavigate?: (direction: Direction) => void;
    onAction?: (action: TVAction) => void;
    onBack?: () => void;
    onEnter?: () => void;
    enabled?: boolean;
}

// Check if key matches any of the codes
const matchKey = (key: string | number, codes: string[]): boolean => {
    return codes.includes(String(key)) || codes.includes(String(key));
};

export function useTVNavigation(options: UseTVNavigationOptions = {}) {
    const { onNavigate, onAction, onBack, onEnter, enabled = true } = options;

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        const key = event.key || String(event.keyCode);

        // Navigation
        if (matchKey(key, TV_KEYS.UP)) {
            event.preventDefault();
            onNavigate?.('up');
        } else if (matchKey(key, TV_KEYS.DOWN)) {
            event.preventDefault();
            onNavigate?.('down');
        } else if (matchKey(key, TV_KEYS.LEFT)) {
            event.preventDefault();
            onNavigate?.('left');
        } else if (matchKey(key, TV_KEYS.RIGHT)) {
            event.preventDefault();
            onNavigate?.('right');
        }
        // Actions
        else if (matchKey(key, TV_KEYS.ENTER)) {
            event.preventDefault();
            onEnter?.();
            onAction?.('enter');
        } else if (matchKey(key, TV_KEYS.BACK)) {
            event.preventDefault();
            onBack?.();
            onAction?.('back');
        }
        // Media
        else if (matchKey(key, TV_KEYS.PLAY)) {
            event.preventDefault();
            onAction?.('play');
        } else if (matchKey(key, TV_KEYS.PAUSE)) {
            event.preventDefault();
            onAction?.('pause');
        } else if (matchKey(key, TV_KEYS.STOP)) {
            event.preventDefault();
            onAction?.('stop');
        }
    }, [enabled, onNavigate, onAction, onBack, onEnter]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

// Focus management for TV navigation
export function useFocusManager<T extends HTMLElement>() {
    const containerRef = useRef<T>(null);
    const focusedIndexRef = useRef(0);

    const getFocusableElements = useCallback(() => {
        if (!containerRef.current) return [];
        return Array.from(containerRef.current.querySelectorAll('[data-focusable="true"]')) as HTMLElement[];
    }, []);

    const focusElement = useCallback((index: number) => {
        const elements = getFocusableElements();
        if (elements.length === 0) return;

        // Clamp index
        const newIndex = Math.max(0, Math.min(index, elements.length - 1));
        focusedIndexRef.current = newIndex;

        // Remove focus from all
        elements.forEach(el => el.classList.remove('tv-focused'));

        // Add focus to target
        const target = elements[newIndex];
        if (target) {
            target.classList.add('tv-focused');
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }, [getFocusableElements]);

    const moveFocus = useCallback((delta: number) => {
        focusElement(focusedIndexRef.current + delta);
    }, [focusElement]);

    const getCurrentElement = useCallback(() => {
        const elements = getFocusableElements();
        return elements[focusedIndexRef.current] || null;
    }, [getFocusableElements]);

    return {
        containerRef,
        focusElement,
        moveFocus,
        getCurrentElement,
        focusedIndex: focusedIndexRef.current,
    };
}

// Grid navigation hook
export function useGridNavigation(columns: number) {
    const containerRef = useRef<HTMLDivElement>(null);
    const focusedIndexRef = useRef(0);

    const getFocusableElements = useCallback(() => {
        if (!containerRef.current) return [];
        return Array.from(containerRef.current.querySelectorAll('[data-focusable="true"]')) as HTMLElement[];
    }, []);

    const focusElement = useCallback((index: number) => {
        const elements = getFocusableElements();
        if (elements.length === 0) return;

        const newIndex = Math.max(0, Math.min(index, elements.length - 1));
        focusedIndexRef.current = newIndex;

        elements.forEach(el => el.classList.remove('tv-focused'));

        const target = elements[newIndex];
        if (target) {
            target.classList.add('tv-focused');
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
    }, [getFocusableElements]);

    const handleNavigate = useCallback((direction: Direction) => {
        const elements = getFocusableElements();
        const current = focusedIndexRef.current;
        let newIndex = current;

        switch (direction) {
            case 'up':
                newIndex = current - columns;
                break;
            case 'down':
                newIndex = current + columns;
                break;
            case 'left':
                if (current % columns !== 0) newIndex = current - 1;
                break;
            case 'right':
                if ((current + 1) % columns !== 0) newIndex = current + 1;
                break;
        }

        if (newIndex >= 0 && newIndex < elements.length) {
            focusElement(newIndex);
        }
    }, [columns, getFocusableElements, focusElement]);

    return {
        containerRef,
        focusElement,
        handleNavigate,
        getCurrentIndex: () => focusedIndexRef.current,
    };
}
