// Welcome Page - Premium design from original app (without settings button)
import { useRef, useEffect } from 'react';
import { FaTv, FaPlus, FaStar } from 'react-icons/fa';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './Welcome.css';

interface WelcomeProps {
    onGoToLogin: () => void;
}

export function Welcome({ onGoToLogin }: WelcomeProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Focus the button on mount
    useEffect(() => {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            buttonRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    useTVNavigation({
        onEnter: () => {
            console.log('Enter pressed on Welcome');
            onGoToLogin();
        },
    });

    const handleClick = () => {
        console.log('Button clicked');
        onGoToLogin();
    };

    return (
        <div className="welcome-container">
            {/* Animated Background */}
            <div className="welcome-bg">
                <div className="welcome-orb welcome-orb-1" />
                <div className="welcome-orb welcome-orb-2" />
                <div className="welcome-orb welcome-orb-3" />
                <div className="welcome-grid" />
            </div>

            {/* Content */}
            <div className="welcome-content">
                {/* Logo Section */}
                <div className="welcome-logo">
                    <div className="welcome-logo-bg">
                        <FaTv className="welcome-logo-icon" />
                    </div>
                    <h1 className="welcome-title">NeoStream</h1>
                    <div className="welcome-badge">
                        <FaStar size={12} />
                        <span style={{ marginLeft: '6px' }}>IPTV Player</span>
                    </div>
                </div>

                {/* Message */}
                <div className="welcome-message">
                    <h2>Nenhuma playlist configurada</h2>
                    <p>Adicione uma playlist do seu provedor IPTV para começar a assistir</p>
                </div>

                {/* Action Card - Always focused since it's the only button */}
                <div className="welcome-cards">
                    <button
                        ref={buttonRef}
                        className="welcome-card welcome-card-primary focused"
                        onClick={handleClick}
                        tabIndex={1}
                        autoFocus
                    >
                        <div className="welcome-card-icon">
                            <FaPlus size={24} />
                        </div>
                        <div className="welcome-card-text">
                            <span className="welcome-card-title">Adicionar Playlist</span>
                            <span className="welcome-card-desc">Conecte sua conta IPTV</span>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <p className="welcome-footer">
                    NeoStream não fornece conteúdo. Use sua própria assinatura IPTV.
                </p>

                {/* Navigation hint for TV */}
                <div className="welcome-hint">
                    <span>Pressione OK para continuar</span>
                </div>
            </div>
        </div>
    );
}
