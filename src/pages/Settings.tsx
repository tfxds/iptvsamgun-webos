import { useFocusZone } from '../contexts/FocusContext';
import { useTVNavigation } from '../hooks/useTVNavigation';
import './Settings.css';

export function Settings() {
    const { setFocusZone } = useFocusZone();

    // Sem campos editáveis (TMDB é configurado internamente). Só permite voltar ao menu.
    useTVNavigation({
        onNavigate: (direction) => {
            if (direction === 'left') setFocusZone('sidebar');
        },
        onEnter: () => {},
    });

    return (
        <div className="settings-page">
            <div className="settings-panel">
                <header className="settings-header">
                    <span className="settings-kicker">Configurações</span>
                    <h1>S.A Player</h1>
                    <p>
                        Aplicativo configurado e pronto. Capas, sinopses e metadados extras
                        já vêm habilitados — nada pra ajustar por aqui.
                    </p>
                </header>

                <section className="settings-help">
                    <h2>Sobre</h2>
                    <ol>
                        <li>Conteúdo carregado direto do seu provedor.</li>
                        <li>Use o menu à esquerda para navegar entre Canais, Filmes e Séries.</li>
                        <li>Para sair da conta, use o botão Sair no menu.</li>
                    </ol>
                </section>
            </div>
        </div>
    );
}
