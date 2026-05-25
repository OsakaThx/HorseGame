/* ============================================================
   game.js - Lógica del juego
   Módulos: Horse, Race, Breeding, Achiev, Game, Save
   ============================================================ */

/* ---------- HORSE: crear y manipular caballos ---------- */
const Horse = {
    crear(razaId, nombre, nivel = 1, sexo = null) {
        const raza = DATA.razas[razaId];
        if (!raza) throw new Error("Raza inválida: " + razaId);
        const stats = { ...raza.stats_base };
        for (let i = 2; i <= nivel; i++) {
            for (let s in stats) stats[s] = Math.min(CONFIG.MAX_STAT, stats[s] + 2 * (raza.crecimiento[s]||1));
        }
        for (let s in stats) stats[s] = Math.round(Math.max(CONFIG.MIN_STAT, stats[s] + (Math.random()*6 - 3)));
        const horse = {
            id: 'h_' + Date.now() + '_' + Math.floor(Math.random()*100000),
            nombre, raza: razaId, nivel,
            sexo: sexo || (Math.random()<0.5?'macho':'hembra'),
            stats,
            preferencias: this._generarPreferencias(razaId),
            condicion: 100, experiencia: 0,
            carreras_jugadas: 0, carreras_ganadas: 0, dinero_generado: 0,
            color: raza.color,
            valor_compra: Math.floor(raza.precio_base * (1 + (nivel-1)*0.4)),
            esIA: false, cooldownCria: 0, buff_admin: 0, imagen: null,
            spriteVariant: this._pickVariantForRaza(razaId),
            equipo: { montura: null, herradura: null, rienda: null }
        };
        horse.clase = this._determinarClase(horse);
        return horse;
    },
    _generarPreferencias(razaId) {
        const p = { terreno:{pasto:1,arena:1,tierra:1}, clima:{soleado:1,lluvioso:1,nublado:1} };
        const pref = DATA.razas[razaId].terreno_pref;
        if (pref && p.terreno[pref]!==undefined) p.terreno[pref] = 1.1;
        const ts = ['pasto','arena','tierra'];
        const pen = ts[Math.floor(Math.random()*3)];
        if (p.terreno[pen]===1) p.terreno[pen] = 0.95;
        return p;
    },
    subirNivel(c) {
        c.nivel++;
        const cr = DATA.razas[c.raza].crecimiento;
        for (let s in c.stats) {
            const a = 2 * (cr[s]||1) * (0.8 + Math.random()*0.4);
            c.stats[s] = Math.min(CONFIG.MAX_STAT, Math.round(c.stats[s] + a));
        }
        c.condicion = 100;
    },
    añadirXP(c, xp) {
        c.experiencia += xp;
        let n = 0;
        while (c.experiencia >= this.xpRequerida(c.nivel)) {
            c.experiencia -= this.xpRequerida(c.nivel);
            this.subirNivel(c); n++;
        }
        return n;
    },
    xpRequerida(nivel) { return Math.floor(CONFIG.XP_BASE_NIVEL * Math.pow(CONFIG.XP_FACTOR_NIVEL, nivel-1)); },
    entrenar(c, tipoId) {
        const e = DATA.entrenamientos[tipoId]; if (!e) return false;
        for (let s in e.mejora) c.stats[s] = Math.min(CONFIG.MAX_STAT, Math.max(CONFIG.MIN_STAT, (c.stats[s]||0) + e.mejora[s]));
        c.condicion = Math.max(0, c.condicion - CONFIG.FATIGA_POR_ENTRENAMIENTO);
        c.clase = this._determinarClase(c);
        return true;
    },
    aplicarItem(c, itemId) {
        const it = DATA.items[itemId]; if (!it) return false;
        if (it.efecto_tipo === 'condicion') c.condicion = Math.min(100, c.condicion + it.valor);
        else if (it.efecto_tipo === 'xp') this.añadirXP(c, it.valor);
        else if (it.efecto_tipo === 'stats_all') {
            for (let s in c.stats) c.stats[s] = Math.min(CONFIG.MAX_STAT, c.stats[s] + it.valor);
        }
        return true;
    },
    crearIA(nivelCarrera) {
        const razas = Object.keys(DATA.razas);
        const razaId = razas[Math.floor(Math.random() * razas.length)];
        const c = this.crear(razaId, 'IA_' + Math.random().toString(36).substr(2, 5), nivelCarrera);
        c.esIA = true;
        c.condicion = 85 + Math.floor(Math.random()*16);
        // Bonus dificultad: +0..+8 a stats clave para que las carreras sean retadoras
        const bonus = Math.floor(nivelCarrera * 1.5 + Math.random() * 6);
        for (const s in c.stats) {
            c.stats[s] = Math.min(CONFIG.MAX_STAT, c.stats[s] + bonus + Math.floor(Math.random()*4));
        }
        c.clase = this._determinarClase(c);
        return c;
    },
    /** Elige variante de sprite según la raza (consistencia visual) */
    _determinarClase(c) {
        const s = c.stats;
        const avg = (s.velocidad + s.velocidadPunta + s.estamina + s.salto + s.aceleracion) / 5;
        const scores = {
            velocista: (s.velocidad * 1.5 + s.velocidadPunta * 1.3 + s.aceleracion * 1.2) / 4,
            resistente: (s.estamina * 2 + s.velocidad * 0.8) / 3,
            saltador: (s.salto * 2 + s.velocidadPunta * 1.2 + s.aceleracion) / 4,
            equilibrado: (s.velocidad + s.velocidadPunta + s.estamina + s.salto + s.aceleracion) / 5,
            acelerador: (s.aceleracion * 2 + s.velocidad * 1.3) / 3
        };
        
        let bestClass = 'equilibrado';
        let bestScore = scores.equilibrado;
        
        for (const [cls, score] of Object.entries(scores)) {
            if (score > bestScore * 1.15) {
                bestClass = cls;
                bestScore = score;
            }
        }
        
        const clases = {
            velocista: { nombre: 'Velocista', emoji: '⚡', color: '#e74c3c' },
            resistente: { nombre: 'Resistente', emoji: '💪', color: '#27ae60' },
            saltador: { nombre: 'Saltador', emoji: '🦘', color: '#9b59b6' },
            equilibrado: { nombre: 'Equilibrado', emoji: '⚖️', color: '#3498db' },
            acelerador: { nombre: 'Acelerador', emoji: '🚀', color: '#f39c12' }
        };
        
        return { id: bestClass, ...clases[bestClass] };
    },
    
    _pickVariantForRaza(razaId) {
        if (typeof Sprites === 'undefined') return null;
        // Mapeo raza -> variantes preferidas
        const mapa = {
            cuarto_milla: ['fullcolor_brown_brown','fullcolor_brown_black'],
            pura_sangre:  ['fullcolor_black_brown','fullcolor_black_black','paint_black_brown'],
            arabe:        ['fullcolor_white_brown','fullcolor_white_black','paint_beige_brown'],
            mustang:      ['paint_brown_brown','paint_brown_black','socks_brown_brown'],
            apaloosa:     ['paint_black_brown','paint_beige_brown','socks_beige_brown']
        };
        const lista = mapa[razaId] || Object.keys(Sprites.VARIANTS);
        return lista[Math.floor(Math.random() * lista.length)];
    },
    /** Devuelve HTML para mostrar el caballo. Usa sprites animados si están disponibles.
     *  anim = animación contextual: 'idle_right' (default), 'gallop_right', 'eat_right', etc. */
    visualHTML(c, scale = 1, anim = 'idle_right') {
        // Imagen subida por admin (override total)
        const imgOverride = c.imagen || (DATA.razas[c.raza] && DATA.razas[c.raza].imagen);
        if (imgOverride) return `<img src="${imgOverride}" style="width:${scale*38}px;height:${scale*38}px;object-fit:contain" alt="">`;
        // Sprite animado
        if (typeof Sprites !== 'undefined' && c.spriteVariant) {
            return Sprites.htmlFor(c.spriteVariant, anim, Math.round(scale * 48));
        }
        // Fallback: emoji
        return `<span style="font-size:${scale*1.6}em">${(DATA.razas[c.raza]||{}).emoji||'🐴'}</span>`;
    }
};


