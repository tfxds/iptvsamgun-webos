// Sidebar Navigation Component - TV Style

import { useState } from 'react';
import { useTVNavigation } from '../../hooks/useTVNavigation';
import './Sidebar.css';

interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
}

interface SidebarProps {
    activeItem: string;
    onItemSelect: (itemId: string) => void;
    onLogout: () => void;
}

const menuItems: SidebarItem[] = [
    {
        id: 'home',
        label: 'Início',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V14H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        id: 'live',
        label: 'TV ao Vivo',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 19V21" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
        ),
    },
    {
        id: 'movies',
        label: 'Filmes',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M2 8H22" stroke="currentColor" strokeWidth="2" />
                <path d="M6 4V8" stroke="currentColor" strokeWidth="2" />
                <path d="M18 4V8" stroke="currentColor" strokeWidth="2" />
                <polygon points="10,11 10,17 15,14" fill="currentColor" />
            </svg>
        ),
    },
    {
        id: 'series',
        label: 'Séries',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M7 3H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M5 21H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 10L14 12L10 14V10Z" fill="currentColor" />
            </svg>
        ),
    },
    {
        id: 'favorites',
        label: 'Favoritos',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        id: 'settings',
        label: 'Configurações',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                <path d="M12 1V4M12 20V23M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M1 12H4M20 12H23M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
    },
];

export function Sidebar({ activeItem, onItemSelect, onLogout }: SidebarProps) {
    const [focusedIndex, setFocusedIndex] = useState(
        menuItems.findIndex(item => item.id === activeItem)
    );
    const [isExpanded, setIsExpanded] = useState(false);

    const handleNavigate = (direction: 'up' | 'down' | 'left' | 'right') => {
        if (direction === 'up') {
            setFocusedIndex(prev => Math.max(0, prev - 1));
        } else if (direction === 'down') {
            setFocusedIndex(prev => Math.min(menuItems.length, prev + 1)); // +1 for logout
        } else if (direction === 'right' && !isExpanded) {
            setIsExpanded(true);
        } else if (direction === 'left' && isExpanded) {
            setIsExpanded(false);
        }
    };

    const handleEnter = () => {
        if (focusedIndex === menuItems.length) {
            // Logout button
            onLogout();
        } else {
            const item = menuItems[focusedIndex];
            if (item) {
                onItemSelect(item.id);
            }
        }
    };

    useTVNavigation({
        onNavigate: handleNavigate,
        onEnter: handleEnter,
    });

    return (
        <nav className={`sidebar ${isExpanded ? 'sidebar-expanded' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <svg viewBox="0 0 24 24" fill="none" className="sidebar-logo-icon">
                        <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V15C20 15.5523 19.5523 16 19 16H5C4.44772 16 4 15.5523 4 15V5Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M8 20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M12 16V20" stroke="currentColor" strokeWidth="2" />
                    </svg>
                </div>
                {isExpanded && <span className="sidebar-title">NeoStream</span>}
            </div>

            <div className="sidebar-menu">
                {menuItems.map((item, index) => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activeItem === item.id ? 'active' : ''} ${focusedIndex === index ? 'tv-focused' : ''}`}
                        onClick={() => onItemSelect(item.id)}
                        data-focusable="true"
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        {isExpanded && <span className="sidebar-label">{item.label}</span>}
                    </button>
                ))}
            </div>

            <div className="sidebar-footer">
                <button
                    className={`sidebar-item sidebar-logout ${focusedIndex === menuItems.length ? 'tv-focused' : ''}`}
                    onClick={onLogout}
                    data-focusable="true"
                >
                    <span className="sidebar-icon">
                        <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                            <path d="M9 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </span>
                    {isExpanded && <span className="sidebar-label">Sair</span>}
                </button>
            </div>
        </nav>
    );
}
