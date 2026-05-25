/* ============================================================
   admin.js - Panel de administración (CRUD completo)
   Tabs: razas, carreras, caballos (jugador), entrenamientos,
         items, economía/cheats, datos (export/import/reset)
   ============================================================ */
const Admin = {
    tab: 'razas',

    render() {
        document.querySelectorAll('#admin-tabs .tab').forEach(b => {
            b.classList.toggle('activa', b.dataset.tab === this.tab);
            b.onclick = () => { this.tab = b.dataset.tab; this.render(); };
        });
        const cont = document.getElementById('admin-contenido');
        const map = {
            razas:          () => this.renderRazas(),
            carreras:       () => this.renderCarreras(),
            caballos:       () => this.renderCaballos(),
            equipamiento:   () => this.renderEquipamiento(),
            skins:          () => this.renderSkins(),
            entrenamientos: () => this.renderEntrenamientos(),
            items:          () => this.renderItems(),
            economia:       () => this.renderEconomia(),
            datos:          () => this.renderDatos()
        };
        cont.innerHTML = '';
        if (map[this.tab]) map[this.tab]();
    },

    _save() { if (CONFIG.AUTOGUARDADO) Save.guardar(); },

    /* ====== RAZAS ====== */
    renderRazas() {
        const cont = document.getElementById('admin-contenido');
        const lista = Object.entries(DATA.razas).map(([id, r]) => `
            <div class="tarjeta">
                <div class="tarjeta-titulo">
                    <h3><span class="horse-avatar">${r.imagen?`<img src="${r.imagen}">`:r.emoji}</span> ${r.nombre}</h3>
                    <span class="badge">$${r.precio_base}</span>
                </div>
                <p class="muted">${r.descripcion}</p>
                <p class="muted">ID: <code>${id}</code> · Pref. terreno: ${r.terreno_pref||'—'}</p>
                <p class="muted">Stats: ${Object.entries(r.stats_base).map(([k,v])=>`${k}:${v}`).join(' ')}</p>
                <div class="flex-row mt-10">
                    <button class="btn btn-sec" onclick="Admin.editarRaza('${id}')">✏️ Editar</button>
                    <button class="btn btn-danger" onclick="Admin.borrarRaza('${id}')">🗑️ Borrar</button>
                </div>
            </div>`).join('');
        cont.innerHTML = `<button class="btn mb-10" onclick="Admin.editarRaza()">➕ Nueva raza</button>` + lista;
    },
    editarRaza(id = null) {
        const r = id ? { ...DATA.razas[id] } : {
            nombre:'', descripcion:'', emoji:'🐴', color:'#8B4513', imagen:null,
            stats_base:{velocidad:50,velocidadPunta:50,estamina:50,salto:50,aceleracion:50},
            crecimiento:{velocidad:1,velocidadPunta:1,estamina:1,salto:1,aceleracion:1},
            precio_base:1500, terreno_pref:'pasto'
        };
        const nuevoId = id || ('raza_' + Date.now());
        const stats = ['velocidad','velocidadPunta','estamina','salto','aceleracion'];
        UI.modal(id?'Editar raza':'Nueva raza', `
            <div class="form-grupo"><label>Nombre</label><input id="ra-n" value="${r.nombre}"></div>
            <div class="form-grupo"><label>Descripción</label><textarea id="ra-d">${r.descripcion}</textarea></div>
            <div class="grid-2">
                <div class="form-grupo"><label>Emoji (si no hay imagen)</label><input id="ra-e" value="${r.emoji}"></div>
                <div class="form-grupo"><label>Color</label><input type="color" id="ra-c" value="${r.color}"></div>
            </div>
            <div class="form-grupo">
                <label>Imagen del caballo (opcional, sobreescribe emoji)</label>
                <input type="file" id="ra-img" accept="image/*">
                <div id="ra-prev" class="mt-10">${r.imagen?`<img src="${r.imagen}" style="max-width:80px;max-height:80px;border-radius:8px">`:''}</div>
                <p class="ayuda">PNG/JPG. Se guarda como base64 en localStorage.</p>
            </div>
            <h4 class="mt-10 mb-10">Stats base (1-100)</h4>
            <div class="grid-2">
                ${stats.map(s=>`<div class="form-grupo"><label>${s}</label><input type="number" min="1" max="100" id="ra-s-${s}" value="${r.stats_base[s]||50}"></div>`).join('')}
            </div>
            <h4 class="mt-10 mb-10">Crecimiento por nivel (multiplicador)</h4>
            <div class="grid-2">
                ${stats.map(s=>`<div class="form-grupo"><label>${s}</label><input type="number" step="0.1" min="0" max="3" id="ra-g-${s}" value="${r.crecimiento[s]||1}"></div>`).join('')}
            </div>
            <div class="grid-2">
                <div class="form-grupo"><label>Precio base</label><input type="number" id="ra-p" value="${r.precio_base}"></div>
                <div class="form-grupo"><label>Terreno preferido</label><select id="ra-t">
                    ${['pasto','arena','tierra'].map(t=>`<option ${r.terreno_pref===t?'selected':''}>${t}</option>`).join('')}
                </select></div>
            </div>
        `, null, [
            { texto: id?'💾 Guardar':'➕ Crear', clase:'btn-success', onClick: () => {
                const nueva = {
                    nombre: document.getElementById('ra-n').value || 'Sin nombre',
                    descripcion: document.getElementById('ra-d').value,
                    emoji: document.getElementById('ra-e').value || '🐴',
                    color: document.getElementById('ra-c').value,
                    imagen: r.imagen,
                    stats_base: {}, crecimiento: {},
                    precio_base: parseInt(document.getElementById('ra-p').value)||1500,
                    terreno_pref: document.getElementById('ra-t').value
                };
                stats.forEach(s => {
                    nueva.stats_base[s] = parseInt(document.getElementById('ra-s-'+s).value)||50;
                    nueva.crecimiento[s] = parseFloat(document.getElementById('ra-g-'+s).value)||1;
                });
                DATA.razas[nuevoId] = nueva;
                this._save(); UI.toast('Raza guardada','exito'); this.render();
            }}
        ]);
        // Listener imagen
        setTimeout(() => {
            const inp = document.getElementById('ra-img');
            if (inp) inp.onchange = (e) => {
                const f = e.target.files[0]; if (!f) return;
                const reader = new FileReader();
                reader.onload = ev => {
                    r.imagen = ev.target.result;
                    document.getElementById('ra-prev').innerHTML = `<img src="${r.imagen}" style="max-width:80px;max-height:80px;border-radius:8px">`;
                };
                reader.readAsDataURL(f);
            };
        }, 50);
    },
    borrarRaza(id) {
        if (Object.keys(DATA.razas).length<=1) { UI.toast('Debe quedar al menos 1 raza','error'); return; }
        UI.modal('Borrar raza', `¿Eliminar la raza <b>${DATA.razas[id].nombre}</b>?`, () => {
            delete DATA.razas[id];
            this._save(); UI.toast('Raza eliminada','exito'); this.render();
        });
    },

    /* ====== CARRERAS ====== */
    renderCarreras() {
        const cont = document.getElementById('admin-contenido');
        const lista = DATA.carreras.map((c, i) => `
            <div class="tarjeta">
                <div class="tarjeta-titulo">
                    <h3>${c.emoji} ${c.nombre}</h3>
                    <span class="badge">Nv.${c.nivel_minimo}+</span>
                </div>
                <p class="muted">${c.distancia}m · ${c.terreno} · ${c.clima} · $${c.costo_inscripcion}</p>
                <p class="muted">Premios: $${c.premios.join(' / $')}</p>
                <p class="muted">Pesos: ${Object.entries(c.stat_weights).map(([k,v])=>`${k}:${v}`).join(' ')}</p>
                <div class="flex-row mt-10">
                    <button class="btn btn-sec" onclick="Admin.editarCarrera(${i})">✏️ Editar</button>
                    <button class="btn btn-danger" onclick="Admin.borrarCarrera(${i})">🗑️ Borrar</button>
                </div>
            </div>`).join('');
        cont.innerHTML = `<button class="btn mb-10" onclick="Admin.editarCarrera(-1)">➕ Nueva carrera</button>` + lista;
    },
    editarCarrera(idx) {
        const nueva = idx === -1;
        const c = nueva ? {
            id:'carrera_'+Date.now(), nombre:'', emoji:'🏁', distancia:100, tipo:'recta',
            terreno:'pasto', clima:'soleado', nivel_minimo:1, costo_inscripcion:100,
            premios:[1000,600,300,100,0,0], num_competidores:5, nivel_ia:1,
            stat_weights:{velocidad:0.5,velocidadPunta:0.3,aceleracion:0.2}
        } : { ...DATA.carreras[idx], stat_weights:{...DATA.carreras[idx].stat_weights}, premios:[...DATA.carreras[idx].premios] };
        const stats = ['velocidad','velocidadPunta','estamina','salto','aceleracion'];
        UI.modal(nueva?'Nueva carrera':'Editar carrera', `
            <div class="grid-2">
                <div class="form-grupo"><label>Nombre</label><input id="ca-n" value="${c.nombre}"></div>
                <div class="form-grupo"><label>Emoji</label><input id="ca-e" value="${c.emoji}"></div>
            </div>
            <div class="grid-2">
                <div class="form-grupo"><label>Distancia (m)</label><input type="number" id="ca-d" value="${c.distancia}"></div>
                <div class="form-grupo"><label>Tipo</label><select id="ca-tp">
                    ${['recta','curvas','obstaculos'].map(t=>`<option ${c.tipo===t?'selected':''}>${t}</option>`).join('')}
                </select></div>
            </div>
            <div class="grid-2">
                <div class="form-grupo"><label>Terreno</label><select id="ca-te">
                    ${['pasto','arena','tierra'].map(t=>`<option ${c.terreno===t?'selected':''}>${t}</option>`).join('')}
                </select></div>
                <div class="form-grupo"><label>Clima</label><select id="ca-cl">
                    ${['soleado','lluvioso','nublado'].map(t=>`<option ${c.clima===t?'selected':''}>${t}</option>`).join('')}
                </select></div>
            </div>
            <div class="grid-3">
                <div class="form-grupo"><label>Nivel mín.</label><input type="number" id="ca-nm" value="${c.nivel_minimo}"></div>
                <div class="form-grupo"><label>Costo</label><input type="number" id="ca-co" value="${c.costo_inscripcion}"></div>
                <div class="form-grupo"><label>Nivel IA</label><input type="number" id="ca-ia" value="${c.nivel_ia}"></div>
            </div>
            <div class="form-grupo"><label>Nº competidores IA</label><input type="number" id="ca-nc" value="${c.num_competidores}"></div>
            <h4 class="mt-10 mb-10">Premios (1º a 6º)</h4>
            <div class="grid-3">
                ${[0,1,2,3,4,5].map(i=>`<div class="form-grupo"><label>${i+1}º</label><input type="number" id="ca-p-${i}" value="${c.premios[i]||0}"></div>`).join('')}
            </div>
            <h4 class="mt-10 mb-10">Pesos de stats (deben sumar 1.0)</h4>
            <div class="grid-2">
                ${stats.map(s=>`<div class="form-grupo"><label>${s}</label><input type="number" step="0.05" min="0" max="1" id="ca-w-${s}" value="${c.stat_weights[s]||0}"></div>`).join('')}
            </div>
        `, null, [
            { texto: nueva?'➕ Crear':'💾 Guardar', clase:'btn-success', onClick: () => {
                const w = {};
                stats.forEach(s => { const v = parseFloat(document.getElementById('ca-w-'+s).value)||0; if (v>0) w[s]=v; });
                const total = Object.values(w).reduce((a,b)=>a+b,0);
                if (Math.abs(total-1) > 0.05) { UI.toast(`Pesos suman ${total.toFixed(2)}, deberían sumar 1.0`,'error'); return; }
                const obj = {
                    id: c.id || 'carrera_'+Date.now(),
                    nombre: document.getElementById('ca-n').value || 'Sin nombre',
                    emoji: document.getElementById('ca-e').value || '🏁',
                    distancia: parseInt(document.getElementById('ca-d').value)||100,
                    tipo: document.getElementById('ca-tp').value,
                    terreno: document.getElementById('ca-te').value,
                    clima: document.getElementById('ca-cl').value,
                    nivel_minimo: parseInt(document.getElementById('ca-nm').value)||1,
                    costo_inscripcion: parseInt(document.getElementById('ca-co').value)||50,
                    nivel_ia: parseInt(document.getElementById('ca-ia').value)||1,
                    num_competidores: parseInt(document.getElementById('ca-nc').value)||5,
                    premios: [0,1,2,3,4,5].map(i=>parseInt(document.getElementById('ca-p-'+i).value)||0),
                    stat_weights: w
                };
                if (nueva) DATA.carreras.push(obj);
                else DATA.carreras[idx] = obj;
                this._save(); UI.toast('Carrera guardada','exito'); this.render();
            }}
        ]);
    },
    borrarCarrera(idx) {
        UI.modal('Borrar carrera', `¿Eliminar <b>${DATA.carreras[idx].nombre}</b>?`, () => {
            DATA.carreras.splice(idx,1);
            this._save(); UI.toast('Carrera eliminada','exito'); this.render();
        });
    },

    /* ====== CABALLOS DEL JUGADOR ====== */
    renderCaballos() {
        const cont = document.getElementById('admin-contenido');
        cont.innerHTML = `<p class="muted mb-10">Modifica directamente tus caballos: stats, nivel, condición, buff %, imagen.</p>` +
            `<button class="btn mb-10" onclick="Admin.crearCaballoCheat()">➕ Crear caballo gratis</button>` +
            Game.jugador.caballos.map(c => `
            <div class="tarjeta">
                <div class="tarjeta-titulo">
                    <h3><span class="horse-avatar">${Horse.visualHTML(c)}</span> ${c.nombre} ${c.sexo==='macho'?'♂':'♀'}</h3>
                    <span class="badge">${(DATA.razas[c.raza]||{}).nombre||'?'} · Nv.${c.nivel}</span>
                </div>
                <p class="muted">Cond: ${Math.round(c.condicion)}% · XP: ${Math.floor(c.experiencia)} · Buff: ${c.buff_admin||0}%</p>
                <button class="btn btn-purple mt-10" onclick="Admin.editarCaballo('${c.id}')">⚙️ Editar todo</button>
            </div>`).join('');
    },
    editarCaballo(id) {
        const c = Game.jugador.caballos.find(x => x.id===id);
        if (!c) return;
        const stats = ['velocidad','velocidadPunta','estamina','salto','aceleracion'];
        const razasOpts = Object.entries(DATA.razas).map(([rid,r]) => `<option value="${rid}" ${c.raza===rid?'selected':''}>${r.nombre}</option>`).join('');
        UI.modal(`Editar ${c.nombre}`, `
            <div class="grid-2">
                <div class="form-grupo"><label>Nombre</label><input id="ec-n" value="${c.nombre}"></div>
                <div class="form-grupo"><label>Sexo</label><select id="ec-s">
                    <option value="macho" ${c.sexo==='macho'?'selected':''}>♂ Macho</option>
                    <option value="hembra" ${c.sexo==='hembra'?'selected':''}>♀ Hembra</option>
                </select></div>
            </div>
            <div class="grid-2">
                <div class="form-grupo"><label>Raza</label><select id="ec-r">${razasOpts}</select></div>
                <div class="form-grupo"><label>Nivel</label><input type="number" min="1" id="ec-l" value="${c.nivel}"></div>
            </div>
            <div class="grid-2">
                <div class="form-grupo"><label>Condición (0-100)</label><input type="number" min="0" max="100" id="ec-cd" value="${Math.round(c.condicion)}"></div>
                <div class="form-grupo"><label>Buff % (puede ser negativo)</label><input type="number" id="ec-b" value="${c.buff_admin||0}"></div>
            </div>
            <div class="form-grupo"><label>Cooldown cría (días)</label><input type="number" min="0" id="ec-cc" value="${c.cooldownCria||0}"></div>
            <h4 class="mt-10 mb-10">Stats</h4>
            <div class="grid-2">
                ${stats.map(s=>`<div class="form-grupo"><label>${s}</label><input type="number" min="1" max="100" id="ec-st-${s}" value="${Math.round(c.stats[s]||0)}"></div>`).join('')}
            </div>
            <div class="form-grupo">
                <label>Imagen personalizada (opcional)</label>
                <input type="file" id="ec-img" accept="image/*">
                <div id="ec-prev" class="mt-10">${c.imagen?`<img src="${c.imagen}" style="max-width:80px;border-radius:8px">`:''}</div>
            </div>
        `, null, [
            { texto:'💾 Guardar', clase:'btn-success', onClick: () => {
                c.nombre = document.getElementById('ec-n').value || c.nombre;
                c.sexo = document.getElementById('ec-s').value;
                c.raza = document.getElementById('ec-r').value;
                c.nivel = parseInt(document.getElementById('ec-l').value)||1;
                c.condicion = parseInt(document.getElementById('ec-cd').value)||0;
                c.buff_admin = parseInt(document.getElementById('ec-b').value)||0;
                c.cooldownCria = parseInt(document.getElementById('ec-cc').value)||0;
                stats.forEach(s => c.stats[s] = parseInt(document.getElementById('ec-st-'+s).value)||50);
                this._save(); UI.toast('Caballo actualizado','exito'); this.render();
            }},
            { texto:'🗑️ Borrar caballo', clase:'btn-danger', onClick: () => {
                if (Game.jugador.caballos.length<=1) { UI.toast('Debe quedar al menos 1','error'); return; }
                Game.jugador.caballos = Game.jugador.caballos.filter(x => x.id!==c.id);
                if (Game.jugador.caballoSeleccionadoId===c.id) Game.jugador.caballoSeleccionadoId = Game.jugador.caballos[0].id;
                this._save(); UI.toast('Borrado','exito'); this.render();
            }}
        ]);
        setTimeout(() => {
            const inp = document.getElementById('ec-img');
            if (inp) inp.onchange = (e) => {
                const f = e.target.files[0]; if (!f) return;
                const r = new FileReader();
                r.onload = ev => {
                    c.imagen = ev.target.result;
                    document.getElementById('ec-prev').innerHTML = `<img src="${c.imagen}" style="max-width:80px;border-radius:8px">`;
                };
                r.readAsDataURL(f);
            };
        }, 50);
    },
    crearCaballoCheat() {
        const ids = Object.keys(DATA.razas);
        UI.modal('Crear caballo (gratis)', `
            <div class="form-grupo"><label>Nombre</label><input id="cc-n" value="Custom"></div>
            <div class="form-grupo"><label>Raza</label><select id="cc-r">${ids.map(i=>`<option value="${i}">${DATA.razas[i].nombre}</option>`).join('')}</select></div>
            <div class="form-grupo"><label>Nivel</label><input type="number" min="1" id="cc-l" value="1"></div>
            <div class="form-grupo"><label>Sexo</label><select id="cc-s">
                <option value="macho">♂ Macho</option><option value="hembra">♀ Hembra</option>
            </select></div>
        `, null, [
            { texto:'➕ Crear', clase:'btn-success', onClick:()=>{
                const c = Horse.crear(
                    document.getElementById('cc-r').value,
                    document.getElementById('cc-n').value||'Custom',
                    parseInt(document.getElementById('cc-l').value)||1,
                    document.getElementById('cc-s').value
                );
                Game.jugador.caballos.push(c);
                this._save(); UI.toast(`Creado: ${c.nombre}`,'exito'); this.render();
            }}
        ]);
    },

    /* ====== ENTRENAMIENTOS ====== */
    renderEntrenamientos() {
        const cont = document.getElementById('admin-contenido');
        const stats = ['velocidad','velocidadPunta','estamina','salto','aceleracion'];
        const lista = Object.entries(DATA.entrenamientos).map(([id,e]) => `
            <div class="tarjeta">
                <div class="tarjeta-titulo"><h3>${e.emoji} ${e.nombre}</h3><span class="badge">$${e.costo}</span></div>
                <p class="muted">ID: ${id} · ${Object.entries(e.mejora).map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(' ')}</p>
                <div class="flex-row mt-10">
                    <button class="btn btn-sec" onclick="Admin.editarEntrenamiento('${id}')">✏️ Editar</button>
                    <button class="btn btn-danger" onclick="Admin.borrarEntrenamiento('${id}')">🗑️ Borrar</button>
                </div>
            </div>`).join('');
        cont.innerHTML = `<button class="btn mb-10" onclick="Admin.editarEntrenamiento()">➕ Nuevo entrenamiento</button>` + lista;
    },
    editarEntrenamiento(id=null) {
        const e = id ? { ...DATA.entrenamientos[id], mejora:{...DATA.entrenamientos[id].mejora} }
                     : { nombre:'', emoji:'💪', costo:100, mejora:{} };
        const nuevoId = id || ('entr_'+Date.now());
        const stats = ['velocidad','velocidadPunta','estamina','salto','aceleracion'];
        UI.modal(id?'Editar':'Nuevo entrenamiento', `
            <div class="grid-2">
                <div class="form-grupo"><label>Nombre</label><input id="en-n" value="${e.nombre}"></div>
                <div class="form-grupo"><label>Emoji</label><input id="en-e" value="${e.emoji}"></div>
            </div>
            <div class="form-grupo"><label>Costo</label><input type="number" id="en-c" value="${e.costo}"></div>
            <h4 class="mt-10 mb-10">Cambios en stats (positivo o negativo, 0=sin efecto)</h4>
            <div class="grid-2">
                ${stats.map(s=>`<div class="form-grupo"><label>${s}</label><input type="number" id="en-m-${s}" value="${e.mejora[s]||0}"></div>`).join('')}
            </div>
        `, null, [
            { texto: id?'💾 Guardar':'➕ Crear', clase:'btn-success', onClick: () => {
                const m = {};
                stats.forEach(s => { const v = parseInt(document.getElementById('en-m-'+s).value)||0; if (v) m[s]=v; });
                DATA.entrenamientos[nuevoId] = {
                    nombre: document.getElementById('en-n').value || 'Sin nombre',
                    emoji: document.getElementById('en-e').value || '💪',
                    costo: parseInt(document.getElementById('en-c').value)||100,
                    mejora: m
                };
                this._save(); UI.toast('Entrenamiento guardado','exito'); this.render();
            }}
        ]);
    },
    borrarEntrenamiento(id) {
        UI.modal('Borrar', `¿Eliminar <b>${DATA.entrenamientos[id].nombre}</b>?`, () => {
            delete DATA.entrenamientos[id];
            this._save(); UI.toast('Borrado','exito'); this.render();
        });
    },

    /* ====== ITEMS ====== */
    renderItems() {
        const cont = document.getElementById('admin-contenido');
        const lista = Object.entries(DATA.items).map(([id,it]) => `
            <div class="tarjeta">
                <div class="tarjeta-titulo"><h3>${it.emoji} ${it.nombre}</h3><span class="badge">$${it.precio}</span></div>
                <p class="muted">${it.descripcion}</p>
                <p class="muted">Tipo: ${it.efecto_tipo} · Valor: ${it.valor}</p>
                <div class="flex-row mt-10">
                    <button class="btn btn-sec" onclick="Admin.editarItem('${id}')">✏️ Editar</button>
                    <button class="btn btn-danger" onclick="Admin.borrarItem('${id}')">🗑️ Borrar</button>
                </div>
            </div>`).join('');
        cont.innerHTML = `<button class="btn mb-10" onclick="Admin.editarItem()">➕ Nuevo item</button>` + lista;
    },
    editarItem(id=null) {
        const it = id ? { ...DATA.items[id] } : { nombre:'', emoji:'🧪', precio:100, descripcion:'', efecto_tipo:'condicion', valor:50 };
        const nid = id || ('item_'+Date.now());
        UI.modal(id?'Editar item':'Nuevo item', `
            <div class="grid-2">
                <div class="form-grupo"><label>Nombre</label><input id="it-n" value="${it.nombre}"></div>
                <div class="form-grupo"><label>Emoji</label><input id="it-e" value="${it.emoji}"></div>
            </div>
            <div class="form-grupo"><label>Descripción</label><input id="it-d" value="${it.descripcion}"></div>
            <div class="grid-2">
                <div class="form-grupo"><label>Precio</label><input type="number" id="it-p" value="${it.precio}"></div>
                <div class="form-grupo"><label>Valor del efecto</label><input type="number" id="it-v" value="${it.valor}"></div>
            </div>
            <div class="form-grupo"><label>Tipo de efecto</label><select id="it-t">
                <option value="condicion" ${it.efecto_tipo==='condicion'?'selected':''}>condicion (+valor)</option>
                <option value="xp" ${it.efecto_tipo==='xp'?'selected':''}>xp (+valor)</option>
                <option value="stats_all" ${it.efecto_tipo==='stats_all'?'selected':''}>stats_all (+valor a todas)</option>
            </select></div>
        `, null, [
            { texto: id?'💾':'➕', clase:'btn-success', onClick: () => {
                DATA.items[nid] = {
                    nombre: document.getElementById('it-n').value||'?',
                    emoji: document.getElementById('it-e').value||'🧪',
                    precio: parseInt(document.getElementById('it-p').value)||100,
                    descripcion: document.getElementById('it-d').value,
                    efecto_tipo: document.getElementById('it-t').value,
                    valor: parseInt(document.getElementById('it-v').value)||0
                };
                this._save(); UI.toast('Item guardado','exito'); this.render();
            }}
        ]);
    },
    borrarItem(id) {
        UI.modal('Borrar', `¿Eliminar <b>${DATA.items[id].nombre}</b>?`, () => {
            delete DATA.items[id];
            this._save(); UI.toast('Borrado','exito'); this.render();
        });
    },

    /* ====== EQUIPAMIENTO ADMIN ====== */
    renderEquipamiento() {
        const cont = document.getElementById('admin-contenido');
        const slotNames = { montura:'Montura', herradura:'Herradura', rienda:'Riendas' };
        const lista = Object.entries(DATA.equipamiento||{}).map(([id,eq]) => `
            <div class="tarjeta">
                <div class="tarjeta-titulo"><h3>${eq.emoji} ${eq.nombre}</h3><span class="badge">${slotNames[eq.slot]||eq.slot} · $${eq.precio}</span></div>
                <p class="muted">${eq.descripcion}</p>
                <p class="muted">Bonus: ${Object.entries(eq.bonus||{}).map(([k,v])=>`${k} +${v}`).join(', ')}</p>
                <div class="flex-row mt-10">
                    <button class="btn btn-sec" onclick="Admin.editarEquipo('${id}')">✏️ Editar</button>
                    <button class="btn btn-danger" onclick="Admin.borrarEquipo('${id}')">🗑️ Borrar</button>
                </div>
            </div>`).join('');
        cont.innerHTML = `<button class="btn mb-10" onclick="Admin.editarEquipo()">➕ Nuevo equipo</button>` + lista;
    },
    editarEquipo(id=null) {
        const eq = id ? { ...DATA.equipamiento[id], bonus:{...(DATA.equipamiento[id].bonus||{})} }
                      : { nombre:'', emoji:'🏇', slot:'montura', precio:500, bonus:{}, descripcion:'' };
        const nid = id || ('eq_'+Date.now());
        const stats = ['velocidad','velocidadPunta','estamina','salto','aceleracion'];
        UI.modal(id?'Editar equipo':'Nuevo equipo', `
            <div class="grid-2">
                <div class="form-grupo"><label>Nombre</label><input id="eq-n" value="${eq.nombre}"></div>
                <div class="form-grupo"><label>Emoji</label><input id="eq-e" value="${eq.emoji}"></div>
            </div>
            <div class="form-grupo"><label>Descripción</label><input id="eq-d" value="${eq.descripcion}"></div>
            <div class="grid-2">
                <div class="form-grupo"><label>Slot</label><select id="eq-s">
                    <option value="montura" ${eq.slot==='montura'?'selected':''}>Montura</option>
                    <option value="herradura" ${eq.slot==='herradura'?'selected':''}>Herradura</option>
                    <option value="rienda" ${eq.slot==='rienda'?'selected':''}>Riendas</option>
                </select></div>
                <div class="form-grupo"><label>Precio</label><input type="number" id="eq-p" value="${eq.precio}"></div>
            </div>
            <h4 class="mt-10 mb-10">Bonus de stats</h4>
            <div class="grid-2">
                ${stats.map(s=>`<div class="form-grupo"><label>${s}</label><input type="number" id="eq-b-${s}" value="${eq.bonus[s]||0}"></div>`).join('')}
            </div>
        `, null, [
            { texto: id?'💾 Guardar':'➕ Crear', clase:'btn-success', onClick: () => {
                const b = {};
                stats.forEach(s => { const v = parseInt(document.getElementById('eq-b-'+s).value)||0; if (v) b[s]=v; });
                if (!DATA.equipamiento) DATA.equipamiento = {};
                DATA.equipamiento[nid] = {
                    nombre: document.getElementById('eq-n').value||'Sin nombre',
                    emoji: document.getElementById('eq-e').value||'🏇',
                    slot: document.getElementById('eq-s').value,
                    precio: parseInt(document.getElementById('eq-p').value)||500,
                    bonus: b,
                    descripcion: document.getElementById('eq-d').value
                };
                this._save(); UI.toast('Equipo guardado','exito'); this.render();
            }}
        ]);
    },
    borrarEquipo(id) {
        UI.modal('Borrar', `¿Eliminar <b>${(DATA.equipamiento[id]||{}).nombre}</b>?`, () => {
            delete DATA.equipamiento[id];
            this._save(); UI.toast('Borrado','exito'); this.render();
        });
    },

    /* ====== SKINS / SPRITES ADMIN ====== */
    renderSkins() {
        const cont = document.getElementById('admin-contenido');
        const variants = typeof Sprites !== 'undefined' && Sprites.listVariants ? Sprites.listVariants() : [];
        const caballos = Game.jugador.caballos;
        let html = `<div class="tarjeta">
            <h3>🎨 Gestión de Sprites y Skins</h3>
            <p class="muted mt-10">Cambia la skin/sprite de tus caballos. Selecciona un caballo y elige una variante visual.</p>
        </div>`;
        caballos.forEach(c => {
            html += `<div class="tarjeta">
                <div class="tarjeta-titulo">
                    <h3><span class="horse-avatar">${Horse.visualHTML(c)}</span> ${c.nombre}</h3>
                    <span class="badge">${(DATA.razas[c.raza]||{}).nombre||'?'}</span>
                </div>
                <p class="muted">Skin actual: <b>${c.spriteVariant||'default'}</b></p>
                <div class="skin-grid">
                    ${variants.map(v => `<div class="skin-option ${c.spriteVariant===v?'active':''}" onclick="Admin.cambiarSkin('${c.id}','${v}')" title="${v}">
                        <div class="skin-preview">${Horse.visualHTML({...c, spriteVariant:v}, 1.2)}</div>
                        <span class="skin-label">${v.replace(/_/g,' ').substring(0,18)}</span>
                    </div>`).join('')}
                </div>
            </div>`;
        });
        html += `<div class="tarjeta">
            <h3>🖼️ Banners de carreras</h3>
            <p class="muted mt-10">Agrega imágenes personalizadas a cada carrera. Usa una URL o sube una imagen (se guarda como base64).</p>
        </div>`;
        DATA.carreras.forEach((ca, i) => {
            html += `<div class="tarjeta">
                <div class="tarjeta-titulo"><h3>${ca.emoji} ${ca.nombre}</h3></div>
                ${ca.banner ? `<div style="margin:6px 0"><img src="${ca.banner}" style="max-width:100%;max-height:80px;border-radius:8px"></div>` : '<p class="muted">Sin banner</p>'}
                <div class="flex-row mt-10">
                    <input type="file" id="ban-${i}" accept="image/*" onchange="Admin.subirBanner(${i},this)">
                    ${ca.banner ? `<button class="btn btn-sec btn-pequeño" onclick="Admin.quitarBanner(${i})">Quitar</button>` : ''}
                </div>
            </div>`;
        });
        cont.innerHTML = html;
    },
    cambiarSkin(horseId, variant) {
        const c = Game.jugador.caballos.find(x=>x.id===horseId);
        if (c) { c.spriteVariant = variant; this._save(); UI.toast(`Skin cambiada`,'exito'); this.render(); }
    },
    subirBanner(idx, input) {
        const f = input.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
            DATA.carreras[idx].banner = ev.target.result;
            this._save(); UI.toast('Banner actualizado','exito'); this.render();
        };
        r.readAsDataURL(f);
    },
    quitarBanner(idx) {
        DATA.carreras[idx].banner = null;
        this._save(); UI.toast('Banner removido'); this.render();
    },

    /* ====== ECONOMÍA / CHEATS ====== */
    renderEconomia() {
        const cont = document.getElementById('admin-contenido');
        cont.innerHTML = `
            <div class="tarjeta">
                <h3>💰 Dinero</h3>
                <p class="muted mt-10">Actual: <b>$${Game.jugador.dinero.toLocaleString()}</b></p>
                <div class="flex-row mt-10">
                    <button class="btn btn-success" onclick="Admin.darDinero(1000)">+$1,000</button>
                    <button class="btn btn-success" onclick="Admin.darDinero(10000)">+$10,000</button>
                    <button class="btn btn-success" onclick="Admin.darDinero(100000)">+$100,000</button>
                </div>
                <div class="form-grupo mt-10">
                    <label>Establecer dinero exacto</label>
                    <input type="number" id="ec-set" value="${Game.jugador.dinero}">
                </div>
                <button class="btn btn-purple" onclick="Admin.setDinero()">💎 Establecer</button>
            </div>
            <div class="tarjeta">
                <h3>⚡ Caballos</h3>
                <button class="btn btn-success mt-10" onclick="Admin.maxCondicion()">😊 Max condición a todos</button>
                <button class="btn btn-success" onclick="Admin.darXPATodos(500)">⭐ +500 XP a todos</button>
                <button class="btn btn-success" onclick="Admin.curarCooldowns()">💤 Limpiar cooldowns de cría</button>
            </div>
            <div class="tarjeta">
                <h3>� Nivel de Jugador</h3>
                <p class="muted mt-10">Actual: <b>Nv.${Game.jugador.nivelJugador||1}</b> · XP: <b>${Game.jugador.xpJugador||0}</b></p>
                <div class="flex-row mt-10">
                    <button class="btn btn-success" onclick="Admin.darXPJugador(500)">+500 XP jugador</button>
                    <button class="btn btn-success" onclick="Admin.darXPJugador(2000)">+2000 XP jugador</button>
                    <button class="btn btn-purple" onclick="Admin.setNivelJugador()">Establecer nivel</button>
                </div>
                <div class="form-grupo mt-10">
                    <input type="number" id="pnj-nivel" placeholder="Nivel objetivo" min="1" value="${Game.jugador.nivelJugador||1}">
                </div>
            </div>
            <div class="tarjeta">
                <h3>� Otros</h3>
                <button class="btn btn-purple mt-10" onclick="Admin.desbloquearLogros()">🎖️ Desbloquear todos los logros</button>
                <button class="btn btn-purple" onclick="Admin.refrescarTienda()">🔄 Regenerar tienda de caballos</button>
            </div>`;
    },
    darDinero(n) { Game.cambiarDinero(n); this._save(); UI.toast(`+$${n.toLocaleString()}`,'exito'); this.render(); },
    setDinero() {
        const v = parseInt(document.getElementById('ec-set').value);
        if (isNaN(v) || v<0) return;
        Game.jugador.dinero = v;
        this._save(); UI.toast('Dinero actualizado','exito'); this.render();
    },
    darXPJugador(n) { Game.añadirXPJugador(n); this._save(); UI.toast(`+${n} XP jugador`,'exito'); this.render(); },
    setNivelJugador() {
        const v = parseInt(document.getElementById('pnj-nivel').value);
        if (isNaN(v) || v<1) return;
        Game.jugador.nivelJugador = v;
        Game.jugador.xpJugador = 0;
        this._save(); UI.toast(`Nivel jugador: ${v}`,'exito'); this.render();
    },
    maxCondicion() { Game.jugador.caballos.forEach(c => c.condicion=100); this._save(); UI.toast('✓','exito'); },
    darXPATodos(n) { Game.jugador.caballos.forEach(c => Horse.añadirXP(c, n)); this._save(); UI.toast(`+${n} XP a todos`,'exito'); },
    curarCooldowns() { Game.jugador.caballos.forEach(c => c.cooldownCria=0); this._save(); UI.toast('Cooldowns limpios','exito'); },
    desbloquearLogros() { LOGROS.forEach(l => Game.jugador.logros[l.id]=true); this._save(); UI.toast('Logros desbloqueados','exito'); },
    refrescarTienda() { Game.regenerarTiendaCaballos(); this._save(); UI.toast('Tienda renovada','exito'); },

    /* ====== DATOS ====== */
    renderDatos() {
        const cont = document.getElementById('admin-contenido');
        cont.innerHTML = `
            <div class="tarjeta">
                <h3>💾 Backup / Restore</h3>
                <p class="muted mt-10">Exporta tu partida (incluye todo: jugador + datos personalizados) o importa otra.</p>
                <button class="btn btn-success mt-10" onclick="Admin.exportar()">📤 Exportar partida (.json)</button>
                <div class="form-grupo mt-10">
                    <label>Importar partida (pega el JSON o selecciona archivo)</label>
                    <input type="file" id="dt-file" accept=".json,application/json">
                    <textarea id="dt-text" rows="6" placeholder="O pega el JSON aquí..."></textarea>
                </div>
                <button class="btn btn-purple" onclick="Admin.importar()">📥 Importar</button>
            </div>
            <div class="tarjeta">
                <h3>🔧 Reset de datos</h3>
                <p class="muted mt-10">Restablece <b>razas/carreras/items/entrenamientos</b> a sus valores por defecto. <b>No</b> borra tus caballos ni dinero.</p>
                <button class="btn btn-danger mt-10" onclick="Admin.resetData()">🔄 Restablecer datos del juego</button>
            </div>`;
        const f = document.getElementById('dt-file');
        if (f) f.onchange = e => {
            const file = e.target.files[0]; if (!file) return;
            const r = new FileReader();
            r.onload = ev => document.getElementById('dt-text').value = ev.target.result;
            r.readAsText(file);
        };
    },
    exportar() {
        const blob = new Blob([Save.exportar()], { type:'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `horse_racing_save_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('Partida exportada','exito');
    },
    importar() {
        try {
            const txt = document.getElementById('dt-text').value;
            if (!txt) { UI.toast('Pega el JSON o selecciona archivo','error'); return; }
            UI.modal('Importar', '¿Sobrescribir tu partida actual? Esto NO se puede deshacer.', () => {
                Save.importar(txt);
                UI.toast('Partida importada','exito');
                UI.show('pantalla-menu');
            });
        } catch(e) { UI.toast('JSON inválido: ' + e.message, 'error'); }
    },
    resetData() {
        UI.modal('Reset datos', 'Esto restablece las razas/carreras/items/entrenamientos por defecto. ¿Continuar?', () => {
            Save.resetData();
            UI.toast('Datos restablecidos','exito');
            this.render();
        });
    }
};