/* ---------- RACE: simulación realista por fases ---------- */
/* Modelo:
   Cada caballo recorre la distancia tick a tick. Su velocidad por tick depende de:
     - velocidad/velocidadPunta/aceleracion: empuje hacia adelante
     - estamina: cuanto puede sostener el ritmo. Si se queda sin gas, baja a 30-50% de su velocidad
     - salto: solo cuenta si la carrera es de obstáculos (penaliza salto bajo)
     - terreno/clima: ya manejado por preferencias
   La carrera tiene 3 fases:
     0-25%   ARRANCADA: domina aceleracion (explosivos despegan)
     25-75%  CRUCERO: domina velocidad
     75-100% FINAL: domina velocidadPunta + estamina restante
   Cada caballo "consume" estamina cada tick. Cuando llega a 0 está exhausto y va lento.
*/
const Race = {
    /** Estima rendimiento total para ordenar (no corre la simulación) */
    calcularRendimiento(c, ca) {
        // Suma ponderada de stats segun la carrera
        let p = 0;
        for (const s in ca.stat_weights) p += (c.stats[s]||0) * ca.stat_weights[s];
        const mt = (c.preferencias.terreno && c.preferencias.terreno[ca.terreno]) || 1;
        const mc = (c.preferencias.clima && c.preferencias.clima[ca.clima]) || 1;
        p *= mt * mc;
        p *= Math.max(0.1, c.condicion/100);
        if (c.buff_admin) p *= (1 + c.buff_admin/100);
        return Math.max(1, p);
    },

    /** Simula la carrera tick por tick. Devuelve { ranking, telemetria }
     *  ranking: array ordenado por posición final con datos completos
     *  telemetria: array de snapshots por tick (para animar)
     */
    simular(participantes, ca) {
        const TICKS = 200;            // resolución de la simulación
        const dist = ca.distancia;
        const esObstaculos = ca.tipo === 'obstaculos' || (ca.stat_weights && ca.stat_weights.salto >= 0.3);

        // Aplicar bonificaciones de equipamiento a stats efectivos
        const aplicarEquipo = (c) => {
            const stats = { ...c.stats };
            if (c.equipo && typeof EQUIPO !== 'undefined') {
                for (const slot in c.equipo) {
                    const item = (DATA.equipamiento && DATA.equipamiento[c.equipo[slot]]);
                    if (item && item.bonus) {
                        for (const s in item.bonus) {
                            stats[s] = Math.min(CONFIG.MAX_STAT + 30, (stats[s]||0) + item.bonus[s]);
                        }
                    }
                }
            }
            return stats;
        };

        // Crear "competidor" interno por caballo
        const corredores = participantes.map(c => {
            const eStats = aplicarEquipo(c);
            // Modificadores por preferencias y condición
            const mTer = (c.preferencias.terreno && c.preferencias.terreno[ca.terreno]) || 1;
            const mClima = (c.preferencias.clima && c.preferencias.clima[ca.clima]) || 1;
            const mCond = Math.max(0.4, c.condicion / 100);
            const mBuff = c.buff_admin ? (1 + c.buff_admin/100) : 1;
            const mGlobal = mTer * mClima * mCond * mBuff;
            // Ruido fijo por carrera (algunos días el caballo simplemente corre mejor)
            const suerte = 0.92 + Math.random() * 0.16;
            return {
                c,
                pos: 0,                                // metros recorridos
                stamina: eStats.estamina * (0.85 + Math.random()*0.3) * mCond,
                staminaMax: eStats.estamina * mCond,
                cansado: false,
                mGlobal: mGlobal * suerte,
                stats: eStats,
                tropezones: 0,
            };
        });

        const telemetria = [];

        // DRENAJE DE ESTAMINA: ahora depende fuertemente de la distancia.
        // Una carrera de 50m apenas drena (los velocistas ganan).
        // Una carrera de 400m drena masivamente (los resistentes ganan).
        // Factor: 0.04 a 0.18 según distancia. Antes era constante 0.12.
        const factorDist = Math.min(1.0, dist / 400);   // 50m->0.125  150m->0.375  400m->1.0
        const drenajeBase = 0.04 + factorDist * 0.16;   // 0.04 .. 0.20 por tick

        for (let t = 0; t < TICKS; t++) {
            const progresoCarrera = t / TICKS;        // 0..1
            // Pesos de stats por fase
            let wAcc, wVel, wPunta;
            if (progresoCarrera < 0.25) {              // ARRANCADA
                wAcc = 0.55; wVel = 0.35; wPunta = 0.10;
            } else if (progresoCarrera < 0.75) {       // CRUCERO
                wAcc = 0.15; wVel = 0.65; wPunta = 0.20;
            } else {                                   // FINAL
                wAcc = 0.10; wVel = 0.30; wPunta = 0.60;
            }
            for (const cor of corredores) {
                if (cor.pos >= dist) continue;
                // Velocidad base
                let v = cor.stats.velocidad     * wVel
                      + cor.stats.velocidadPunta * wPunta
                      + cor.stats.aceleracion   * wAcc;
                // ESCALADO DE FATIGA: cuanto menos stamina, más penalización
                const staminaPct = cor.stamina / Math.max(1, cor.staminaMax);
                if (cor.cansado) {
                    // Exhausto total: 25-40% del rendimiento
                    v *= 0.25 + Math.random() * 0.15;
                } else if (staminaPct < 0.20) {
                    // Muy cansado: 50-65%
                    v *= 0.5 + staminaPct;
                } else if (staminaPct < 0.40) {
                    // Empieza a sufrir: 75-90%
                    v *= 0.75 + staminaPct * 0.4;
                }
                v *= cor.mGlobal;
                v *= 0.92 + Math.random() * 0.16;
                // Obstáculos: chance de tropezar (mayor si tiene salto bajo)
                if (esObstaculos) {
                    const numObstaculos = Math.floor(dist / 50);
                    const chanceTickConObstaculo = numObstaculos / TICKS;
                    if (Math.random() < chanceTickConObstaculo) {
                        const chanceFallo = Math.max(0.05, (80 - cor.stats.salto) / 100);
                        if (Math.random() < chanceFallo) {
                            v *= 0.35; // tropezó fuerte
                            cor.tropezones++;
                            cor.stamina -= 3; // tropezarse cansa
                        }
                    }
                }
                const avance = (v / 100) * (dist / TICKS) * 1.4;
                cor.pos = Math.min(dist, cor.pos + avance);
                // Drenar stamina: empujar duro (vel/punta alta) cuesta más
                // Caballos con muchos stats de velocidad gastan más combustible
                const intensidadFase = (wAcc * 1.2 + wVel + wPunta * 1.4);
                const intensidadStats = (cor.stats.velocidad + cor.stats.velocidadPunta + cor.stats.aceleracion) / 200;
                cor.stamina -= drenajeBase * intensidadFase * (0.7 + intensidadStats);
                if (cor.stamina <= 0 && !cor.cansado) {
                    cor.cansado = true;
                    cor.staminaAgotadaEn = progresoCarrera;
                }
            }
            telemetria.push(corredores.map(cor => ({
                id: cor.c.id,
                progreso: cor.pos / dist,
                cansado: cor.cansado,
                staminaPct: Math.max(0, cor.stamina / Math.max(1, cor.staminaMax))
            })));
        }

        // Ranking final: ordenar por posición final (todos llegaron a meta o se cansaron)
        // Si dos terminaron, gana el que llegó primero (su pos llegó a `dist` en menos ticks)
        // Calcular tick en que cada uno cruzó meta
        for (const cor of corredores) {
            cor.tickMeta = TICKS;
            for (let t = 0; t < telemetria.length; t++) {
                const snap = telemetria[t].find(s => s.id === cor.c.id);
                if (snap && snap.progreso >= 1) { cor.tickMeta = t; break; }
            }
        }
        const ranking = corredores
            .map(cor => ({
                caballo: cor.c,
                rendimiento: cor.pos,
                cansado: cor.cansado,
                tropezones: cor.tropezones,
                tickMeta: cor.tickMeta,
                tiempo: +(cor.tickMeta / TICKS * (dist / 50) * 8).toFixed(2)  // tiempo derivado
            }))
            .sort((a, b) => {
                if (a.tickMeta !== b.tickMeta) return a.tickMeta - b.tickMeta;
                return b.rendimiento - a.rendimiento;
            });
        ranking.forEach((x, i) => { x.posicion = i + 1; x.premio = ca.premios[i] || 0; });
        return { ranking, telemetria };
    }
};


