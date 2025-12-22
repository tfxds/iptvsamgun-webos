// Category Menu Component - Hamburger Button + Slide Panel
// Matching Original App Animations

import { useState, useRef, useEffect } from 'react';
import type { Category } from '../types';
import './CategoryMenu.css';

interface CategoryMenuProps {
    categories: Category[];
    selectedCategory: string;
    onSelectCategory: (categoryId: string) => void;
    type?: 'live' | 'vod' | 'series';
}

export function CategoryMenu({
    categories,
    selectedCategory,
    onSelectCategory,
    type = 'vod'
}: CategoryMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const handleClose = () => {
        setIsClosing(true);
        // Wait for closing animation to finish
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 300);
    };

    const handleOpen = () => {
        setIsClosing(false);
        setIsOpen(true);
    };

    const handleToggle = () => {
        if (isOpen) {
            handleClose();
        } else {
            handleOpen();
        }
    };

    const handleSelectCategory = (categoryId: string) => {
        onSelectCategory(categoryId);
        handleClose();
    };

    const getCategoryIcon = (name: string): string => {
        const lower = name.toLowerCase();
        if (lower.includes('ação') || lower.includes('action')) return '⚡';
        if (lower.includes('aventura') || lower.includes('adventure')) return '🧭';
        if (lower.includes('drama')) return '🎭';
        if (lower.includes('romance')) return '❤️';
        if (lower.includes('comédia') || lower.includes('comedy')) return '😂';
        if (lower.includes('terror') || lower.includes('horror')) return '👻';
        if (lower.includes('suspense') || lower.includes('thriller')) return '😱';
        if (lower.includes('ficção') || lower.includes('sci-fi')) return '🚀';
        if (lower.includes('fantasia') || lower.includes('fantasy')) return '🧙';
        if (lower.includes('animação') || lower.includes('animation')) return '🎨';
        if (lower.includes('anime')) return '⚔️';
        if (lower.includes('infantil') || lower.includes('kids')) return '⭐';
        if (lower.includes('documentário') || lower.includes('documentary')) return '🎬';
        if (lower.includes('crime') || lower.includes('policial')) return '🔍';
        if (lower.includes('guerra') || lower.includes('war')) return '⚔️';
        if (lower.includes('esporte') || lower.includes('sport')) return '⚽';
        if (lower.includes('música') || lower.includes('music')) return '🎵';
        if (lower.includes('família') || lower.includes('family')) return '👨‍👩‍👧';
        if (lower.includes('netflix')) return '🔴';
        if (lower.includes('disney')) return '🏰';
        if (lower.includes('amazon')) return '📦';
        if (lower.includes('globoplay')) return '🌐';
        if (lower.includes('hbo') || lower.includes('max')) return '🟣';
        if (lower.includes('paramount')) return '⛰️';
        if (lower.includes('apple')) return '🍎';
        if (lower.includes('lançamento') || lower.includes('novo')) return '✨';
        if (lower.includes('4k') || lower.includes('uhd')) return '📺';
        if (lower.includes('adulto') || lower.includes('adult')) return '🔞';
        if (lower.includes('dorama') || lower.includes('korean')) return '🇰🇷';
        if (lower.includes('turca') || lower.includes('turkish')) return '🇹🇷';
        if (lower.includes('notícia') || lower.includes('news')) return '📰';
        return '📁';
    };

    const getTypeLabel = () => {
        if (type === 'live') return 'Todos os Canais';
        if (type === 'vod') return 'Todos os Filmes';
        return 'Todas as Séries';
    };

    return (
        <>
            {/* Hamburger Toggle Button */}
            <button
                className={`category-toggle-btn ${isOpen ? 'active' : ''}`}
                onClick={handleToggle}
            >
                <span className="hamburger-line line-1" />
                <span className="hamburger-line line-2" />
                <span className="hamburger-line line-3" />
            </button>

            {/* Backdrop */}
            {(isOpen || isClosing) && (
                <div
                    className="category-backdrop"
                    onClick={handleClose}
                    style={{ opacity: isClosing ? 0 : 1, transition: 'opacity 0.3s ease' }}
                />
            )}

            {/* Category Panel */}
            {(isOpen || isClosing) && (
                <div
                    ref={panelRef}
                    className={`category-panel ${isOpen && !isClosing ? 'open' : ''} ${isClosing ? 'closing' : ''}`}
                >
                    {/* Header */}
                    <div className="category-panel-header">
                        <div className="header-content">
                            <h2>Categorias</h2>
                            <p>Explore por gênero</p>
                        </div>
                        <button className="close-btn" onClick={handleClose}>
                            ✕
                        </button>
                    </div>

                    {/* Category List */}
                    <div className="category-list">
                        {/* All Items Option */}
                        <button
                            className={`category-item ${selectedCategory === 'all' ? 'selected' : ''}`}
                            onClick={() => handleSelectCategory('all')}
                        >
                            <div className="category-icon">📺</div>
                            <span className="category-name">{getTypeLabel()}</span>
                            {selectedCategory === 'all' && <div className="selected-dot" />}
                        </button>

                        {/* Dynamic Categories */}
                        {categories.map((cat, index) => (
                            <button
                                key={cat.category_id}
                                className={`category-item ${selectedCategory === cat.category_id ? 'selected' : ''}`}
                                style={{ animationDelay: `${0.1 + index * 0.03}s` }}
                                onClick={() => handleSelectCategory(cat.category_id)}
                            >
                                <div className="category-icon">{getCategoryIcon(cat.category_name)}</div>
                                <span className="category-name">{cat.category_name}</span>
                                {selectedCategory === cat.category_id && <div className="selected-dot" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
