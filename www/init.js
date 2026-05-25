const AppInit = {
    async startGame() {
        if (Api.isLoggedIn()) {
            try {
                const remote = await Api.loadSave();
                if (remote.exists && remote.save) {
                    Save.aplicar(remote.save);
                    localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(remote.save));
                } else if (!Save.cargar()) {
                    Game.nuevaPartida();
                    Save.guardar();
                } else {
                    Save.guardar();
                }
            } catch (e) {
                console.warn('[init] No se pudo cargar partida remota:', e.message);
                if (!Save.cargar()) {
                    Game.nuevaPartida();
                    Save.guardar();
                }
            }
        } else {
            UI.show('pantalla-login');
            return;
        }

        try {
            await Sprites.init();
            console.log('[init] Sprites listos');
        } catch (e) {
            console.warn('[init] No se pudieron cargar sprites:', e);
        }

        UI.show('pantalla-menu');
        if (UI.pantallaActual && UI.pantallaActual !== 'pantalla-menu') UI.show(UI.pantallaActual);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    AppInit.startGame();
});
