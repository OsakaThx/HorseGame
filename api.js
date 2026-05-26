const Api = {
    baseUrl: localStorage.getItem('horse_api_url') || '',
    tokenKey: 'horse_auth_token',
    userKey: 'horse_auth_user',

    get token() { return localStorage.getItem(this.tokenKey); },
    get user() {
        try { return JSON.parse(localStorage.getItem(this.userKey) || 'null'); }
        catch { return null; }
    },
    isLoggedIn() { return !!this.token; },

    setSession(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
    },
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    },

    async request(path, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        const res = await fetch(this.baseUrl + path, { ...options, headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Error de conexión');
        return data;
    },

    async register(email, password) {
        const data = await this.request('/api/auth/register', {
            method: 'POST', body: JSON.stringify({ email, password })
        });
        this.setSession(data.token, data.user);
        return data;
    },
    async login(email, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST', body: JSON.stringify({ email, password })
        });
        this.setSession(data.token, data.user);
        return data;
    },
    async loadSave() {
        return this.request('/api/save');
    },
    async save(payload) {
        return this.request('/api/save', { method:'PUT', body: JSON.stringify(payload) });
    },
    async deleteSave() {
        return this.request('/api/save', { method:'DELETE' });
    },
    async friends() {
        return this.request('/api/friends');
    },
    async addFriend(email) {
        return this.request('/api/friends', { method:'POST', body: JSON.stringify({ email }) });
    },
    async removeFriend(id) {
        return this.request(`/api/friends/${id}`, { method:'DELETE' });
    },
    async joinMatchmaking(horse, maxPlayers = 2) {
        return this.request('/api/matchmaking/join', { method:'POST', body: JSON.stringify({ horse, maxPlayers }) });
    },
    async matchmakingStatus() {
        return this.request('/api/matchmaking/status');
    },
    async voteMode(matchId, mode) {
        return this.request(`/api/matchmaking/${matchId}/vote-mode`, { method:'POST', body: JSON.stringify({ mode }) });
    },
    async startMatch(matchId) {
        return this.request(`/api/matchmaking/${matchId}/start`, { method:'POST' });
    },
    async leaveMatchmaking() {
        return this.request('/api/matchmaking/leave', { method:'DELETE' });
    }
};
