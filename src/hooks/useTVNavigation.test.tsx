import { describe, it, expect, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useTVNavigation } from './useTVNavigation';

// Harness: monta o hook (anexa o listener global) + um input pra focar
function Harness() {
    useTVNavigation({ onNavigate: () => {}, onEnter: () => {}, onBack: () => {} });
    return createElement('input', { id: 'fld' });
}

let root: Root;
let container: HTMLDivElement;

function mount() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root.render(createElement(Harness)); });
}

afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
});

// Foca o input e dispara um keydown; retorna se o evento foi "comido" (preventDefault)
function press(key: string): boolean {
    const input = document.getElementById('fld') as HTMLInputElement;
    input.focus();
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    act(() => { input.dispatchEvent(ev); });
    return ev.defaultPrevented;
}

describe('useTVNavigation — digitacao em inputs', () => {
    it('NAO bloqueia numeros, letras, espaco e backspace (campo de codigo do revendedor)', () => {
        mount();
        expect(press('9')).toBe(false);
        expect(press('0')).toBe(false);
        expect(press('A')).toBe(false);
        expect(press(' ')).toBe(false);
        expect(press('Backspace')).toBe(false);
    });

    it('ainda fecha o teclado nas teclas reais de controle remoto (Enter/Escape)', () => {
        mount();
        expect(press('Enter')).toBe(true);
        expect(press('Escape')).toBe(true);
    });
});
