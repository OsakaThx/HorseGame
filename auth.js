const AuthUI = {
    async login() {
        const { email, password } = this._values();
        if (!this._validar(email, password)) return;
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
        if (!this._validar(email, password)) return;
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
    },

    _validar(email, password) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            UI.toast('Escribe un correo válido, ejemplo: jugador@email.com', 'error');
            return false;
        }
        if (password.length < 6) {
            UI.toast('La contraseña debe tener mínimo 6 caracteres', 'error');
            return false;
        }
        return true;
    }
};