/* ---------- BREEDING: cría de caballos ---------- */
const Breeding = {
    pueden(a, b) {
        if (!a || !b || a.id===b.id) return { ok:false, motivo:'Selecciona 2 caballos diferentes' };
        if (a.sexo === b.sexo) return { ok:false, motivo:'Necesitas un macho ♂ y una hembra ♀' };
        if (a.cooldownCria>0 || b.cooldownCria>0) return { ok:false, motivo:'Algún caballo está en cooldown' };
        if (a.condicion<50 || b.condicion<50) return { ok:false, motivo:'Ambos necesitan condición ≥50%' };
        return { ok:true };
    },
    costo(a, b) { return Math.floor(CONFIG.COSTO_CRIA + (a.nivel + b.nivel) * 100); },
    cruzar(a, b) {
        const padre = a.sexo==='macho' ? a : b;
        const madre = a.sexo==='hembra' ? a : b;
        const razaHija = Math.random()<0.5 ? padre.raza : madre.raza;
        const nombre = CONFIG.NOMBRES_IA[Math.floor(Math.random()*CONFIG.NOMBRES_IA.length)] + ' Jr.';
        const hijo = Horse.crear(razaHija, nombre, 1);
        // Heredar parte de stats de padres
        for (let s in hijo.stats) {
            const prom = ((padre.stats[s]||0) + (madre.stats[s]||0)) / 2;
            hijo.stats[s] = Math.min(CONFIG.MAX_STAT, Math.round(hijo.stats[s] + prom * 0.3));
        }
        a.cooldownCria = CONFIG.COOLDOWN_CRIA_DIAS;
        b.cooldownCria = CONFIG.COOLDOWN_CRIA_DIAS;
        a.condicion = Math.max(0, a.condicion - 30);
        b.condicion = Math.max(0, b.condicion - 30);
        return hijo;
    }
};


