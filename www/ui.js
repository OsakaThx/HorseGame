/* ============================================================
   ui.js - Interfaz, render y eventos
   ============================================================ */
const UI = {
    pantallaActual: 'pantalla-menu',
    tabTienda: 'caballos',
    _criaSel: { a:null, b:null },
    _onlinePolling: null,
    _onlineMatch: null,
    _skillRace: null,

    show(id) {
        document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
        const el = document.getElementById(id); if (el) el.classList.add('activa');
        this.pantallaActual = id;
        // Reset tabTienda to 'caballos' when entering tienda from menu (not from irEntrenar)
        if (id === 'pantalla-tienda' && this.tabTienda !== 'entrenamientos') {
            this.tabTienda = 'caballos';
        }
        const map = {
            'pantalla-menu':()=>this.renderMenu(),
            'pantalla-caballos':()=>this.renderCaballos(),
            'pantalla-carreras':()=>this.renderCarreras(),
            'pantalla-online':()=>this.renderOnline(),
            'pantalla-amigos':()=>this.renderAmigos(),
            'pantalla-tienda':()=>this.renderTienda(),
            'pantalla-cria':()=>this.renderCria(),
            'pantalla-logros':()=>this.renderLogros(),
            'pantalla-stats':()=>this.renderStats(),
            'pantalla-admin':()=>Admin.render()
        };
        if (map[id]) map[id]();
        this.refreshDinero();
        window.scrollTo(0,0);
    },

    refreshDinero() {
        if (!Game.jugador) return;
        const d = Game.jugador.dinero.toLocaleString();
        document.querySelectorAll('.d-val').forEach(e => e.textContent = d);
        const m = document.getElementById('menu-dinero'); if (m) m.textContent = d;
        const mc = document.getElementById('menu-caballos'); if (mc) mc.textContent = Game.jugador.caballos.length;
        const mv = document.getElementById('menu-victorias'); if (mv) mv.textContent = Game.jugador.estadisticas.victorias;
        const md = document.getElementById('menu-dia'); if (md) md.textContent = Game.jugador.dia;
        // Player level bar
        const j = Game.jugador;
        const mnj = document.getElementById('menu-nivel-jugador'); if (mnj) mnj.textContent = j.nivelJugador || 1;
        const xpMax = Game.xpNivelJugador(j.nivelJugador || 1);
        const xpPct = Math.min(100, Math.round(((j.xpJugador||0) / xpMax) * 100));
        const fill = document.getElementById('menu-xp-fill'); if (fill) fill.style.width = xpPct + '%';
        const xa = document.getElementById('menu-xp-actual'); if (xa) xa.textContent = j.xpJugador || 0;
        const xmx = document.getElementById('menu-xp-max'); if (xmx) xmx.textContent = xpMax;
    },

    /** Tras cualquier acción importante: revisar logros y guardar */
    _postAccion() {
        const nuevos = Achiev.revisar();
        if (nuevos.length) {
            nuevos.forEach(l => this.toast(`🏅 Logro: ${l.nombre} (+$${l.recompensa})`,'exito'));
        }
        if (CONFIG.AUTOGUARDADO) Save.guardar();
        this.refreshDinero();
    },

    /* ---------- MENÚ ---------- */
    renderMenu() {
        this.refreshDinero();
        const cont = document.getElementById('recompensa-diaria-cont');
        const r = Game.recompensaDiaria();
        if (r.disponible) {
            cont.innerHTML = `<div class="recompensa-diaria" onclick="UI.cobrarDiaria()">
                🎁 <b>Recompensa Diaria disponible</b><br>
                <span style="font-size:.9em">Día ${r.racha} de racha · +$${r.monto}</span>
            </div>`;
        } else {
            cont.innerHTML = `<p class="muted text-center mb-10">🔥 Racha: ${Game.jugador.racha} día(s) · vuelve mañana por más</p>`;
        }
    },
    cobrarDiaria() {
        const r = Game.cobrarRecompensaDiaria();
        if (!r) return;
        this.toast(`+$${r.monto} (racha ${r.racha})`,'exito');
        this._postAccion(); this.renderMenu();
    },

    /* ---------- ONLINE ---------- */
    renderOnline() {
        const cont = document.getElementById('online-contenido');
        const c = Game.getCaballoSeleccionado();
        cont.innerHTML = `<div class="tarjeta">
            <h3>🌐 Lobby online</h3>
            <p class="muted mt-10">Busca otro jugador conectado. Mínimo 2 jugadores. Usará tu caballo seleccionado.</p>
            <div class="horse-showcase" style="margin-top:10px">
                <div class="showcase-sprite">${Horse.visualHTML(c, 2.5, 'idle_right')}</div>
                <div class="showcase-info">
                    <h3>${c.nombre}</h3>
                    <p class="muted">${c.raza} · Nv.${c.nivel}</p>
                </div>
            </div>
            <div id="online-status" class="mt-10 muted">Listo para buscar rival.</div>
            <div class="form-grupo mt-10">
                <label>Límite de jugadores</label>
                <select id="online-max-players">
                    <option value="2">2 jugadores</option>
                    <option value="3">3 jugadores</option>
                    <option value="4">4 jugadores</option>
                    <option value="6">6 jugadores</option>
                    <option value="8">8 jugadores</option>
                </select>
            </div>
            <div id="online-lobby"></div>
            <div class="flex-row mt-10">
                <button class="btn btn-success" onclick="UI.buscarOnline()">🔎 Buscar partida</button>
                <button class="btn btn-sec" onclick="UI.salirOnline()">Cancelar búsqueda</button>
            </div>
        </div>`;
    },
    async buscarOnline() {
        try {
            const st = document.getElementById('online-status');
            if (st) st.textContent = 'Buscando rival...';
            const c = Game.getCaballoSeleccionado();
            const maxPlayers = Number(document.getElementById('online-max-players')?.value || 2);
            const r = await Api.joinMatchmaking(c, maxPlayers);
            if (r.status === 'waiting') {
                if (st) st.innerHTML = '⏳ En cola. Esperando otro jugador... Te aviso cuando encuentre rival.';
                this.toast('Buscando rival...');
                this._iniciarPollingOnline();
                return;
            }
            if (r.status === 'matched') this._mostrarLobbyOnline(r.match);
        } catch (e) {
            this.toast(e.message, 'error');
        }
    },
    _iniciarPollingOnline() {
        clearInterval(this._onlinePolling);
        this._onlinePolling = setInterval(async () => {
            try {
                const r = await Api.matchmakingStatus();
                if (r.status === 'matched' && r.match) {
                    if (r.match.status === 'racing') {
                        clearInterval(this._onlinePolling);
                        this._onlinePolling = null;
                        this._onlineMatch = r.match;
                        await this._animarSeleccionModo(r.match);
                        this._iniciarCarreraOnline(r.match);
                    } else {
                        this._mostrarLobbyOnline(r.match);
                    }
                }
            } catch (e) {
                clearInterval(this._onlinePolling);
                this._onlinePolling = null;
                this.toast(e.message, 'error');
            }
        }, 2500);
    },
    async salirOnline() {
        try {
            clearInterval(this._onlinePolling);
            this._onlinePolling = null;
            await Api.leaveMatchmaking();
            const st = document.getElementById('online-status');
            if (st) st.textContent = 'Búsqueda cancelada.';
            this.toast('Saliste de la cola');
        } catch (e) {
            this.toast(e.message, 'error');
        }
    },
    _mostrarLobbyOnline(match) {
        this._onlineMatch = match;
        const st = document.getElementById('online-status');
        if (st) st.textContent = `Lobby encontrado #${match.id}. Vota el modo y pueden iniciar ya.`;
        const cont = document.getElementById('online-lobby');
        if (!cont) return;
        const modes = [
            ['velocidad','⚡ Velocidad'],
            ['resistencia','💪 Resistencia'],
            ['obstaculos','🚧 Obstáculos'],
            ['mixta','🎲 Mixta']
        ];
        const votes = match.modeVotes || {};
        const voteText = Object.values(votes).length ? Object.values(votes).join(', ') : 'sin votos';
        cont.innerHTML = `<div class="tarjeta mt-10">
            <h3>🏟️ Sala online</h3>
            <p class="muted">Jugadores: ${(match.participants || []).length}/${match.maxPlayers || 2}</p>
            <p class="muted">Votos: ${voteText}</p>
            <div class="grid-2 mt-10">
                ${modes.map(([id, label]) => `<button class="btn btn-sec" onclick="UI.votarModoOnline('${id}')">${label}</button>`).join('')}
            </div>
            <div class="flex-row mt-10">
                <button class="btn btn-success" onclick="UI.iniciarMatchOnline()">🏁 Iniciar ya</button>
                <button class="btn btn-sec" onclick="UI._iniciarPollingOnline()">⏳ Esperar más</button>
            </div>
            <p class="muted mt-10">Si votan modos distintos, al iniciar se elegirá aleatoriamente entre los votos.</p>
        </div>`;
        this._iniciarPollingOnline();
    },
    async votarModoOnline(mode) {
        if (!this._onlineMatch) return;
        try {
            const r = await Api.voteMode(this._onlineMatch.id, mode);
            this._onlineMatch.modeVotes = r.match.mode_votes || {};
            this._onlineMatch.selectedMode = r.match.selected_mode;
            this.toast('Voto guardado', 'exito');
            this._mostrarLobbyOnline(this._onlineMatch);
        } catch (e) {
            this.toast(e.message, 'error');
        }
    },
    async iniciarMatchOnline() {
        if (!this._onlineMatch) return;
        try {
            const r = await Api.startMatch(this._onlineMatch.id);
            this._onlineMatch.status = r.match.status;
            this._onlineMatch.selectedMode = r.match.selected_mode;
            clearInterval(this._onlinePolling);
            this._onlinePolling = null;
            await this._animarSeleccionModo(this._onlineMatch);
            this._iniciarCarreraOnline(this._onlineMatch);
        } catch (e) {
            this.toast(e.message, 'error');
        }
    },
    _animarSeleccionModo(match) {
        return new Promise(resolve => {
            const cont = document.getElementById('online-lobby');
            const votes = Object.values(match.modeVotes || {});
            const pool = votes.length ? votes : ['mixta'];
            let i = 0;
            const names = { velocidad:'⚡ Velocidad', resistencia:'💪 Resistencia', obstaculos:'🚧 Obstáculos', mixta:'🎲 Mixta' };
            const timer = setInterval(() => {
                const mode = pool[i % pool.length];
                if (cont) cont.innerHTML = `<div class="tarjeta mt-10 text-center"><h3>🎰 Seleccionando modo...</h3><h2>${names[mode] || mode}</h2></div>`;
                i++;
                if (i > 8) {
                    clearInterval(timer);
                    if (cont) cont.innerHTML = `<div class="tarjeta mt-10 text-center"><h3>✅ Modo elegido</h3><h2>${names[match.selectedMode] || match.selectedMode}</h2></div>`;
                    setTimeout(resolve, 900);
                }
            }, 220);
        });
    },
    _iniciarCarreraOnline(match) {
        const myUserId = Api.user && Api.user.id;
        const participants = (match.participants || [
            { userId: myUserId, horse: match.yourHorse },
            { userId: match.opponent.id, user: match.opponent, horse: match.opponentHorse }
        ]).map(p => {
            const horse = JSON.parse(JSON.stringify(p.horse));
            horse.id = `online_${p.userId}_${horse.id}`;
            horse.condicion = horse.condicion ?? 100;
            horse.preferencias = horse.preferencias || { terreno:{}, clima:{} };
            return { ...p, horse };
        });
        const myParticipant = participants.find(p => p.userId === myUserId) || participants[0];
        const mi = myParticipant.horse;
        const mode = match.selectedMode || 'mixta';
        const presets = {
            velocidad: { nombre:'⚡ Velocidad', distancia:120, tipo:'plana', stat_weights:{ velocidad:0.45, velocidadPunta:0.35, aceleracion:0.20, estamina:0.05, salto:0 } },
            resistencia: { nombre:'💪 Resistencia', distancia:420, tipo:'plana', stat_weights:{ velocidad:0.20, velocidadPunta:0.15, aceleracion:0.10, estamina:0.55, salto:0 } },
            obstaculos: { nombre:'🚧 Obstáculos', distancia:260, tipo:'obstaculos', stat_weights:{ velocidad:0.20, velocidadPunta:0.15, aceleracion:0.15, estamina:0.20, salto:0.30 } },
            mixta: { nombre:'🎲 Mixta', distancia:220, tipo:'plana', stat_weights:{ velocidad:0.30, velocidadPunta:0.25, estamina:0.25, aceleracion:0.15, salto:0.05 } }
        };
        const preset = presets[mode] || presets.mixta;
        const carrera = {
            id: `online_${match.id}`,
            nombre: `PvP Online #${match.id} · ${preset.nombre}`,
            distancia: preset.distancia,
            terreno: 'pasto',
            clima: 'soleado',
            tipo: preset.tipo,
            premios: [0, 0],
            stat_weights: preset.stat_weights
        };
        const sim = Race.simular(participants.map(p => p.horse), carrera, match.seed || `online_${match.id}`);
        this._showRaceLoading(carrera, () => {
            this._prepararEscenaCarrera(carrera);
            this.animarCarrera(sim, carrera, mi, (ranking) => this.finalizarCarreraOnline(ranking, carrera, mi, match));
        });
    },
    _prepararEscenaCarrera(ca) {
        this.show('pantalla-simulacion');
        document.getElementById('titulo-simulacion').textContent = ca.nombre;
        document.getElementById('info-simulacion').textContent = `${ca.distancia}m · ${ca.terreno} · ${ca.clima}`;
        document.getElementById('distancia-total').textContent = ca.distancia;
        const esc = document.getElementById('escena-carrera');
        esc.dataset.clima = ca.clima;
        esc.dataset.terreno = ca.terreno;
        const lluvia = document.getElementById('lluvia');
        lluvia.innerHTML = '';
    },

    /* ---------- AMIGOS ---------- */
    async renderAmigos() {
        const cont = document.getElementById('amigos-contenido');
        cont.innerHTML = `<div class="tarjeta">
            <h3>Agregar amigo</h3>
            <div class="form-grupo mt-10">
                <label>Correo del amigo</label>
                <input type="email" id="friend-email" placeholder="amigo@email.com">
            </div>
            <button class="btn btn-success" onclick="UI.agregarAmigo()">➕ Agregar</button>
        </div>
        <div class="tarjeta"><h3>Mis amigos</h3><div id="friends-list" class="mt-10 muted">Cargando...</div></div>`;
        await this.cargarAmigos();
    },
    async cargarAmigos() {
        try {
            const list = document.getElementById('friends-list');
            const r = await Api.friends();
            if (!r.friends.length) {
                list.innerHTML = 'Aún no tienes amigos agregados.';
                return;
            }
            list.innerHTML = r.friends.map(f => `<div class="resultado-fila">
                <span>${f.username || f.email}<br><small class="muted">${f.email}</small></span>
                <button class="btn btn-danger btn-pequeño" onclick="UI.eliminarAmigo(${f.id})">Eliminar</button>
            </div>`).join('');
        } catch (e) {
            this.toast(e.message, 'error');
        }
    },
    async agregarAmigo() {
        const email = (document.getElementById('friend-email')?.value || '').trim();
        try {
            await Api.addFriend(email);
            this.toast('Amigo agregado', 'exito');
            await this.cargarAmigos();
        } catch (e) {
            this.toast(e.message, 'error');
        }
    },
    async eliminarAmigo(id) {
        try {
            await Api.removeFriend(id);
            this.toast('Amigo eliminado');
            await this.cargarAmigos();
        } catch (e) {
            this.toast(e.message, 'error');
        }
    },

    /* ---------- MIS CABALLOS ---------- */
    renderCaballos() {
        const cont = document.getElementById('lista-caballos');
        if (!Game.jugador.caballos.length) {
            cont.innerHTML = '<p class="muted text-center">No tienes caballos. Compra uno en la tienda.</p>';
            return;
        }
        const sel = Game.getCaballoSeleccionado();
        const showcase = sel ? `<div class="horse-showcase">
            <div class="showcase-sprite">${Horse.visualHTML(sel, 4, 'idle_right')}</div>
            <div class="showcase-info">
                <h3>${sel.nombre} ${sel.sexo==='macho'?'♂':'♀'}</h3>
                <p class="muted">${(DATA.razas[sel.raza]||{}).nombre||''} · Nivel ${sel.nivel}</p>
                <div class="showcase-anims">
                    <button class="btn btn-sec btn-pequeño" onclick="UI.showcaseAnim('idle_right')">🧍 Idle</button>
                    <button class="btn btn-sec btn-pequeño" onclick="UI.showcaseAnim('walk_right')">🚶 Caminar</button>
                    <button class="btn btn-sec btn-pequeño" onclick="UI.showcaseAnim('trot_right')">🐎 Trotar</button>
                    <button class="btn btn-sec btn-pequeño" onclick="UI.showcaseAnim('gallop_right')">💨 Galope</button>
                    <button class="btn btn-sec btn-pequeño" onclick="UI.showcaseAnim('eat_right')">🌾 Comer</button>
                </div>
            </div>
        </div>` : '';
        cont.innerHTML = showcase + Game.jugador.caballos.map(c => this.cardCaballo(c, true)).join('');
    },
    showcaseAnim(anim) {
        const cv = document.querySelector('.showcase-sprite canvas.sprite-canvas');
        if (cv) cv.dataset.anim = anim;
    },
    cardCaballo(c, interactiva) {
        const raza = DATA.razas[c.raza] || { nombre:'?', descripcion:'', emoji:'🐴' };
        const sel = c.id === Game.jugador.caballoSeleccionadoId;
        const xpReq = Horse.xpRequerida(c.nivel);
        const barra = (n,v) => `<div class="stat-fila">
            <span class="stat-nombre">${n}</span>
            <div class="stat-barra"><div class="stat-relleno" style="width:${Math.min(100,v)}%"></div></div>
            <span class="stat-valor">${Math.round(v)}</span></div>`;
        let acciones = '';
        if (interactiva) {
            acciones = `<div class="flex-row mt-10">
                ${sel ? '<button class="btn btn-success" disabled>✓ Seleccionado</button>'
                      : `<button class="btn" onclick="UI.seleccionar('${c.id}')">Seleccionar</button>`}
                <button class="btn btn-sec" onclick="UI.irEntrenar('${c.id}')">💪 Entrenar</button>
                ${Game.jugador.caballos.length>1 ? `<button class="btn btn-danger" onclick="UI.confirmarVenta('${c.id}')">💰 Vender ($${Math.floor(c.valor_compra*0.5)})</button>`:''}
            </div>`;
        }
        const sexoIcon = c.sexo==='macho' ? '<span class="sexo-icono macho">♂</span>' : '<span class="sexo-icono hembra">♀</span>';
        const buffBadge = c.buff_admin ? `<span class="badge badge-purple">⚡ ${c.buff_admin>0?'+':''}${c.buff_admin}%</span>` : '';
        const cooldown = c.cooldownCria>0 ? `<span class="badge badge-danger">💤 Cría: ${c.cooldownCria}d</span>` : '';
        const claseBadge = c.clase ? `<span class="badge" style="background:${c.clase.color}20;color:${c.clase.color};border:1px solid ${c.clase.color}">${c.clase.emoji} ${c.clase.nombre}</span>` : '';
        return `<div class="tarjeta ${sel?'seleccionada':''}">
            <div class="tarjeta-titulo">
                <h3><span class="horse-avatar">${Horse.visualHTML(c)}</span> ${c.nombre} ${sexoIcon}</h3>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                    <span class="badge">${raza.nombre} · Nv.${c.nivel}</span>
                    ${claseBadge} ${buffBadge} ${cooldown}
                </div>
            </div>
            <p class="muted">${raza.descripcion||''}</p>
            <div class="mt-10">
                ${barra('Velocidad', c.stats.velocidad)}
                ${barra('Vel. Punta', c.stats.velocidadPunta)}
                ${barra('Estamina', c.stats.estamina)}
                ${barra('Salto', c.stats.salto)}
                ${barra('Aceleración', c.stats.aceleracion)}
            </div>
            <div class="condicion-fila">${barra('Condición', c.condicion)}</div>
            <p class="muted mt-10">🏆 ${c.carreras_ganadas} · ⭐ XP ${Math.floor(c.experiencia)}/${xpReq} · 💰 $${c.dinero_generado}</p>
            ${interactiva ? this._equipMiniRow(c) : ''}
            ${acciones}</div>`;
    },
    seleccionar(id) {
        Game.jugador.caballoSeleccionadoId = id;
        this.toast('Caballo seleccionado','exito');
        this._postAccion(); this.renderCaballos();
    },
    irEntrenar(id) {
        Game.jugador.caballoSeleccionadoId = id;
        this.tabTienda = 'entrenamientos';
        this.show('pantalla-tienda');
    },
    _equipMiniRow(c) {
        const slots = [
            { slot:'montura',   icon:'🏇', label:'Montura' },
            { slot:'herradura', icon:'🔩', label:'Herraduras' },
            { slot:'rienda',    icon:'➰', label:'Riendas' }
        ];
        return `<div class="equip-mini-row">${slots.map(({slot,icon,label}) => {
            const eqId = c.equipo && c.equipo[slot];
            const eq = eqId && DATA.equipamiento && DATA.equipamiento[eqId];
            return `<div class="equip-mini-slot ${eq?'equipado':''}" onclick="UI.abrirEquipSlot('${c.id}','${slot}')">
                <span class="equip-mini-icon">${icon}</span>
                <span class="equip-mini-name ${eq?'eq-active':''}">${eq ? eq.nombre : label}</span>
            </div>`;
        }).join('')}</div>`;
    },
    abrirEquipSlot(horseId, slot) {
        const c = Game.jugador.caballos.find(x => x.id === horseId); if (!c) return;
        const inv = Game.jugador.inventarioEquipo || [];
        const slotNames = { montura:'Montura', herradura:'Herraduras', rienda:'Riendas' };
        const compatible = inv.map((eqId, idx) => ({ eqId, idx, eq: DATA.equipamiento && DATA.equipamiento[eqId] }))
            .filter(x => x.eq && x.eq.slot === slot);
        const currentId = c.equipo && c.equipo[slot];
        const current = currentId && DATA.equipamiento && DATA.equipamiento[currentId];
        let body = '';
        if (current) {
            body += `<div class="tarjeta equip-inv-item mb-10">
                <div class="tarjeta-titulo"><h3>${current.emoji} ${current.nombre}</h3><span class="badge badge-sec">Equipado</span></div>
                <p class="muted">${current.descripcion}</p>
                <button class="btn btn-sec btn-pequeño" onclick="UI.desequiparDesdeCard('${horseId}','${slot}')">❌ Quitar</button>
            </div>`;
        }
        if (compatible.length === 0) {
            body += `<p class="muted">Sin ${slotNames[slot]} en inventario.<br>Cómprala en <b>Tienda → 🏇 Equipo</b>.</p>`;
        } else {
            compatible.forEach(({eqId, idx, eq}) => {
                body += `<div class="tarjeta equip-inv-item">
                    <div class="tarjeta-titulo"><h3>${eq.emoji} ${eq.nombre}</h3></div>
                    <p class="muted">${eq.descripcion}</p>
                    <button class="btn btn-success btn-pequeño" onclick="UI.equiparDesdeCard('${horseId}',${idx})">Equipar</button>
                </div>`;
            });
        }
        this.modal(`${slotNames[slot]} — ${c.nombre}`, body, null, [
            { texto:'Cerrar', clase:'btn-sec', onClick:()=>{} }
        ]);
    },
    equiparDesdeCard(horseId, invIdx) {
        const c = Game.jugador.caballos.find(x => x.id === horseId); if (!c) return;
        const inv = Game.jugador.inventarioEquipo;
        const eqId = inv[invIdx]; if (!eqId) return;
        const eq = DATA.equipamiento[eqId]; if (!eq) return;
        if (!c.equipo) c.equipo = { montura:null, herradura:null, rienda:null };
        if (c.equipo[eq.slot]) inv.push(c.equipo[eq.slot]);
        c.equipo[eq.slot] = eqId;
        inv.splice(invIdx, 1);
        c.clase = Horse._determinarClase(c);
        this.cerrarModal();
        this.toast(`${eq.nombre} equipado a ${c.nombre}`,'exito');
        this._postAccion(); this.renderCaballos();
    },
    desequiparDesdeCard(horseId, slot) {
        const c = Game.jugador.caballos.find(x => x.id === horseId); if (!c || !c.equipo) return;
        const eqId = c.equipo[slot]; if (!eqId) return;
        Game.jugador.inventarioEquipo.push(eqId);
        c.equipo[slot] = null;
        this.cerrarModal();
        this.toast('Equipo removido');
        this._postAccion(); this.renderCaballos();
    },
    confirmarVenta(id) {
        const c = Game.jugador.caballos.find(x => x.id===id); if (!c) return;
        const p = Math.floor(c.valor_compra*0.5);
        this.modal('Vender caballo', `¿Vender a <b>${c.nombre}</b> por <b>$${p}</b>?`, () => {
            Game.jugador.caballos = Game.jugador.caballos.filter(x => x.id!==id);
            if (Game.jugador.caballoSeleccionadoId===id && Game.jugador.caballos.length) {
                Game.jugador.caballoSeleccionadoId = Game.jugador.caballos[0].id;
            }
            Game.cambiarDinero(p);
            this.toast(`Vendiste a ${c.nombre}`,'exito');
            this._postAccion(); this.renderCaballos();
        });
    },

    /* ---------- CARRERAS ---------- */
    renderCarreras() {
        const c = Game.getCaballoSeleccionado();
        const info = document.getElementById('caballo-seleccionado-info');
        info.innerHTML = '';

        const niv = Game.getNivelJugador();
        const cont = document.getElementById('lista-carreras');
        const STAT_NOMBRES = { velocidad:'Vel', velocidadPunta:'Punta', estamina:'Estam', salto:'Salto', aceleracion:'Acel' };
        const TIPO_COLORES = { recta:'#3498db', obstaculos:'#e67e22', curvas:'#9b59b6' };
        const caballosDisponibles = Game.jugador.caballos.filter(h => h.condicion >= 10);
        const sinCaballos = caballosDisponibles.length === 0;
        cont.innerHTML = DATA.carreras.map(ca => {
            const bloq = ca.nivel_minimo > niv;
            const sd = Game.jugador.dinero < ca.costo_inscripcion;
            const dis = bloq || sd || sinCaballos;
            let estado = '';
            if (bloq) estado = `Requiere Nv.${ca.nivel_minimo}`;
            else if (sd) estado = 'Dinero insuficiente';
            else if (sinCaballos) estado = 'Todos los caballos agotados';
            const topStats = Object.entries(ca.stat_weights)
                .sort((a,b) => b[1]-a[1]).slice(0,2)
                .map(([k,v]) => `${STAT_NOMBRES[k]||k} ${Math.round(v*100)}%`).join(' · ');
            const tipoColor = TIPO_COLORES[ca.tipo]||'#3498db';
            const bannerStyle = ca.banner ? `background-image:url('${ca.banner}');background-size:cover;background-position:center;` : `background:linear-gradient(135deg,${tipoColor}33,${tipoColor}11);`;
            return `<div class="carrera-card ${dis?'inactiva':''}">
                <div class="carrera-banner" style="${bannerStyle}">
                    <div class="carrera-banner-overlay">
                        <span class="carrera-tipo" style="background:${tipoColor}">${ca.tipo.toUpperCase()}</span>
                        <h3>${ca.nombre}</h3>
                        <span class="carrera-nivel-badge">Nv.${ca.nivel_minimo}+</span>
                    </div>
                </div>
                <div class="carrera-details">
                    <div class="carrera-stats-row">
                        <div class="carrera-stat"><span>Distancia</span><b>${ca.distancia}m</b></div>
                        <div class="carrera-stat"><span>Terreno</span><b>${ca.terreno}</b></div>
                        <div class="carrera-stat"><span>Clima</span><b>${ca.clima}</b></div>
                    </div>
                    <div class="carrera-stats-row">
                        <div class="carrera-stat"><span>Inscripción</span><b>$${ca.costo_inscripcion}</b></div>
                        <div class="carrera-stat"><span>1° Premio</span><b class="premio-gold">$${ca.premios[0]||0}</b></div>
                        <div class="carrera-stat"><span>Clave</span><b>${topStats}</b></div>
                    </div>
                    ${dis ? 
                        `<button class="btn btn-correr-full" disabled>${estado}</button>` :
                        (c && c.condicion >= 10 ? 
                            `<button class="btn btn-success btn-correr-full" onclick="UI.iniciarCarrera('${ca.id}')">🏇 Inscribirse y Correr</button>` :
                            `<button class="btn btn-warning btn-correr-full" onclick="UI._seleccionarCaballoParaCarrera('${ca.id}')">Seleccionar caballo disponible</button>`
                        )
                    }
                </div>
            </div>`;
        }).join('');
    },

    /** Genera HTML de tooltip con stats del caballo (mini-card) */
    tooltipHTML(c) {
        const raza = DATA.razas[c.raza] || { nombre:'?', emoji:'🐴' };
        const bar = (n,v) => `<div class="tt-stat"><span>${n}</span><div class="tt-bar"><div style="width:${Math.min(100,v)}%"></div></div><b>${Math.round(v)}</b></div>`;
        const sx = c.sexo==='macho'?'♂':'♀';
        const claseBadge = c.clase ? `<span class="badge" style="background:${c.clase.color}20;color:${c.clase.color};border:1px solid ${c.clase.color}">${c.clase.emoji} ${c.clase.nombre}</span>` : '';
        return `<div class="tooltip-stats">
            <div class="tt-head">${raza.emoji} <b>${c.nombre}</b> ${sx} <span class="badge">Nv.${c.nivel}</span></div>
            <div class="tt-sub">${raza.nombre} · Cond. ${Math.round(c.condicion)}%</div>
            <div style="margin:4px 0">${claseBadge}</div>
            ${bar('Vel',c.stats.velocidad)}
            ${bar('Punta',c.stats.velocidadPunta)}
            ${bar('Estam',c.stats.estamina)}
            ${bar('Salto',c.stats.salto)}
            ${bar('Acel',c.stats.aceleracion)}
        </div>`;
    },

    /* ---------- SIMULACIÓN ---------- */
    _renderHorseSelectPreview(ca) {
        const selEl = document.getElementById('race-horse-select');
        const prev = document.getElementById('race-horse-preview');
        if (!selEl || !prev) return;
        const c = Game.jugador.caballos.find(h => h.id === selEl.value);
        if (!c) { prev.innerHTML = ''; return; }
        const raza = DATA.razas[c.raza]||{nombre:'?'};
        const claseBadge = c.clase ? `<span class="badge" style="background:${c.clase.color}20;color:${c.clase.color};border:1px solid ${c.clase.color}">${c.clase.emoji} ${c.clase.nombre}</span>` : '';
        const equipList = c.equipo ? Object.entries(c.equipo).filter(([,v])=>v).map(([slot,id])=>{
            const eq = DATA.equipamiento && DATA.equipamiento[id]; return eq ? `${eq.emoji} ${eq.nombre}` : '';
        }).filter(Boolean).join(', ') : '';
        const bar = (n,v) => `<div class="sel-stat"><span>${n}</span><div class="sel-bar"><div style="width:${Math.min(100,v)}%"></div></div><b>${Math.round(v)}</b></div>`;
        prev.innerHTML = `<div class="horse-select-card">
            <div class="hsc-sprite">${Horse.visualHTML(c, 2, 'idle_right')}</div>
            <div class="hsc-info">
                <h3>${c.nombre} <span class="muted">${c.sexo==='macho'?'♂':'♀'}</span></h3>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
                    <span class="badge">${raza.nombre} · Nv.${c.nivel}</span>
                    ${claseBadge}
                </div>
                ${bar('Vel',c.stats.velocidad)}
                ${bar('Punta',c.stats.velocidadPunta)}
                ${bar('Estam',c.stats.estamina)}
                ${bar('Salto',c.stats.salto)}
                ${bar('Acel',c.stats.aceleracion)}
                <div class="sel-stat"><span>Condición</span><div class="sel-bar cond"><div style="width:${Math.round(c.condicion)}%"></div></div><b>${Math.round(c.condicion)}%</b></div>
                ${equipList ? `<p class="muted" style="margin-top:4px">${equipList}</p>` : '<p class="muted" style="margin-top:4px">Sin equipo</p>'}
            </div>
        </div>`;
    },

    _seleccionarCaballoParaCarrera(carreraId) {
        const ca = DATA.carreras.find(x => x.id === carreraId);
        if (!ca) return;
        const caballosDisponibles = Game.jugador.caballos.filter(h => h.condicion >= 10);
        if (caballosDisponibles.length === 0) {
            this.toast('Todos los caballos están agotados', 'error');
            return;
        }
        
        this.modal('Seleccionar caballo para la carrera', `
            <p class="muted mb-10">Carrera: <b>${ca.nombre}</b> · ${ca.distancia}m · Inscripción: <b>$${ca.costo_inscripcion}</b></p>
            <select id="horse-race-select" style="width:100%;padding:10px;margin-bottom:10px;border-radius:8px;border:1px solid var(--c-borde);background:var(--c-bg2);color:var(--c-texto)">
                ${caballosDisponibles.map(h => {
                    const raza = DATA.razas[h.raza] || {};
                    return `<option value="${h.id}">${raza.emoji||'🐴'} ${h.nombre} (Nv.${h.nivel}, Cond. ${Math.round(h.condicion)}%)</option>`;
                }).join('')}
            </select>
            <div id="horse-race-preview" style="margin-top:10px"></div>
        `, () => {
            const selId = document.getElementById('horse-race-select').value;
            const caballo = Game.jugador.caballos.find(h => h.id === selId);
            if (caballo) {
                Game.jugador.caballoSeleccionadoId = caballo.id;
                this.iniciarCarrera(carreraId);
            }
        });
        
        // Preview inicial
        setTimeout(() => {
            const selId = document.getElementById('horse-race-select').value;
            const caballo = Game.jugador.caballos.find(h => h.id === selId);
            if (caballo) {
                document.getElementById('horse-race-preview').innerHTML = this._horseSelectCardHTML(caballo);
            }
        }, 50);
        
        // Update preview on change
        document.getElementById('horse-race-select').addEventListener('change', (e) => {
            const caballo = Game.jugador.caballos.find(h => h.id === e.target.value);
            if (caballo) {
                document.getElementById('horse-race-preview').innerHTML = this._horseSelectCardHTML(caballo);
            }
        });
    },

    iniciarCarrera(id) {
        const ca = DATA.carreras.find(x => x.id===id);
        if (!ca) return;
        
        const cs = Game.jugador.caballos.filter(c => c.condicion >= 10);
        if (cs.length === 0) { this.toast('Ningún caballo disponible (condición < 10%)','error'); return; }
        
        this.modal('Seleccionar caballo', `
            <select id="race-horse-select" onchange="UI._renderHorseSelectPreview()" style="width:100%;padding:10px;margin-bottom:10px;border-radius:8px;border:1px solid var(--c-borde);background:var(--c-bg2);color:var(--c-texto)">
                ${cs.map(c => `<option value="${c.id}">${c.sexo==='macho'?'♂':'♀'} ${c.nombre} (Nv.${c.nivel}${c.clase?' · '+c.clase.emoji+c.clase.nombre:''})</option>`).join('')}
            </select>
            <div id="race-horse-preview"></div>
            <p class="muted" style="margin-top:8px">Carrera: <b>${ca.nombre}</b> (${ca.distancia}m, ${ca.tipo}) · Costo: <b>$${ca.costo_inscripcion}</b></p>
        `, () => {
            const selId = document.getElementById('race-horse-select').value;
            const j = Game.jugador.caballos.find(c => c.id === selId);
            if (!j) return;
            Game.jugador.caballoSeleccionadoId = j.id;
            
            if (!Game.cambiarDinero(-ca.costo_inscripcion)) { this.toast('Sin dinero','error'); return; }
            const comps = [j];
            for (let i=0; i<ca.num_competidores; i++) comps.push(Horse.crearIA(ca.nivel_ia));
            const sim = Race.simular(comps, ca);

            this._showRaceLoading(ca, () => {
                this.show('pantalla-simulacion');
                document.getElementById('titulo-simulacion').textContent = ca.nombre;
                document.getElementById('info-simulacion').textContent = `${ca.distancia}m · ${ca.terreno} · ${ca.clima}`;
                document.getElementById('distancia-total').textContent = ca.distancia;
                const esc = document.getElementById('escena-carrera');
                esc.dataset.clima = ca.clima;
                esc.dataset.terreno = ca.terreno;
                const lluvia = document.getElementById('lluvia');
                lluvia.innerHTML = '';
                if (ca.clima === 'lluvioso') {
                    for (let i=0; i<60; i++) {
                        const g = document.createElement('div');
                        g.className = 'gota';
                        g.style.left = Math.random()*100 + '%';
                        g.style.animationDuration = (0.4 + Math.random()*0.5) + 's';
                        g.style.animationDelay = (Math.random()*1) + 's';
                        g.style.opacity = 0.4 + Math.random()*0.5;
                        lluvia.appendChild(g);
                    }
                }
                this.animarCarrera(sim, ca, j);
            });
        });
        setTimeout(() => this._renderHorseSelectPreview(), 50);
    },

    /** Muestra overlay de carga con fondo del corral, llama onDone cuando termina */
    _showRaceLoading(ca, onDone) {
        let overlay = document.getElementById('race-loading');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'race-loading';
            overlay.className = 'race-loading';
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('fadeout');
        overlay.innerHTML = `
            <h2>${ca.nombre}</h2>
            <div class="info">${ca.distancia}m · ${ca.terreno} · ${ca.clima}</div>
            <div class="gate"></div>
            <div class="muted" style="font-style:italic">Preparando la pista...</div>
        `;
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.classList.add('fadeout');
            setTimeout(() => { overlay.style.display = 'none'; onDone(); }, 350);
        }, 1500);
    },

    animarCarrera(sim, carrera, mi, onFinish=null) {
        const { ranking, telemetria } = sim;
        this._raceEndPending = false;
        this._raceEnded = false;
        if (!onFinish) this._iniciarRitmoPerfecto(carrera, mi);
        else this._cerrarRitmoPerfecto();
        const carriles = document.getElementById('carriles');
        const claseBadge = (c) => c.clase ? `<span class="carril-clase" style="color:${c.clase.color}">${c.clase.emoji}</span>` : '';
        // Caballos van de IZQUIERDA → DERECHA usando animaciones _right
        carriles.innerHTML = ranking.map(r => {
            const c = r.caballo;
            const yo = c.id === mi.id;
            return `<div class="carril" data-id="${c.id}">
                <div class="carril-info ${yo?'tu':''}">${yo?'★ ':''}${claseBadge(c)}${c.nombre}</div>
                <div class="runner" style="left:2%">
                    <span class="runner-inner">${Horse.visualHTML(c, 1.2, 'gallop_right')}</span>
                    <span class="stamina-indicator"></span>
                    <span class="tired-fx"></span>
                    ${this.tooltipHTML(c)}
                </div>
            </div>`;
        }).join('');

        // Duración escala con distancia - CARRERAS MÁS LARGAS para dar tiempo a minijuegos
        const baseDur = onFinish ? 18000 : 35000;
        const distFactor = Math.sqrt(carrera.distancia / 50);
        const totalMs = Math.min(onFinish ? 45000 : 180000, baseDur + distFactor * 8000);
        const totalTicks = telemetria.length;
        const inicio = performance.now();
        const distEl = document.getElementById('distancia-actual');
        const posEl = document.getElementById('pos-actual');

        const tick = (now) => {
            const t = now - inicio;
            const tickIdx = Math.min(totalTicks - 1, Math.floor((t / totalMs) * totalTicks));
            const snapshot = telemetria[tickIdx];

            const miSnap = snapshot.find(s => s.id === mi.id);
            if (!miSnap) {
                console.warn('No se encontró telemetría para el caballo del jugador', mi.id);
                this._raceEnded = true;
                if (onFinish) onFinish(ranking, carrera, mi);
                else this.finalizarCarrera(ranking, carrera, mi);
                return;
            }
            let pos = 1;
            snapshot.forEach(s => { if (s.id !== mi.id && s.progreso > miSnap.progreso) pos++; });
            posEl.textContent = `${pos}°`;

            // Líder = mayor progreso
            let liderId = snapshot[0].id, liderProg = 0;
            snapshot.forEach(s => { if (s.progreso > liderProg) { liderProg = s.progreso; liderId = s.id; } });

            snapshot.forEach(s => {
                const runner = carriles.querySelector(`[data-id="${s.id}"] .runner`);
                if (!runner) return;
                const boost = this._skillRace && s.id === mi.id ? this._skillRace.bonusVisual : 0;
                const progresoVisual = Math.min(1, s.progreso + boost);
                // Izquierda→Derecha: progreso 0 = left 2%, progreso 1 = left 88%
                runner.style.left = Math.min(88, 2 + progresoVisual * 86) + '%';
                runner.classList.toggle('lider', s.id === liderId);
                runner.classList.toggle('cansado', !!s.cansado);
                runner.classList.toggle('fatiga-baja', !s.cansado && s.staminaPct < 0.3);

                // Stamina bar
                const stBar = runner.querySelector('.stamina-indicator');
                if (stBar) {
                    const pct = Math.round(s.staminaPct * 100);
                    stBar.style.width = pct + '%';
                    stBar.style.background = pct > 50 ? '#2ecc71' : pct > 25 ? '#f39c12' : '#e74c3c';
                }
                // Cambiar animación según cansancio (sprites.js lee data-anim en su loop)
                const cv = runner.querySelector('canvas.sprite-canvas');
                if (cv) {
                    if (s.cansado || s.staminaPct < 0.15) cv.dataset.anim = 'walk_right';
                    else if (s.staminaPct < 0.35) cv.dataset.anim = 'trot_right';
                    else cv.dataset.anim = 'gallop_right';
                }
            });
            distEl.textContent = Math.floor(miSnap.progreso * carrera.distancia);

            if (tickIdx < totalTicks - 1) {
                requestAnimationFrame(tick);
            } else if (!this._raceEnded) {
                // Esperar 2.5s tras llegar al último tick (todos terminan de verse)
                if (!this._raceEndPending) {
                    this._raceEndPending = true;
                    setTimeout(() => {
                        this._raceEndPending = false;
                        this._raceEnded = true;
                        if (onFinish) onFinish(ranking, carrera, mi);
                        else this.finalizarCarrera(this._aplicarRitmoPerfecto(ranking, mi), carrera, mi);
                    }, 2500);
                }
                requestAnimationFrame(tick);
            }
        };
        requestAnimationFrame(tick);
    },
    _iniciarRitmoPerfecto(carrera, mi) {
        this._cerrarRitmoPerfecto();
        const nivel = mi.nivel || 1;
        const dificultad = Math.min(5, Math.floor(nivel / 5) + 1);
        const tipos = ['ritmo', 'secuencia', 'reaccion', 'precision', 'memoria', 'combo', 'timing', 'reflejos'];
        const tipoActual = tipos[Math.floor(Math.random() * tipos.length)];
        
        const overlay = document.createElement('div');
        overlay.id = 'ritmo-perfecto';
        overlay.className = 'ritmo-perfecto';
        document.body.appendChild(overlay);
        
        this._skillRace = { 
            score: 0, 
            bonusVisual: 0, 
            overlay, 
            running: false,
            tipo: tipoActual,
            dificultad,
            nivel,
            cooldown: false
        };
        
        // Countdown inicial de 3 segundos
        overlay.innerHTML = `<div class="rp-title">🔒 Preparando minijuego...</div>
            <div class="rp-countdown" id="rp-countdown" style="font-size:3em;font-weight:bold;margin:20px 0">3</div>
            <div class="rp-info">El minijuego comenzará pronto</div>`;
        let countdown = 3;
        const countInterval = setInterval(() => {
            countdown--;
            const el = document.getElementById('rp-countdown');
            if (el) el.textContent = countdown > 0 ? countdown : '¡YA!';
            if (countdown <= 0) {
                clearInterval(countInterval);
                this._skillRace.running = true;
                this._iniciarMinijuego(tipoActual, dificultad, overlay);
            }
        }, 1000);
    },
    _iniciarMinijuego(tipo, dificultad, overlay) {
        const handlers = {
            ritmo: () => this._minijuegoRitmo(dificultad, overlay),
            secuencia: () => this._minijuegoSecuencia(dificultad, overlay),
            reaccion: () => this._minijuegoReaccion(dificultad, overlay),
            precision: () => this._minijuegoPrecision(dificultad, overlay),
            memoria: () => this._minijuegoMemoria(dificultad, overlay),
            combo: () => this._minijuegoCombo(dificultad, overlay),
            timing: () => this._minijuegoTiming(dificultad, overlay),
            reflejos: () => this._minijuegoReflejos(dificultad, overlay)
        };
        if (handlers[tipo]) handlers[tipo]();
    },
    
    _minijuegoRitmo(dif, overlay) {
        const velocidad = 0.6 + dif * 0.25;
        const zoneSize = Math.max(10, 20 - dif * 2);
        overlay.innerHTML = `<div class="rp-title">⚡ Ritmo Perfecto (Nv.${dif})</div>
            <div class="rp-bar"><div class="rp-zone" style="left:${50-zoneSize/2}%;width:${zoneSize}%"></div><div class="rp-cursor"></div></div>
            <div class="rp-info"><b id="rp-score">0</b> pts · Espacio/Click en verde</div>`;
        const s = this._skillRace;
        s.cursor = 0; s.dir = 1; s.lastHit = 0;
        const hit = (e) => {
            if (e && e.type === 'keydown' && e.code !== 'Space') return;
            if (e) e.preventDefault();
            if (!s.running || s.cooldown) return;
            const now = performance.now();
            const perfecto = s.cursor >= 50-zoneSize/4 && s.cursor <= 50+zoneSize/4;
            const bueno = s.cursor >= 50-zoneSize/2 && s.cursor <= 50+zoneSize/2;
            if (perfecto) { s.score += 3; s.bonusVisual = Math.min(0.1, s.bonusVisual + 0.022); this.toast('¡Perfecto!', 'exito'); }
            else if (bueno) { s.score += 1; s.bonusVisual = Math.min(0.06, s.bonusVisual + 0.012); }
            else { s.score = Math.max(0, s.score - 1); s.bonusVisual = Math.max(0, s.bonusVisual - 0.018); this.toast('Fallo', 'error'); }
            document.getElementById('rp-score').textContent = s.score;
            s.lastHit = now;
            s.cooldown = true;
            setTimeout(() => { if (s) s.cooldown = false; }, 1500);
        };
        s.hit = hit;
        window.addEventListener('keydown', hit);
        overlay.addEventListener('pointerdown', hit);
        const loop = () => {
            if (!s.running) return;
            s.cursor += s.dir * velocidad;
            if (s.cursor >= 100) { s.cursor = 100; s.dir = -1; }
            if (s.cursor <= 0) { s.cursor = 0; s.dir = 1; }
            const cur = overlay.querySelector('.rp-cursor');
            if (cur) cur.style.left = s.cursor + '%';
            s.bonusVisual = Math.max(0, s.bonusVisual - 0.0009);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },
    
    _minijuegoSecuencia(dif, overlay) {
        const longitud = 2 + dif;
        const teclas = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
        const simbolos = {'ArrowUp':'↑','ArrowDown':'↓','ArrowLeft':'←','ArrowRight':'→'};
        const secuencia = Array.from({length:longitud}, () => teclas[Math.floor(Math.random()*teclas.length)]);
        overlay.innerHTML = `<div class="rp-title">🎯 Secuencia (Nv.${dif})</div>
            <div class="rp-seq">${secuencia.map(k => `<span class="seq-key">${simbolos[k]}</span>`).join('')}</div>
            <div class="rp-info"><b id="rp-score">0</b> pts · Presiona las flechas en orden</div>`;
        const s = this._skillRace;
        s.seqIdx = 0; s.secuencia = secuencia; s.cooldown = false;
        const hit = (e) => {
            if (!s.running || e.type !== 'keydown' || s.cooldown) return;
            if (e.code === secuencia[s.seqIdx]) {
                s.seqIdx++;
                overlay.querySelectorAll('.seq-key')[s.seqIdx-1].style.background = '#2ecc71';
                if (s.seqIdx >= secuencia.length) {
                    s.score += 4 + dif;
                    s.bonusVisual = Math.min(0.12, s.bonusVisual + 0.03);
                    this.toast('¡Secuencia completa!', 'exito');
                    s.seqIdx = 0;
                    overlay.querySelectorAll('.seq-key').forEach(k => k.style.background = '');
                }
            } else if (teclas.includes(e.code)) {
                s.score = Math.max(0, s.score - 2);
                s.bonusVisual = Math.max(0, s.bonusVisual - 0.02);
                s.seqIdx = 0;
                this.toast('Secuencia incorrecta', 'error');
                document.getElementById('rp-score').textContent = s.score;
                // Reiniciar con nueva secuencia después de fallar
                s.cooldown = true;
                setTimeout(() => {
                    if (!s.running) return;
                    const newSeq = Array.from({length:longitud}, () => teclas[Math.floor(Math.random()*teclas.length)]);
                    s.secuencia = newSeq;
                    overlay.querySelector('.rp-seq').innerHTML = newSeq.map(k => `<span class="seq-key">${simbolos[k]}</span>`).join('');
                    s.seqIdx = 0;
                    s.cooldown = false;
                }, 1500);
                return;
            }
            document.getElementById('rp-score').textContent = s.score;
        };
        s.hit = hit;
        window.addEventListener('keydown', hit);
    },
    
    _minijuegoReaccion(dif, overlay) {
        const intervalo = Math.max(800, 2200 - dif * 300);
        overlay.innerHTML = `<div class="rp-title">⚡ Reacción (Nv.${dif})</div>
            <div class="rp-react" id="rp-react">Espera...</div>
            <div class="rp-info"><b id="rp-score">0</b> pts · Presiona cuando veas ¡YA!</div>`;
        const s = this._skillRace;
        s.esperando = false; s.momento = 0; s.timeoutId = null;
        const mostrar = () => {
            if (!s.running) return;
            const react = document.getElementById('rp-react');
            if (!react) return;
            react.textContent = '¡YA!';
            react.style.background = '#2ecc71';
            react.style.transform = 'scale(1.3)';
            s.esperando = true;
            s.momento = performance.now();
            // Timeout de 2 segundos si no presiona
            s.timeoutId = setTimeout(() => {
                if (s.esperando) {
                    s.score = Math.max(0, s.score - 2);
                    this.toast('Muy lento', 'error');
                    document.getElementById('rp-score').textContent = s.score;
                    reset();
                }
            }, 2000);
        };
        const reset = () => {
            if (!s.running) return;
            if (s.timeoutId) clearTimeout(s.timeoutId);
            const react = document.getElementById('rp-react');
            if (react) {
                react.textContent = 'Espera...';
                react.style.background = '';
                react.style.transform = '';
            }
            s.esperando = false;
            s.cooldown = true;
            setTimeout(() => {
                if (s) {
                    s.cooldown = false;
                    mostrar();
                }
            }, Math.random() * intervalo + intervalo + 1500);
        };
        const hit = (e) => {
            if (!s.running || s.cooldown) return;
            if (e && e.type === 'keydown' && e.code !== 'Space') return;
            if (e) e.preventDefault();
            if (s.esperando) {
                if (s.timeoutId) clearTimeout(s.timeoutId);
                const tiempo = performance.now() - s.momento;
                const puntos = tiempo < 200 ? 5 : tiempo < 400 ? 3 : 1;
                s.score += puntos;
                s.bonusVisual = Math.min(0.1, s.bonusVisual + 0.02);
                this.toast(`${tiempo.toFixed(0)}ms!`, 'exito');
                document.getElementById('rp-score').textContent = s.score;
                reset();
            } else {
                s.score = Math.max(0, s.score - 2);
                this.toast('Muy pronto', 'error');
                document.getElementById('rp-score').textContent = s.score;
            }
        };
        s.hit = hit;
        window.addEventListener('keydown', hit);
        overlay.addEventListener('pointerdown', hit);
        setTimeout(mostrar, intervalo);
    },
    
    _minijuegoPrecision(dif, overlay) {
        const velocidad = 0.5 + dif * 0.2;
        const targetSize = Math.max(8, 18 - dif * 2);
        overlay.innerHTML = `<div class="rp-title">🎯 Precisión (Nv.${dif})</div>
            <div class="rp-bar"><div class="rp-target" id="rp-target" style="width:${targetSize}%"></div><div class="rp-cursor"></div></div>
            <div class="rp-info"><b id="rp-score">0</b> pts · Click cuando cursor toque objetivo</div>`;
        const s = this._skillRace;
        s.cursor = 0; s.dir = 1; s.targetPos = Math.random() * (100 - targetSize);
        document.getElementById('rp-target').style.left = s.targetPos + '%';
        const hit = (e) => {
            if (e && e.type === 'keydown' && e.code !== 'Space') return;
            if (e) e.preventDefault();
            if (!s.running) return;
            if (s.cursor >= s.targetPos && s.cursor <= s.targetPos + targetSize) {
                s.score += 3;
                s.bonusVisual = Math.min(0.1, s.bonusVisual + 0.02);
                this.toast('¡En el blanco!', 'exito');
                s.targetPos = Math.random() * (100 - targetSize);
                document.getElementById('rp-target').style.left = s.targetPos + '%';
            } else {
                s.score = Math.max(0, s.score - 1);
                this.toast('Fallaste', 'error');
            }
            document.getElementById('rp-score').textContent = s.score;
        };
        s.hit = hit;
        window.addEventListener('keydown', hit);
        overlay.addEventListener('pointerdown', hit);
        const loop = () => {
            if (!s.running) return;
            s.cursor += s.dir * velocidad;
            if (s.cursor >= 100) { s.cursor = 100; s.dir = -1; }
            if (s.cursor <= 0) { s.cursor = 0; s.dir = 1; }
            const cur = overlay.querySelector('.rp-cursor');
            if (cur) cur.style.left = s.cursor + '%';
            s.bonusVisual = Math.max(0, s.bonusVisual - 0.0009);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },
    
    _minijuegoMemoria(dif, overlay) {
        const cantidad = 2 + dif;
        const colores = ['🔴','🔵','🟢','🟡','🟣','🟠'];
        const secuencia = Array.from({length:cantidad}, () => colores[Math.floor(Math.random()*colores.length)]);
        overlay.innerHTML = `<div class="rp-title">🧠 Memoria (Nv.${dif})</div>
            <div class="rp-mem" id="rp-mem">${secuencia.join(' ')}</div>
            <div class="rp-mem-btns" id="rp-mem-btns" style="display:none">${colores.map(c => `<button class="mem-btn" data-color="${c}">${c}</button>`).join('')}</div>
            <div class="rp-info"><b id="rp-score">0</b> pts · Memoriza y repite</div>`;
        const s = this._skillRace;
        s.secuencia = secuencia; s.memIdx = 0; s.mostrando = true;
        const tiempoMemorizar = 2500 + dif * 600;
        setTimeout(() => {
            if (!s.running) return;
            document.getElementById('rp-mem').textContent = '???';
            document.getElementById('rp-mem-btns').style.display = 'flex';
            s.mostrando = false;
        }, tiempoMemorizar);
        overlay.querySelectorAll('.mem-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (s.mostrando || !s.running) return;
                if (btn.dataset.color === s.secuencia[s.memIdx]) {
                    s.memIdx++;
                    if (s.memIdx >= s.secuencia.length) {
                        s.score += 5 + dif;
                        s.bonusVisual = Math.min(0.12, s.bonusVisual + 0.035);
                        this.toast('¡Correcto!', 'exito');
                        s.memIdx = 0; s.mostrando = true;
                        const newSeq = Array.from({length:cantidad}, () => colores[Math.floor(Math.random()*colores.length)]);
                        s.secuencia = newSeq;
                        document.getElementById('rp-mem').textContent = newSeq.join(' ');
                        document.getElementById('rp-mem-btns').style.display = 'none';
                        setTimeout(() => {
                            if (!s.running) return;
                            document.getElementById('rp-mem').textContent = '???';
                            document.getElementById('rp-mem-btns').style.display = 'flex';
                            s.mostrando = false;
                        }, 1500 + dif * 400);
                    }
                } else {
                    s.score = Math.max(0, s.score - 2);
                    s.bonusVisual = Math.max(0, s.bonusVisual - 0.02);
                    s.memIdx = 0;
                    this.toast('Incorrecto', 'error');
                    document.getElementById('rp-score').textContent = s.score;
                    // Reiniciar con nueva secuencia después de fallar
                    s.mostrando = true;
                    const newSeq = Array.from({length:cantidad}, () => colores[Math.floor(Math.random()*colores.length)]);
                    s.secuencia = newSeq;
                    document.getElementById('rp-mem').textContent = newSeq.join(' ');
                    document.getElementById('rp-mem-btns').style.display = 'none';
                    setTimeout(() => {
                        if (!s.running) return;
                        document.getElementById('rp-mem').textContent = '???';
                        document.getElementById('rp-mem-btns').style.display = 'flex';
                        s.mostrando = false;
                    }, tiempoMemorizar);
                    return;
                }
                document.getElementById('rp-score').textContent = s.score;
            });
        });
    },
    
    _minijuegoCombo(dif, overlay) {
        const objetivo = 3 + dif * 2;
        overlay.innerHTML = `<div class="rp-title">🔥 Combo (Nv.${dif})</div>
            <div class="rp-combo">Presiona Espacio <b>${objetivo}</b> veces rápido</div>
            <div class="rp-combo-bar"><div id="rp-combo-fill" style="width:0%"></div></div>
            <div class="rp-info"><b id="rp-score">0</b> pts · Combo: <b id="rp-combo">0</b>/${objetivo}</div>`;
        const s = this._skillRace;
        s.combo = 0; s.comboTime = 0; s.objetivo = objetivo;
        const hit = (e) => {
            if (e && e.type === 'keydown' && e.code !== 'Space') return;
            if (e) e.preventDefault();
            if (!s.running) return;
            const now = performance.now();
            if (now - s.comboTime < 1500) {
                s.combo++;
                document.getElementById('rp-combo').textContent = s.combo;
                document.getElementById('rp-combo-fill').style.width = (s.combo / objetivo * 100) + '%';
                if (s.combo >= objetivo) {
                    s.score += 6 + dif;
                    s.bonusVisual = Math.min(0.12, s.bonusVisual + 0.04);
                    this.toast('¡Combo completo!', 'exito');
                    s.combo = 0;
                    document.getElementById('rp-combo').textContent = '0';
                    document.getElementById('rp-combo-fill').style.width = '0%';
                }
            } else {
                if (s.combo > 0) {
                    s.score = Math.max(0, s.score - 1);
                    this.toast('Combo roto', 'error');
                }
                s.combo = 1;
                document.getElementById('rp-combo').textContent = '1';
                document.getElementById('rp-combo-fill').style.width = (1 / objetivo * 100) + '%';
            }
            s.comboTime = now;
            document.getElementById('rp-score').textContent = s.score;
        };
        s.hit = hit;
        window.addEventListener('keydown', hit);
        overlay.addEventListener('pointerdown', hit);
    },
    
    _minijuegoTiming(dif, overlay) {
        const velocidad = 0.8 + dif * 0.3;
        const zonas = 2 + Math.floor(dif / 2);
        let zonasHTML = '';
        for (let i = 0; i < zonas; i++) {
            const pos = (i + 1) * (100 / (zonas + 1)) - 5;
            zonasHTML += `<div class="rp-zone" style="left:${pos}%;width:10%"></div>`;
        }
        overlay.innerHTML = `<div class="rp-title">⏱️ Timing (Nv.${dif})</div>
            <div class="rp-bar">${zonasHTML}<div class="rp-cursor"></div></div>
            <div class="rp-info"><b id="rp-score">0</b> pts · Presiona en cualquier zona verde</div>`;
        const s = this._skillRace;
        s.cursor = 0; s.dir = 1; s.zonas = zonas;
        const hit = (e) => {
            if (e && e.type === 'keydown' && e.code !== 'Space') return;
            if (e) e.preventDefault();
            if (!s.running) return;
            let enZona = false;
            for (let i = 0; i < zonas; i++) {
                const pos = (i + 1) * (100 / (zonas + 1));
                if (s.cursor >= pos - 5 && s.cursor <= pos + 5) enZona = true;
            }
            if (enZona) {
                s.score += 2;
                s.bonusVisual = Math.min(0.1, s.bonusVisual + 0.018);
                this.toast('¡Timing!', 'exito');
            } else {
                s.score = Math.max(0, s.score - 1);
                this.toast('Fallo', 'error');
            }
            document.getElementById('rp-score').textContent = s.score;
        };
        s.hit = hit;
        window.addEventListener('keydown', hit);
        overlay.addEventListener('pointerdown', hit);
        const loop = () => {
            if (!s.running) return;
            s.cursor += s.dir * velocidad;
            if (s.cursor >= 100) { s.cursor = 100; s.dir = -1; }
            if (s.cursor <= 0) { s.cursor = 0; s.dir = 1; }
            const cur = overlay.querySelector('.rp-cursor');
            if (cur) cur.style.left = s.cursor + '%';
            s.bonusVisual = Math.max(0, s.bonusVisual - 0.0009);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },
    
    _minijuegoReflejos(dif, overlay) {
        const velocidad = 0.9 + dif * 0.35;
        overlay.innerHTML = `<div class="rp-title">💨 Reflejos (Nv.${dif})</div>
            <div class="rp-bar"><div class="rp-zone rp-zone-moving" id="rp-zone-moving" style="width:12%"></div><div class="rp-cursor"></div></div>
            <div class="rp-info"><b id="rp-score">0</b> pts · Presiona cuando cursor toque zona móvil</div>`;
        const s = this._skillRace;
        s.cursor = 0; s.dir = 1; s.zonePos = 50; s.zoneDir = 1;
        const hit = (e) => {
            if (e && e.type === 'keydown' && e.code !== 'Space') return;
            if (e) e.preventDefault();
            if (!s.running) return;
            if (s.cursor >= s.zonePos && s.cursor <= s.zonePos + 12) {
                s.score += 4;
                s.bonusVisual = Math.min(0.12, s.bonusVisual + 0.025);
                this.toast('¡Reflejos!', 'exito');
            } else {
                s.score = Math.max(0, s.score - 1);
                this.toast('Fallaste', 'error');
            }
            document.getElementById('rp-score').textContent = s.score;
        };
        s.hit = hit;
        window.addEventListener('keydown', hit);
        overlay.addEventListener('pointerdown', hit);
        const loop = () => {
            if (!s.running) return;
            s.cursor += s.dir * velocidad;
            if (s.cursor >= 100) { s.cursor = 100; s.dir = -1; }
            if (s.cursor <= 0) { s.cursor = 0; s.dir = 1; }
            s.zonePos += s.zoneDir * (0.6 + dif * 0.2);
            if (s.zonePos >= 88) { s.zonePos = 88; s.zoneDir = -1; }
            if (s.zonePos <= 0) { s.zonePos = 0; s.zoneDir = 1; }
            const cur = overlay.querySelector('.rp-cursor');
            const zone = document.getElementById('rp-zone-moving');
            if (cur) cur.style.left = s.cursor + '%';
            if (zone) zone.style.left = s.zonePos + '%';
            s.bonusVisual = Math.max(0, s.bonusVisual - 0.0009);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },
    _aplicarRitmoPerfecto(ranking, mi) {
        const score = this._skillRace ? this._skillRace.score : 0;
        this._cerrarRitmoPerfecto();
        if (!score) return ranking;
        const adjusted = ranking.map(r => ({ ...r }));
        const mine = adjusted.find(r => r.caballo.id === mi.id);
        if (!mine) return ranking;
        mine.tiempo = Math.max(0.5, mine.tiempo - score * 0.18);
        mine.bonusRitmo = score;
        adjusted.sort((a,b) => a.tiempo - b.tiempo);
        adjusted.forEach((x,i) => { x.posicion = i + 1; x.premio = ranking.find(r => r.posicion === x.posicion)?.premio || x.premio || 0; });
        return adjusted;
    },
    _cerrarRitmoPerfecto() {
        if (this._skillRace && this._skillRace.hit) window.removeEventListener('keydown', this._skillRace.hit);
        const el = document.getElementById('ritmo-perfecto');
        if (el) el.remove();
        if (this._skillRace) this._skillRace.running = false;
        this._skillRace = null;
    },
    finalizarCarreraOnline(resultados, carrera, mi, match) {
        const r = resultados.find(x => x.caballo.id === mi.id);
        const pos = r.posicion;
        const lista = document.getElementById('lista-resultados');
        const med = ['🥇','🥈','🥉','4°'];
        lista.innerHTML = `<h3 class="mb-10">🌐 ${carrera.nombre}</h3>` +
            resultados.map(x => {
                const yo = x.caballo.id === mi.id;
                const flags = [];
                if (x.cansado) flags.push('<span class="flag-cansado">se cansó</span>');
                return `<div class="resultado-fila ${yo?'tu':''}">
                    <span class="tt-host">
                        <span class="medalla">${med[x.posicion-1] || x.posicion + '°'}</span>
                        <span class="horse-avatar sm">${Horse.visualHTML(x.caballo,0.7)}</span>
                        <span class="rf-nombre">${x.caballo.nombre} ${yo?'<b>(TÚ)</b>':'<b>(RIVAL)</b>'}${flags.length?' '+flags.join(' '):''}</span>
                        ${this.tooltipHTML(x.caballo)}
                    </span>
                    <span class="rf-stats">${x.tiempo.toFixed(2)}s</span>
                </div>`;
            }).join('');

        const ganador = pos === 1;
        document.getElementById('resumen-resultados').innerHTML = `<h3 class="mb-10">${ganador?'🎉 ¡Ganaste!':'💪 Buen intento'}</h3>
            <p>Resultado online: <b>${pos}° de ${resultados.length}</b></p>
            <p>Rival: <b>${match.opponent.username || match.opponent.email}</b></p>
            <p>Lobby: <b>#${match.id}</b></p>
            <p class="muted mt-10">Las carreras online no consumen condición ni entregan premios todavía.</p>`;
        this.show('pantalla-resultados');
    },
    finalizarCarrera(resultados, carrera, mi) {
        const r = resultados.find(x => x.caballo.id===mi.id);
        const pos = r.posicion, premio = r.premio;
        if (premio>0) Game.cambiarDinero(premio);
        mi.dinero_generado += premio;
        // Fatiga base + extra si terminó cansado
        let fatiga = CONFIG.FATIGA_POR_CARRERA;
        if (r.cansado) fatiga += 15;
        mi.condicion = Math.max(0, mi.condicion - fatiga);
        mi.carreras_jugadas++;
        Game.jugador.estadisticas.carreras_jugadas++;
        if (pos===1) {
            mi.carreras_ganadas++;
            Game.jugador.estadisticas.victorias++;
            const t = Game.jugador.estadisticas.victorias_por_tipo;
            t[carrera.id] = (t[carrera.id]||0) + 1;
        }
        if (pos<=3) Game.jugador.estadisticas.podios++;
        let xp = CONFIG.XP_GANADA_BASE;
        if (pos===1) xp += CONFIG.XP_BONO_VICTORIA;
        else if (pos<=3) xp += CONFIG.XP_BONO_PODIO;
        const ns = Horse.añadirXP(mi, xp);
        // Render resultados (sin emojis innecesarios)
        const lista = document.getElementById('lista-resultados');
        const med = ['1°','2°','3°','4°','5°','6°'];
        lista.innerHTML = `<h3 class="mb-10">${carrera.nombre}</h3>` +
            resultados.map(x => {
                const yo = x.caballo.id===mi.id;
                const flags = [];
                if (x.cansado) flags.push('<span class="flag-cansado">se cansó</span>');
                if (x.tropezones>0) flags.push(`<span class="flag-tropezo">${x.tropezones} tropezón${x.tropezones>1?'es':''}</span>`);
                return `<div class="resultado-fila ${yo?'tu':''}">
                    <span class="tt-host">
                        <span class="medalla">${med[x.posicion-1]||(x.posicion+'°')}</span>
                        <span class="horse-avatar sm">${Horse.visualHTML(x.caballo,0.7)}</span>
                        <span class="rf-nombre">${x.caballo.nombre} ${yo?'<b>(TÚ)</b>':''}${flags.length?' '+flags.join(' '):''}</span>
                        ${this.tooltipHTML(x.caballo)}
                    </span>
                    <span class="rf-stats">${x.tiempo.toFixed(2)}s${x.premio?` &middot; <b>$${x.premio}</b>`:''}</span>
                </div>`;
            }).join('');
        // XP del jugador (separado del XP del caballo)
        const xpJug = Math.ceil(carrera.distancia / 5) + (pos===1 ? 50 : pos<=3 ? 25 : 10);
        const levelUps = Game.añadirXPJugador(xpJug);

        const res = document.getElementById('resumen-resultados');
        const cansadoMsg = r.cansado ? '<p class="advertencia">Tu caballo terminó exhausto: estamina insuficiente para esta distancia.</p>' : '';
        const nivelJug = Game.jugador.nivelJugador;
        const xpMaxJug = Game.xpNivelJugador(nivelJug);
        const xpPctJug = Math.min(100, Math.round(((Game.jugador.xpJugador||0) / xpMaxJug) * 100));
        res.innerHTML = `<h3 class="mb-10">Resumen</h3>
            <p>Posición: <b>${pos}° de ${resultados.length}</b></p>
            <p>Premio: <b>$${premio}</b></p>
            <p>XP caballo: <b>+${xp}</b> ${ns?`<span style="color:var(--c-prim)">(¡+${ns} nivel${ns>1?'es':''}!)</span>`:''}</p>
            <p>Condición restante: <b>${Math.round(mi.condicion)}%</b></p>
            <div style="margin-top:10px;padding:8px;background:var(--c-bg2);border-radius:8px">
                <div style="display:flex;align-items:center;gap:8px">
                    <span class="menu-nivel-badge">🌟 Nv.${nivelJug}</span>
                    <div class="menu-xp-bar" style="flex:1"><div class="menu-xp-fill" style="width:${xpPctJug}%"></div></div>
                    <span class="muted" style="font-size:.75em">+${xpJug} XP</span>
                </div>
            </div>
            ${cansadoMsg}`;
        this._postAccion();
        this.show('pantalla-resultados');
        if (levelUps.length) setTimeout(() => this._mostrarLevelUp(levelUps), 1000);
    },

    _mostrarLevelUp(subidas) {
        const s = subidas[0];
        const r = s.recompensa;
        const premios = [];
        if (r.dinero) premios.push(`💰 +$${r.dinero.toLocaleString()}`);
        if (r.equipo && DATA.equipamiento && DATA.equipamiento[r.equipo]) {
            const eq = DATA.equipamiento[r.equipo];
            premios.push(`${eq.emoji} ${eq.nombre} añadido al inventario`);
        }
        if (r.caballoNombre) premios.push(`🐴 Nuevo caballo: <b>${r.caballoNombre}</b>`);
        this.modal(`🌟 ¡Subiste de Nivel!`,
            `<div class="level-up-body">
                <div class="level-up-number">${s.nivel}</div>
                <p style="margin-top:8px;font-weight:600">${r.mensaje || '¡Felicidades!'}</p>
                ${premios.length ? `<div class="level-up-prizes">${premios.map(p=>`<div class="prize-item">${p}</div>`).join('')}</div>` : ''}
            </div>`,
            null, [{ texto:'¡Genial! 🎉', clase:'btn-success', onClick: () => {
                if (subidas.length > 1) setTimeout(() => this._mostrarLevelUp(subidas.slice(1)), 300);
            }}]
        );
    },

    /* ---------- TIENDA ---------- */
    renderTienda() {
        document.querySelectorAll('#tienda-tabs .tab').forEach(b => {
            b.classList.toggle('activa', b.dataset.tab === this.tabTienda);
            b.onclick = () => { this.tabTienda = b.dataset.tab; this.renderTienda(); };
        });
        const cont = document.getElementById('tienda-contenido');
        if (this.tabTienda==='caballos') {
            const t = Game.jugador.tiendaCaballos;
            cont.innerHTML = `<button class="btn btn-sec mb-10" onclick="UI.refreshTienda()">🔄 Refrescar (gratis)</button>` +
                t.map((c,idx) => `${this.cardCaballo(c,false)}
                <div style="margin:-8px 0 14px"><button class="btn btn-success" ${Game.jugador.dinero<c.valor_compra?'disabled':''} onclick="UI.comprarCaballo(${idx})">💰 Comprar - $${c.valor_compra}</button></div>`).join('');
        } else if (this.tabTienda==='entrenamientos') {
            const cs = Game.jugador.caballos;
            if (cs.length === 0) { cont.innerHTML='<p class="muted">Sin caballos.</p>'; return; }
            const c = Game.getCaballoSeleccionado();
            cont.innerHTML = `<div class="mb-10">
                <label class="muted">Seleccionar caballo:</label>
                <select onchange="UI.seleccionar(this.value); UI.renderTienda()">
                    ${cs.map(h=>`<option value="${h.id}" ${c && c.id===h.id?'selected':''}>${h.sexo==='macho'?'♂':'♀'} ${h.nombre} (Nv.${h.nivel}, ${h.clase?h.clase.emoji+' '+h.clase.nombre:''}, cond. ${Math.round(h.condicion)}%)</option>`).join('')}
                </select>
            </div>` +
                Object.entries(DATA.entrenamientos).map(([id,e]) => `<div class="tarjeta">
                    <div class="tarjeta-titulo"><h3>${e.emoji} ${e.nombre}</h3><span class="badge">$${e.costo}</span></div>
                    <p class="muted">${Object.entries(e.mejora).map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(' · ')}</p>
                    <button class="btn btn-success" ${(Game.jugador.dinero<e.costo||c.condicion<20)?'disabled':''} onclick="UI.entrenar('${id}')">${c.condicion<20?'😴 Agotado':(Game.jugador.dinero<e.costo?'💸 Sin dinero':'Entrenar')}</button>
                </div>`).join('');
        } else if (this.tabTienda==='equipamiento') {
            const cs = Game.jugador.caballos;
            if (cs.length === 0) { cont.innerHTML='<p class="muted">Sin caballos.</p>'; return; }
            const c = Game.getCaballoSeleccionado();
            const inv = Game.jugador.inventarioEquipo || [];
            // Current equipment display
            const slotNames = { montura:'Montura', herradura:'Herradura', rienda:'Riendas' };
            const slotIcons = { montura:'🏇', herradura:'🔩', rienda:'➰' };
            let equipHTML = `<div class="mb-10">
                <label class="muted">Caballo:</label>
                <select onchange="UI.seleccionar(this.value); UI.renderTienda()">
                    ${cs.map(h=>`<option value="${h.id}" ${c && c.id===h.id?'selected':''}>${h.sexo==='macho'?'♂':'♀'} ${h.nombre} (Nv.${h.nivel})</option>`).join('')}
                </select>
            </div>`;
            equipHTML += `<div class="tarjeta"><h3>Equipo actual: ${c.nombre}</h3>`;
            for (const slot in slotNames) {
                const eqId = c.equipo && c.equipo[slot];
                const eq = eqId && DATA.equipamiento && DATA.equipamiento[eqId];
                equipHTML += `<div class="equip-slot">
                    <span class="equip-slot-icon">${slotIcons[slot]}</span>
                    <span class="equip-slot-name">${slotNames[slot]}</span>
                    <span class="equip-slot-value">${eq ? `${eq.emoji} ${eq.nombre} <span class="muted">(${eq.descripcion})</span>` : '<span class="muted">Vacío</span>'}</span>
                    ${eq ? `<button class="btn btn-sec btn-pequeño" onclick="UI.desequipar('${slot}')">Quitar</button>` : ''}
                </span></div>`;
            }
            equipHTML += `</div>`;
            // Inventory
            if (inv.length) {
                equipHTML += `<h3 class="mt-10 mb-10">Inventario</h3>`;
                inv.forEach((eqId, idx) => {
                    const eq = DATA.equipamiento[eqId];
                    if (!eq) return;
                    equipHTML += `<div class="tarjeta equip-inv-item">
                        <div class="tarjeta-titulo"><h3>${eq.emoji} ${eq.nombre}</h3><span class="badge">${slotNames[eq.slot]||eq.slot}</span></div>
                        <p class="muted">${eq.descripcion}</p>
                        <button class="btn btn-success btn-pequeño" onclick="UI.equipar(${idx})">Equipar a ${c.nombre}</button>
                    </div>`;
                });
            }
            // Shop
            equipHTML += `<h3 class="mt-10 mb-10">Comprar equipamiento</h3>`;
            Object.entries(DATA.equipamiento||{}).map(([id,eq]) => {
                equipHTML += `<div class="tarjeta">
                    <div class="tarjeta-titulo"><h3>${eq.emoji} ${eq.nombre}</h3><div><span class="badge">${slotNames[eq.slot]||eq.slot}</span> <span class="badge badge-sec">$${eq.precio}</span></div></div>
                    <p class="muted">${eq.descripcion}</p>
                    <button class="btn btn-success" ${Game.jugador.dinero<eq.precio?'disabled':''} onclick="UI.comprarEquipo('${id}')">Comprar</button>
                </div>`;
            });
            cont.innerHTML = equipHTML;
        } else {
            const c = Game.getCaballoSeleccionado();
            if (!c) { cont.innerHTML='<p class="muted">Sin caballo.</p>'; return; }
            cont.innerHTML = `<p class="muted mb-10">Aplicar a: <b>${c.nombre}</b></p>` +
                Object.entries(DATA.items).map(([id,it]) => `<div class="tarjeta">
                    <div class="tarjeta-titulo"><h3>${it.emoji} ${it.nombre}</h3><span class="badge">$${it.precio}</span></div>
                    <p class="muted">${it.descripcion}</p>
                    <button class="btn btn-success" ${Game.jugador.dinero<it.precio?'disabled':''} onclick="UI.usarItem('${id}')">Comprar y usar</button>
                </div>`).join('');
        }
    },
    comprarEquipo(eqId) {
        const eq = DATA.equipamiento[eqId]; if (!eq) return;
        if (!Game.cambiarDinero(-eq.precio)) { this.toast('Sin dinero','error'); return; }
        Game.jugador.inventarioEquipo.push(eqId);
        this.toast(`Compraste ${eq.nombre}`,'exito');
        this._postAccion(); this.renderTienda();
    },
    equipar(invIdx) {
        const inv = Game.jugador.inventarioEquipo;
        const eqId = inv[invIdx]; if (!eqId) return;
        const eq = DATA.equipamiento[eqId]; if (!eq) return;
        const c = Game.getCaballoSeleccionado(); if (!c) return;
        if (!c.equipo) c.equipo = { montura:null, herradura:null, rienda:null };
        // Si ya tiene algo en ese slot, devolver al inventario
        if (c.equipo[eq.slot]) inv.push(c.equipo[eq.slot]);
        c.equipo[eq.slot] = eqId;
        inv.splice(invIdx, 1);
        c.clase = Horse._determinarClase(c);
        this.toast(`${eq.nombre} equipado a ${c.nombre}`,'exito');
        this._postAccion(); this.renderTienda();
    },
    desequipar(slot) {
        const c = Game.getCaballoSeleccionado(); if (!c || !c.equipo) return;
        const eqId = c.equipo[slot]; if (!eqId) return;
        Game.jugador.inventarioEquipo.push(eqId);
        c.equipo[slot] = null;
        this.toast('Equipo removido');
        this._postAccion(); this.renderTienda();
    },
    refreshTienda() { Game.regenerarTiendaCaballos(); this.renderTienda(); this.toast('Tienda renovada'); },
    comprarCaballo(idx) {
        const c = Game.jugador.tiendaCaballos[idx]; if (!c) return;
        if (!Game.cambiarDinero(-c.valor_compra)) { this.toast('Sin dinero','error'); return; }
        Game.jugador.caballos.push(c);
        Game.jugador.estadisticas.caballos_comprados++;
        Game.jugador.tiendaCaballos.splice(idx,1);
        this.toast(`¡Compraste a ${c.nombre}!`,'exito');
        this._postAccion(); this.renderTienda();
    },
    entrenar(id) {
        const c = Game.getCaballoSeleccionado();
        const e = DATA.entrenamientos[id];
        if (!Game.cambiarDinero(-e.costo)) { this.toast('Sin dinero','error'); return; }
        Horse.entrenar(c, id);
        this.toast(`${c.nombre} entrenó ${e.nombre}`,'exito');
        this._postAccion(); this.renderTienda();
    },
    usarItem(id) {
        const c = Game.getCaballoSeleccionado();
        const it = DATA.items[id];
        if (!Game.cambiarDinero(-it.precio)) { this.toast('Sin dinero','error'); return; }
        Horse.aplicarItem(c, id);
        this.toast(`${it.nombre} aplicado a ${c.nombre}`,'exito');
        this._postAccion(); this.renderTienda();
    },

    /* ---------- CRÍA ---------- */
    renderCria() {
        const cont = document.getElementById('cria-contenido');
        const cs = Game.jugador.caballos;
        if (cs.length<2) { cont.innerHTML = '<p class="muted">Necesitas al menos 2 caballos (1 ♂ y 1 ♀) para criar.</p>'; return; }
        const a = cs.find(c=>c.id===this._criaSel.a);
        const b = cs.find(c=>c.id===this._criaSel.b);
        const puede = (a&&b) ? Breeding.pueden(a,b) : { ok:false, motivo:'Selecciona 2 caballos' };
        const costo = (a&&b) ? Breeding.costo(a,b) : CONFIG.COSTO_CRIA;
        cont.innerHTML = `<p class="muted mb-10">Combina ♂ y ♀. El potrillo hereda parte de los stats de ambos padres.</p>
        <div class="grid-2">
            <div><label class="muted">Padre 1:</label>
                <select onchange="UI._criaPick('a',this.value)">
                    <option value="">--</option>
                    ${cs.map(c=>`<option value="${c.id}" ${this._criaSel.a===c.id?'selected':''}>${c.sexo==='macho'?'♂':'♀'} ${c.nombre} (Nv.${c.nivel})</option>`).join('')}
                </select></div>
            <div><label class="muted">Padre 2:</label>
                <select onchange="UI._criaPick('b',this.value)">
                    <option value="">--</option>
                    ${cs.map(c=>`<option value="${c.id}" ${this._criaSel.b===c.id?'selected':''}>${c.sexo==='macho'?'♂':'♀'} ${c.nombre} (Nv.${c.nivel})</option>`).join('')}
                </select></div>
        </div>
        ${a?`<div class="cria-preview"><div class="cria-sprite">${Horse.visualHTML(a, 3, 'eat_right')}</div>${this.cardCaballo(a,false)}</div>`:''}
        ${b?`<div class="cria-preview"><div class="cria-sprite">${Horse.visualHTML(b, 3, 'eat_left')}</div>${this.cardCaballo(b,false)}</div>`:''}
        <div class="tarjeta text-center">
            <p class="mb-10">💰 Costo: <b>$${costo}</b></p>
            ${puede.ok ? `<button class="btn btn-purple" ${Game.jugador.dinero<costo?'disabled':''} onclick="UI.criar()">💕 Criar</button>` : `<p class="muted">${puede.motivo}</p>`}
        </div>`;
    },
    _criaPick(s, v) { this._criaSel[s] = v; this.renderCria(); },
    criar() {
        const a = Game.jugador.caballos.find(c=>c.id===this._criaSel.a);
        const b = Game.jugador.caballos.find(c=>c.id===this._criaSel.b);
        const p = Breeding.pueden(a,b);
        if (!p.ok) { this.toast(p.motivo,'error'); return; }
        const costo = Breeding.costo(a,b);
        if (!Game.cambiarDinero(-costo)) { this.toast('Sin dinero','error'); return; }
        const hijo = Breeding.cruzar(a,b);
        Game.jugador.caballos.push(hijo);
        Game.jugador.estadisticas.crias++;
        this._criaSel = { a:null, b:null };
        this.toast(`¡Nació ${hijo.nombre}! 💕`,'exito');
        this._postAccion(); this.renderCria();
    },

    /* ---------- LOGROS ---------- */
    renderLogros() {
        const cont = document.getElementById('lista-logros');
        const j = Game.jugador;
        cont.innerHTML = LOGROS.map(l => {
            const ok = !!j.logros[l.id];
            return `<div class="logro ${ok?'completado':'bloqueado'}">
                <div class="logro-icon">${l.emoji}</div>
                <div class="logro-info"><h4>${l.nombre} ${ok?'✓':''}</h4><p>${l.desc}</p></div>
                <div class="badge ${ok?'badge-sec':''}">+$${l.recompensa}</div>
            </div>`;
        }).join('');
    },

    _proximaRecompensaNivel(nivelActual) {
        const recomp = DATA.recompensasNivel || {};
        const keys = Object.keys(recomp).map(Number).sort((a,b)=>a-b);
        const next = keys.find(n => n > nivelActual);
        if (!next) return `Nv.${nivelActual+1}: +$${(200*(nivelActual+1)).toLocaleString()}`;
        const r = recomp[next];
        const parts = [];
        if (r.dinero) parts.push(`$${r.dinero.toLocaleString()}`);
        if (r.equipo && DATA.equipamiento && DATA.equipamiento[r.equipo]) parts.push(DATA.equipamiento[r.equipo].nombre);
        if (r.caballo) parts.push('nuevo caballo');
        return `Nv.${next} — ${parts.join(', ')}`;
    },

    /* ---------- STATS ---------- */
    renderStats() {
        const e = Game.jugador.estadisticas;
        const wr = e.carreras_jugadas ? Math.round(100*e.victorias/e.carreras_jugadas) : 0;
        const lo = Object.keys(Game.jugador.logros).length;
        const j = Game.jugador;
        const nivelJug = j.nivelJugador || 1;
        const xpMaxJug = Game.xpNivelJugador(nivelJug);
        const xpPctJug = Math.min(100, Math.round(((j.xpJugador||0) / xpMaxJug) * 100));
        document.getElementById('contenido-stats').innerHTML = `<div class="tarjeta">
            <h3>🌟 Nivel del Jugador</h3>
            <div style="display:flex;align-items:center;gap:10px;margin:10px 0">
                <span class="menu-nivel-badge" style="font-size:1em">Nv. ${nivelJug}</span>
                <div class="menu-xp-bar" style="flex:1;height:12px"><div class="menu-xp-fill" style="width:${xpPctJug}%"></div></div>
                <span class="muted">${j.xpJugador||0}/${xpMaxJug} XP</span>
            </div>
            <p class="muted" style="font-size:.8em">Siguiente recompensa: ${this._proximaRecompensaNivel(nivelJug)}</p>
        </div>
        <div class="tarjeta">
            <h3>📈 Resumen</h3>
            <p class="mt-10">🏁 Carreras: <b>${e.carreras_jugadas}</b></p>
            <p>🥇 Victorias: <b>${e.victorias}</b> (${wr}%)</p>
            <p>🏆 Podios: <b>${e.podios}</b></p>
            <p>💰 Total ganado: <b>$${e.dinero_total_ganado.toLocaleString()}</b></p>
            <p>🛒 Comprados: <b>${e.caballos_comprados}</b></p>
            <p>💕 Crías: <b>${e.crias||0}</b></p>
            <p>🐴 Establo: <b>${j.caballos.length}</b></p>
            <p>📅 Día: <b>${j.dia}</b> · 🔥 Mejor racha: <b>${j.rachaMax}</b></p>
            <p>🏅 Logros: <b>${lo}/${LOGROS.length}</b></p>
        </div>`;
    },

    /* ---------- HELPERS ---------- */
    toast(msg, tipo='info') {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.className = ''; t.classList.add('visible');
        if (tipo==='error') t.classList.add('error');
        if (tipo==='exito') t.classList.add('exito');
        clearTimeout(this._toTO);
        this._toTO = setTimeout(() => t.classList.remove('visible'), 2800);
    },
    /** Modal genérico. body puede ser string HTML. botones: [{texto, clase, onClick}] */
    modal(titulo, body, onConfirm, botones=null) {
        document.getElementById('modal-titulo').textContent = titulo;
        document.getElementById('modal-mensaje').innerHTML = body;
        const f = document.getElementById('modal-fondo');
        f.classList.add('visible');
        const btns = document.getElementById('modal-botones');
        if (botones) {
            btns.innerHTML = '';
            botones.forEach(b => {
                const e = document.createElement('button');
                e.className = 'btn ' + (b.clase||'');
                e.textContent = b.texto;
                e.onclick = () => { if (b.onClick) b.onClick(); this.cerrarModal(); };
                btns.appendChild(e);
            });
            const c = document.createElement('button');
            c.className = 'btn btn-sec'; c.textContent = 'Cerrar';
            c.onclick = () => this.cerrarModal();
            btns.appendChild(c);
        } else {
            btns.innerHTML = `<button class="btn btn-danger" id="m-conf">Confirmar</button>
                              <button class="btn btn-sec" onclick="UI.cerrarModal()">Cancelar</button>`;
            document.getElementById('m-conf').onclick = () => { onConfirm(); this.cerrarModal(); };
        }
    },
    cerrarModal() { document.getElementById('modal-fondo').classList.remove('visible'); },
    confirmarReinicio() {
        this.modal('Reiniciar partida', 'Se borrará todo tu progreso. ¿Continuar?', () => {
            Save.borrar();
            Game.nuevaPartida();
            Save.guardar();
            this.toast('Partida reiniciada','exito');
            this.show('pantalla-menu');
        });
    }
};
