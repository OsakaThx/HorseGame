const AuthUI = {
    async login() {
        const { email, password } = this._values();
        try {
            await Api.login(email, password);
            UI.toast('Sesión iniciada', 'exito');
            await AppInit.startGame();
        } catch (e) {
            UI.toast(e.message, 'error');
        }
    },

    async register() {
        const { email, password } = this._values();
        try {
            await Api.register(email, password);
            UI.toast('Cuenta creada', 'exito');
            await AppInit.startGame();
        } catch (e) {
            UI.toast(e.message, 'error');
        }
    },

    logout() {
        Api.logout();
        UI.toast('Sesión cerrada');
        UI.show('pantalla-login');
    },

    _values() {
        return {
            email: (document.getElementById('auth-email')?.value || '').trim(),
            password: document.getElementById('auth-password')?.value || ''
        };
    }
};