/* ---------- ACHIEV: logros ---------- */
const Achiev = {
    revisar() {
        const j = Game.jugador;
        const nuevos = [];
        for (const l of LOGROS) {
            if (!j.logros[l.id] && l.check(j)) {
                j.logros[l.id] = true;
                Game.cambiarDinero(l.recompensa);
                nuevos.push(l);
            }
        }
        return nuevos;
    }
};


/* ---------- GAME: estado del jugador ---------- */
const Game = {
    jugador: null,
    nuevaPartida() {
        this.jugador = {
            dinero: CONFIG.DINERO_INICIAL,
            caballos: [], caballoSeleccionadoId: null,
            estadisticas: {
                carreras_jugadas:0, victorias:0, podios:0,
                dinero_total_ganado:0, caballos_comprados:0, crias:0,
                victorias_por_tipo:{}
            },
            tiendaCaballos: [], logros: {},
            dia:1, ultimoLogin:0, racha:0, rachaMax:0,
            inventarioEquipo: [],
            nivelJugador: 1, xpJugador: 0
        };
        const i = Horse.crear('cuarto_milla','Starter',1);
        this.jugador.caballos.push(i);
        this.jugador.caballoSeleccionadoId = i.id;
        this.regenerarTiendaCaballos();
    },
    getCaballoSeleccionado() {
        return this.jugador.caballos.find(c => c.id===this.jugador.caballoSeleccionadoId) || this.jugador.caballos[0];
    },
    getNivelJugador() {
        return this.jugador.caballos.length ? Math.max(...this.jugador.caballos.map(c=>c.nivel)) : 1;
    },
    regenerarTiendaCaballos() {
        this.jugador.tiendaCaballos = [];
        const ids = Object.keys(DATA.razas);
        if (!ids.length) return;
        const nb = Math.max(1, this.getNivelJugador()-1);
        for (let i=0; i<4; i++) {
            const raza = ids[Math.floor(Math.random()*ids.length)];
            const nivel = nb + Math.floor(Math.random()*3);
            const nombre = CONFIG.NOMBRES_IA[Math.floor(Math.random()*CONFIG.NOMBRES_IA.length)];
            this.jugador.tiendaCaballos.push(Horse.crear(raza, nombre, nivel));
        }
    },
    cambiarDinero(c) {
        if (this.jugador.dinero + c < 0) return false;
        this.jugador.dinero += c;
        if (c>0) this.jugador.estadisticas.dinero_total_ganado += c;
        return true;
    },
    avanzarDia() {
        this.jugador.dia++;
        this.jugador.caballos.forEach(c => { if (c.cooldownCria>0) c.cooldownCria--; });
    },
    /** Devuelve {disponible, monto, racha} */
    recompensaDiaria() {
        const ahora = Date.now();
        const hoy = new Date(ahora); hoy.setHours(0,0,0,0);
        const ult = new Date(this.jugador.ultimoLogin || 0); ult.setHours(0,0,0,0);
        const diff = Math.floor((hoy - ult) / 86400000);
        if (diff === 0 && this.jugador.ultimoLogin) return { disponible:false, monto:0, racha:this.jugador.racha };
        const nuevaRacha = (diff === 1) ? this.jugador.racha + 1 : 1;
        const mult = Math.min(nuevaRacha, CONFIG.RECOMPENSA_DIARIA_RACHA_MAX);
        return { disponible:true, monto: CONFIG.RECOMPENSA_DIARIA_BASE * mult, racha: nuevaRacha };
    },
    cobrarRecompensaDiaria() {
        const r = this.recompensaDiaria();
        if (!r.disponible) return null;
        this.cambiarDinero(r.monto);
        this.jugador.racha = r.racha;
        this.jugador.rachaMax = Math.max(this.jugador.rachaMax, r.racha);
        this.jugador.ultimoLogin = Date.now();
        this.avanzarDia();
        return r;
    },

    /* ---------- SISTEMA DE NIVEL DE JUGADOR ---------- */
    xpNivelJugador(n) {
        return Math.floor(300 * n * Math.pow(1.35, n - 1));
    },
    /** Agrega XP al jugador. Retorna array de objetos {nivel, recompensa} por cada subida. */
    añadirXPJugador(xp) {
        if (!this.jugador.nivelJugador) this.jugador.nivelJugador = 1;
        if (this.jugador.xpJugador === undefined) this.jugador.xpJugador = 0;
        this.jugador.xpJugador += xp;
        const subidas = [];
        while (this.jugador.xpJugador >= this.xpNivelJugador(this.jugador.nivelJugador)) {
            this.jugador.xpJugador -= this.xpNivelJugador(this.jugador.nivelJugador);
            this.jugador.nivelJugador++;
            const r = this._aplicarRecompensaNivel(this.jugador.nivelJugador);
            subidas.push({ nivel: this.jugador.nivelJugador, recompensa: r });
        }
        return subidas;
    },
    _aplicarRecompensaNivel(n) {
        const especial = (DATA.recompensasNivel || {})[n];
        const r = especial ? { ...especial }
                           : { dinero: Math.floor(200 * n), mensaje: `¡Nivel ${n} alcanzado!` };
        if (r.dinero) this.cambiarDinero(r.dinero);
        if (r.equipo && DATA.equipamiento && DATA.equipamiento[r.equipo]) {
            if (!this.jugador.inventarioEquipo) this.jugador.inventarioEquipo = [];
            this.jugador.inventarioEquipo.push(r.equipo);
        }
        if (r.caballo) {
            const c = Horse.crear(r.caballo.raza || 'cuarto_milla', r.caballo.nombre || 'Premio', r.caballo.nivel || n);
            this.jugador.caballos.push(c);
            r.caballoNombre = c.nombre;
        }
        return r;
    }
};


