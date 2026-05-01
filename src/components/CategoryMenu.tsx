// Category Menu Component - Hamburger Button + Slide Panel
// Matching Original App Animations

import { useState, useRef } from 'react';
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
        if (lower.includes('ação') || lower.includes('action')) return 'Ação';
        if (lower.includes('aventura') || lower.includes('adventure')) return 'Aventura';
        if (lower.includes('drama')) return 'Drama';
        if (lower.includes('romance')) return 'Romance';
        if (lower.includes('comédia') || lower.includes('comedy')) return 'Comédia';
        if (lower.includes('terror') || lower.includes('horror')) return 'Terror';
        if (lower.includes('suspense') || lower.includes('thriller')) return 'Suspense';
        if (lower.includes('ficção') || lower.includes('sci-fi')) return 'Sci-Fi';
        if (lower.includes('fantasia') || lower.includes('fantasy')) return 'Fantasia';
        if (lower.includes('animação') || lower.includes('animation')) return 'Animação';
        if (lower.includes('anime')) return 'Anime';
        if (lower.includes('infantil') || lower.includes('kids')) return 'Kids';
        if (lower.includes('documentário') || lower.includes('documentary')) return 'Doc';
        if (lower.includes('crime') || lower.includes('policial')) return 'Crime';
        if (lower.includes('guerra') || lower.includes('war')) return 'Guerra';
        if (lower.includes('esporte') || lower.includes('sport')) return 'Esporte';
        if (lower.includes('música') || lower.includes('music')) return 'Música';
        if (type === 'live') return 'TV';
        return type === 'vod' ? 'Filme' : 'Série';
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
                            X
                        </button>
                    </div>

                    {/* Category List */}
                    <div className="category-list">
                        {/* All Items Option */}
                        <button
                            className={`category-item ${selectedCategory === 'all' ? 'selected' : ''}`}
                            onClick={() => handleSelectCategory('all')}
                        >
                            <div className="category-icon">TV</div>
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
