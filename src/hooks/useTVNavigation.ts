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
    PLAY: ['MediaPlayPause', 'MediaPlay', '415', '10252', '179'],
    PAUSE: ['MediaPause', '19'],
    STOP: ['MediaStop', '413'],
    FORWARD: ['MediaFastForward', '417', '228'],
    REWIND: ['MediaRewind', '412', '227'],

    // Color keys (Samsung/LG)
    RED: ['ColorF0Red', '403'],
    GREEN: ['ColorF1Green', '404'],
    YELLOW: ['ColorF2Yellow', '405'],
    BLUE: ['ColorF3Blue', '406'],
};

type Direction = 'up' | 'down' | 'left' | 'right';
type TVAction = 'enter' | 'back' | 'play' | 'pause' | 'stop' | 'forward' | 'rewind';
type TizenHardwareKeyEvent = Event & { keyName?: string };

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

        // Quando o foco esta num input/textarea, deixamos a digitacao NATIVA passar
        // (letras, numeros, ESPACO e BACKSPACE) — so reagimos as teclas REAIS de controle
        // remoto de TV pra fechar o teclado virtual. NUNCA interceptar Backspace/Espaco aqui,
        // senao o usuario nao consegue apagar/digitar (bug do campo de codigo do revendedor).
        const target = event.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
            // Enter "de verdade" (NAO o Espaco) confirma e fecha o teclado
            const isRealEnter = ['Enter', '13', '29443', 'Select', 'Go', 'Done'].includes(String(key));
            // Back/Return de controle remoto de TV (Tizen 10009, webOS 461, generico, Escape) — NAO Backspace
            const isTvBack = ['XF86Back', '10009', '461', 'Escape'].includes(String(key));
            if (isRealEnter) {
                event.preventDefault();
                event.stopPropagation();
                target.blur();
                onEnter?.();
                onAction?.('enter');
            } else if (isTvBack) {
                event.preventDefault();
                event.stopPropagation();
                target.blur();
                onBack?.();
                onAction?.('back');
            }
            // Qualquer outra tecla (incl. Backspace, Espaco, numeros, letras) -> digitacao normal
            return;
        }

        // Navigation
        if (matchKey(key, TV_KEYS.UP)) {
            if (onNavigate) { event.preventDefault(); onNavigate('up'); }
        } else if (matchKey(key, TV_KEYS.DOWN)) {
            if (onNavigate) { event.preventDefault(); onNavigate('down'); }
        } else if (matchKey(key, TV_KEYS.LEFT)) {
            if (onNavigate) { event.preventDefault(); onNavigate('left'); }
        } else if (matchKey(key, TV_KEYS.RIGHT)) {
            if (onNavigate) { event.preventDefault(); onNavigate('right'); }
        }
        // Actions
        else if (matchKey(key, TV_KEYS.ENTER)) {
            if (onEnter || onAction) {
                event.preventDefault();
                onEnter?.();
                onAction?.('enter');
            }
        } else if (matchKey(key, TV_KEYS.BACK)) {
            if (onBack || onAction) {
                event.preventDefault();
                onBack?.();
                onAction?.('back');
            }
        }
        // Media
        else if (matchKey(key, TV_KEYS.PLAY)) {
            if (onAction) { event.preventDefault(); onAction('play'); }
        } else if (matchKey(key, TV_KEYS.PAUSE)) {
            if (onAction) { event.preventDefault(); onAction('pause'); }
        } else if (matchKey(key, TV_KEYS.STOP)) {
            if (onAction) { event.preventDefault(); onAction('stop'); }
        } else if (matchKey(key, TV_KEYS.FORWARD)) {
            if (onAction) { event.preventDefault(); onAction('forward'); }
        } else if (matchKey(key, TV_KEYS.REWIND)) {
            if (onAction) { event.preventDefault(); onAction('rewind'); }
        }
    }, [enabled, onNavigate, onAction, onBack, onEnter]);

    useEffect(() => {
        // Custom handler for Tizen hardware 'back' key when keyboard is open
        const handleTizenHwKey = (e: TizenHardwareKeyEvent) => {
            if (e.keyName === 'back' || e.keyName === 'Return') {
                const active = document.activeElement as HTMLElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
                    active.blur();
                    // Let TV close the keyboard
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('tizenhwkey', handleTizenHwKey as EventListener);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('tizenhwkey', handleTizenHwKey as EventListener);
        };
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
        getFocusedIndex: () => focusedIndexRef.current,
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