/* ---------- SAVE: persistencia ---------- */
const Save = {
    guardar() {
        try {
            const payload = { jugador: Game.jugador, data: DATA, ts: Date.now(), version: 3 };
            localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(payload));
            if (typeof Api !== 'undefined' && Api.isLoggedIn()) {
                Api.save(payload).catch(e => console.warn('[Save] No se pudo guardar en servidor:', e.message));
            }
            return true;
        } catch(e) { console.error(e); return false; }
    },
    aplicar(d) {
        Game.jugador = d.jugador;
        if (d.data) DATA = d.data;
        this.migrar();
    },
    cargar() {
        try {
            const raw = localStorage.getItem(CONFIG.SAVE_KEY);
            if (!raw) return false;
            const d = JSON.parse(raw);
            this.aplicar(d);
            return true;
        } catch(e) { console.error(e); return false; }
    },
    migrar() {
        const j = Game.jugador;
        if (!j) return;
        if (!j.tiendaCaballos) Game.regenerarTiendaCaballos();
        if (!j.logros) j.logros = {};
        if (!j.estadisticas) j.estadisticas = { carreras_jugadas:0, victorias:0, podios:0, dinero_total_ganado:0, caballos_comprados:0, crias:0, victorias_por_tipo:{} };
        if (!j.estadisticas.victorias_por_tipo) j.estadisticas.victorias_por_tipo = {};
        if (j.dia===undefined) j.dia=1;
        if (j.racha===undefined) j.racha=0;
        if (j.rachaMax===undefined) j.rachaMax=0;
        if (!j.inventarioEquipo) j.inventarioEquipo = [];
        if (!j.nivelJugador) j.nivelJugador = 1;
        if (j.xpJugador === undefined) j.xpJugador = 0;
        if (!DATA.equipamiento) DATA.equipamiento = {};
        if (!DATA.recompensasNivel) DATA.recompensasNivel = {};
        (j.caballos||[]).forEach(c => {
            if (c.cooldownCria===undefined) c.cooldownCria=0;
            if (c.buff_admin===undefined) c.buff_admin=0;
            if (!c.sexo) c.sexo = Math.random()<0.5?'macho':'hembra';
            if (!c.spriteVariant) c.spriteVariant = Horse._pickVariantForRaza(c.raza);
            if (!c.clase) c.clase = Horse._determinarClase(c);
            if (!c.equipo) c.equipo = { montura: null, herradura: null, rienda: null };
        });
        (j.tiendaCaballos||[]).forEach(c => {
            if (!c.spriteVariant) c.spriteVariant = Horse._pickVariantForRaza(c.raza);
            if (!c.clase) c.clase = Horse._determinarClase(c);
        });
    },
    borrar() { localStorage.removeItem(CONFIG.SAVE_KEY); },
    exportar() { return JSON.stringify({ jugador:Game.jugador, data:DATA, ts:Date.now() }, null, 2); },
    importar(str) {
        const d = JSON.parse(str);
        if (!d.jugador) throw new Error('Formato inválido');
        Game.jugador = d.jugador;
        if (d.data) DATA = d.data;
        this.guardar();
    },
    resetData() { DATA = JSON.parse(JSON.stringify(DEFAULT_DATA)); this.guardar(); }
};
