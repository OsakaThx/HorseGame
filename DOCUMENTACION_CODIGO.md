# 📖 Documentación Completa del Código

Esta guía explica **línea por línea** las funciones más importantes del juego.

---

## 📄 game.js - Explicación Detallada

### `Horse.crear()` - Crear un Caballo Nuevo

```javascript
crear(razaId, nombre, nivel = 1, sexo = null) {
    // razaId = 'pura_sangre', 'arabe', etc.
    // nombre = "Eclipse", "Thunder", etc.
    // nivel = 1, 2, 3... (opcional, por defecto 1)
    // sexo = 'macho' o 'hembra' (opcional, aleatorio si no se especifica)
    
    // PASO 1: Obtener información de la raza desde DATA.razas
    const raza = DATA.razas[razaId];
    
    // PASO 2: Verificar que la raza existe
    if (!raza) {
        // Si no existe, mostrar error
        throw new Error("Raza inválida: " + razaId);
    }
    
    // PASO 3: Copiar las stats base de la raza
    // {...raza.stats_base} crea una COPIA, no una referencia
    const stats = { ...raza.stats_base };
    // Ahora stats = {velocidad: 70, estamina: 60, ...}
    
    // PASO 4: Mejorar stats según el nivel
    // Si nivel = 5, este loop se ejecuta 4 veces (de 2 a 5)
    for (let i = 2; i <= nivel; i++) {
        // Para cada stat (velocidad, estamina, etc.)
        for (let s in stats) {
            // Calcular mejora: 2 puntos × factor de crecimiento
            let mejora = 2 * (raza.crecimiento[s] || 1);
            
            // Sumar la mejora al stat actual
            stats[s] = stats[s] + mejora;
            
            // Asegurar que no pase del máximo (CONFIG.MAX_STAT = 100)
            stats[s] = Math.min(CONFIG.MAX_STAT, stats[s]);
        }
    }
    
    // PASO 5: Agregar variación aleatoria (-3 a +3)
    for (let s in stats) {
        // Math.random() da un número entre 0 y 1
        // Math.random() * 6 da entre 0 y 6
        // Math.random() * 6 - 3 da entre -3 y +3
        let variacion = Math.random() * 6 - 3;
        
        stats[s] = stats[s] + variacion;
        
        // Redondear y asegurar que esté entre MIN y MAX
        stats[s] = Math.round(stats[s]);
        stats[s] = Math.max(CONFIG.MIN_STAT, stats[s]);
        stats[s] = Math.min(CONFIG.MAX_STAT, stats[s]);
    }
    
    // PASO 6: Crear el objeto caballo con todas sus propiedades
    const horse = {
        // ID único: 'h_' + timestamp + número aleatorio
        // Ejemplo: 'h_1234567890_42567'
        id: 'h_' + Date.now() + '_' + Math.floor(Math.random()*100000),
        
        // Datos básicos
        nombre: nombre,           // "Eclipse"
        raza: razaId,            // "pura_sangre"
        nivel: nivel,            // 1, 2, 3...
        
        // Sexo: si no se especificó, 50% macho, 50% hembra
        sexo: sexo || (Math.random() < 0.5 ? 'macho' : 'hembra'),
        
        // Stats calculados arriba
        stats: stats,
        
        // Preferencias de terreno/clima (se generan aparte)
        preferencias: this._generarPreferencias(razaId),
        
        // Estado del caballo
        condicion: 100,          // Energía (100 = descansado)
        experiencia: 0,          // XP para subir nivel
        
        // Estadísticas de carrera
        carreras_jugadas: 0,     // Cuántas carreras ha corrido
        carreras_ganadas: 0,     // Cuántas ha ganado
        dinero_generado: 0,      // Dinero total ganado
        
        // Apariencia
        color: raza.color,       // Color del caballo
        spriteVariant: this._pickVariantForRaza(razaId),  // Qué sprite usar
        imagen: null,            // Imagen custom (admin)
        
        // Valor económico
        valor_compra: Math.floor(raza.precio_base * (1 + (nivel-1)*0.4)),
        
        // Flags y extras
        esIA: false,             // ¿Es controlado por IA?
        cooldownCria: 0,         // Tiempo hasta poder criar
        buff_admin: 0,           // Bonus del admin
        
        // Equipamiento
        equipo: {
            montura: null,       // Silla equipada
            herradura: null,     // Herraduras equipadas
            rienda: null         // Riendas equipadas
        }
    };
    
    // PASO 7: Determinar la clase del caballo (C, B, A, S, SS)
    horse.clase = this._determinarClase(horse);
    
    // PASO 8: Devolver el caballo creado
    return horse;
}
```

**Ejemplo de uso:**
```javascript
// Crear un Pura Sangre nivel 1 llamado "Eclipse"
let miCaballo = Horse.crear('pura_sangre', 'Eclipse', 1);

// Crear un Árabe nivel 5 hembra llamada "Luna"
let otroCaballo = Horse.crear('arabe', 'Luna', 5, 'hembra');
```

---

### `Race.simular()` - Simular una Carrera

```javascript
simular(competidores, carrera, seed = null) {
    // competidores = [caballo1, caballo2, caballo3, ...]
    // carrera = {distancia: 200, terreno: 'pasto', ...}
    // seed = número para hacer la carrera predecible (opcional)
    
    // PASO 1: Crear función de números aleatorios
    let rng = Math.random;  // Por defecto, aleatorio normal
    
    if (seed !== null) {
        // Si hay seed, usar generador determinístico
        // Esto hace que la misma seed siempre dé los mismos resultados
        rng = seededRandom(seed);
    }
    
    // PASO 2: Inicializar variables de la carrera
    const telemetria = [];  // Guardar cada frame de la carrera
    const distancia = carrera.distancia;  // Metros totales
    
    // Estado de cada caballo
    const estado = {};
    competidores.forEach(c => {
        estado[c.id] = {
            progreso: 0,        // Metros avanzados (0 a distancia)
            stamina: 100,       // Energía (0 a 100)
            velocidadActual: 0, // Velocidad en este momento
            cansado: false,     // ¿Está agotado?
            terminado: false    // ¿Ya llegó a la meta?
        };
    });
    
    // PASO 3: Simular frame por frame
    const MAX_TICKS = 1000;  // Máximo 1000 frames
    
    for (let tick = 0; tick < MAX_TICKS; tick++) {
        // Para cada caballo...
        competidores.forEach(c => {
            const e = estado[c.id];
            
            // Si ya terminó, no hacer nada
            if (e.terminado) return;
            
            // CALCULAR VELOCIDAD BASE
            // Velocidad depende de las stats del caballo
            let velocidad = c.stats.velocidad;
            let punta = c.stats.velocidadPunta;
            let aceleracion = c.stats.aceleracion;
            
            // Modificar por terreno
            // Si el caballo prefiere este terreno, va más rápido
            let modTerreno = c.preferencias.terreno[carrera.terreno] || 1;
            velocidad = velocidad * modTerreno;
            
            // Modificar por clima
            let modClima = c.preferencias.clima[carrera.clima] || 1;
            velocidad = velocidad * modClima;
            
            // Modificar por condición (energía)
            // Si condición = 50%, velocidad = 50% también
            let modCondicion = Math.max(0.4, c.condicion / 100);
            velocidad = velocidad * modCondicion;
            
            // Modificar por stamina actual
            // Si stamina = 20%, velocidad baja
            let modStamina = Math.max(0.5, e.stamina / 100);
            velocidad = velocidad * modStamina;
            
            // Agregar variación aleatoria (±10%)
            velocidad = velocidad * (0.9 + rng() * 0.2);
            
            // GASTAR STAMINA
            // Cada frame gasta un poco de energía
            let gastoBase = 0.5;
            
            // Si va muy rápido, gasta más
            if (velocidad > 80) {
                gastoBase = gastoBase * 1.5;
            }
            
            // Restar stamina
            e.stamina = e.stamina - gastoBase;
            
            // Si stamina llega a 0, el caballo se cansa
            if (e.stamina <= 0) {
                e.stamina = 0;
                e.cansado = true;
                velocidad = velocidad * 0.3;  // Va 70% más lento
            }
            
            // AVANZAR
            // Convertir velocidad a progreso
            // velocidad 100 = avanza 0.2 metros por frame
            let avance = (velocidad / 100) * 0.2;
            e.progreso = e.progreso + avance;
            
            // Guardar velocidad actual
            e.velocidadActual = velocidad;
            
            // ¿Llegó a la meta?
            if (e.progreso >= distancia) {
                e.progreso = distancia;  // No pasar la meta
                e.terminado = true;
            }
        });
        
        // GUARDAR ESTE FRAME
        // Copiar el estado actual a telemetría
        const snapshot = {};
        competidores.forEach(c => {
            snapshot[c.id] = {
                progreso: estado[c.id].progreso,
                stamina: estado[c.id].stamina,
                staminaPct: estado[c.id].stamina / 100,
                cansado: estado[c.id].cansado,
                velocidad: estado[c.id].velocidadActual
            };
        });
        telemetria.push(snapshot);
        
        // ¿Todos terminaron?
        let todosTerminaron = competidores.every(c => estado[c.id].terminado);
        if (todosTerminaron) {
            break;  // Salir del loop
        }
    }
    
    // PASO 4: Calcular ranking (quién ganó)
    const ranking = competidores.map(c => {
        return {
            caballo: c,
            progreso: estado[c.id].progreso,
            tiempo: telemetria.length,  // Frames que tardó
            cansado: estado[c.id].cansado
        };
    });
    
    // Ordenar por progreso (mayor a menor)
    ranking.sort((a, b) => b.progreso - a.progreso);
    
    // Asignar posiciones
    ranking.forEach((r, i) => {
        r.posicion = i + 1;  // 1°, 2°, 3°...
    });
    
    // PASO 5: Devolver resultados
    return {
        telemetria: telemetria,  // Cada frame de la carrera
        ranking: ranking         // Orden de llegada
    };
}
```

**Ejemplo de uso:**
```javascript
// Crear competidores
let miCaballo = Horse.crear('pura_sangre', 'Eclipse', 5);
let ia1 = Horse.crearIA(5);
let ia2 = Horse.crearIA(5);
let competidores = [miCaballo, ia1, ia2];

// Obtener datos de la carrera
let carrera = DATA.carreras.find(c => c.id === 'sprint_30m');

// Simular
let resultado = Race.simular(competidores, carrera);

// Ver quién ganó
console.log("Ganador:", resultado.ranking[0].caballo.nombre);
console.log("Posición de mi caballo:", resultado.ranking.find(r => r.caballo.id === miCaballo.id).posicion);
```

---

### `UI.animarCarrera()` - Animar la Carrera en Pantalla

```javascript
animarCarrera(sim, carrera, mi, onFinish = null) {
    // sim = resultado de Race.simular()
    // carrera = datos de la carrera
    // mi = tu caballo
    // onFinish = función a llamar cuando termine (opcional)
    
    const { ranking, telemetria } = sim;
    
    // PASO 1: Crear HTML de los carriles
    const carriles = document.getElementById('carriles');
    
    carriles.innerHTML = ranking.map(r => {
        const c = r.caballo;
        const yo = c.id === mi.id;  // ¿Es mi caballo?
        
        return `
            <div class="carril" data-id="${c.id}">
                <!-- Nombre del caballo -->
                <div class="carril-info ${yo?'tu':''}">
                    ${yo?'★ ':''}${c.nombre}
                </div>
                
                <!-- El caballo (sprite animado) -->
                <div class="runner" style="left:2%">
                    <span class="runner-inner">
                        ${Horse.visualHTML(c, 1.2, 'gallop_right')}
                    </span>
                    <span class="stamina-indicator"></span>
                </div>
            </div>
        `;
    }).join('');
    
    // PASO 2: Calcular duración de la animación
    // Carreras más largas duran más tiempo en pantalla
    const baseDur = 30000;  // 35 segundos base
    const distFactor = Math.sqrt(carrera.distancia / 50);
    const totalMs = Math.min(180000, baseDur + distFactor * 8000);
    
    // PASO 3: Iniciar loop de animación
    const totalTicks = telemetria.length;
    const inicio = performance.now();  // Tiempo actual
    
    const tick = (now) => {
        // Calcular cuánto tiempo ha pasado
        const t = now - inicio;
        
        // Calcular qué frame mostrar
        // Si t = 5000ms y totalMs = 10000ms, estamos a mitad
        // tickIdx = mitad de totalTicks
        const tickIdx = Math.min(
            totalTicks - 1,
            Math.floor((t / totalMs) * totalTicks)
        );
        
        // Obtener datos de este frame
        const snapshot = telemetria[tickIdx];
        
        // PASO 4: Actualizar posición de cada caballo
        snapshot.forEach(s => {
            // Encontrar el elemento HTML del caballo
            const runner = carriles.querySelector(`[data-id="${s.id}"] .runner`);
            if (!runner) return;
            
            // Calcular posición en pantalla
            // progreso 0 = left 2%
            // progreso 1 = left 88%
            const left = 2 + s.progreso * 86;
            runner.style.left = left + '%';
            
            // Actualizar barra de stamina
            const stBar = runner.querySelector('.stamina-indicator');
            if (stBar) {
                stBar.style.width = (s.staminaPct * 100) + '%';
                
                // Color según stamina
                if (s.staminaPct > 0.5) {
                    stBar.style.background = '#2ecc71';  // Verde
                } else if (s.staminaPct > 0.25) {
                    stBar.style.background = '#f39c12';  // Naranja
                } else {
                    stBar.style.background = '#e74c3c';  // Rojo
                }
            }
            
            // Cambiar animación según cansancio
            const canvas = runner.querySelector('canvas.sprite-canvas');
            if (canvas) {
                if (s.cansado || s.staminaPct < 0.15) {
                    canvas.dataset.anim = 'walk_right';  // Caminar
                } else if (s.staminaPct < 0.35) {
                    canvas.dataset.anim = 'trot_right';  // Trotar
                } else {
                    canvas.dataset.anim = 'gallop_right';  // Galopar
                }
            }
        });
        
        // PASO 5: ¿Continuar o terminar?
        if (tickIdx < totalTicks - 1) {
            // Aún no termina, pedir siguiente frame
            requestAnimationFrame(tick);
        } else {
            // Terminó la carrera
            if (onFinish) {
                onFinish(ranking, carrera, mi);
            } else {
                this.finalizarCarrera(ranking, carrera, mi);
            }
        }
    };
    
    // Iniciar el loop
    requestAnimationFrame(tick);
}
```

**Cómo funciona `requestAnimationFrame`:**
```javascript
// Es como un loop que se ejecuta 60 veces por segundo
// Cada vez que se ejecuta, actualiza la posición de los caballos

function tick(now) {
    // 1. Calcular nueva posición
    // 2. Actualizar HTML
    // 3. Pedir siguiente frame
    requestAnimationFrame(tick);
}

// Iniciar
requestAnimationFrame(tick);
```

---

## 📄 ui.js - Explicación Detallada

### `UI.show()` - Cambiar de Pantalla

```javascript
show(pantallaId) {
    // pantallaId = 'pantalla-menu', 'pantalla-carreras', etc.
    
    // PASO 1: Ocultar TODAS las pantallas
    // querySelectorAll encuentra todos los elementos con clase 'pantalla'
    document.querySelectorAll('.pantalla').forEach(p => {
        // Quitar la clase 'activa' de cada pantalla
        p.classList.remove('activa');
    });
    
    // PASO 2: Mostrar solo la pantalla solicitada
    // getElementById encuentra el elemento con ese ID
    const pantalla = document.getElementById(pantallaId);
    
    // Agregar la clase 'activa'
    // En CSS, .pantalla.activa { display: block; }
    pantalla.classList.add('activa');
    
    // PASO 3: Renderizar contenido específico de la pantalla
    if (pantallaId === 'pantalla-menu') {
        this.renderMenu();
    }
    else if (pantallaId === 'pantalla-carreras') {
        this.renderCarreras();
    }
    else if (pantallaId === 'pantalla-caballos') {
        this.renderCaballos();
    }
    // ... etc
}
```

**Ejemplo de uso:**
```javascript
// Ir al menú principal
UI.show('pantalla-menu');

// Ir a la pantalla de carreras
UI.show('pantalla-carreras');
```

---

### `UI.toast()` - Mostrar Mensaje Temporal

```javascript
toast(mensaje, tipo = 'info') {
    // mensaje = "¡Ganaste la carrera!"
    // tipo = 'exito', 'error', 'info'
    
    // PASO 1: Crear elemento HTML
    const div = document.createElement('div');
    
    // PASO 2: Agregar clases CSS
    div.className = 'toast toast-' + tipo;
    // Resultado: class="toast toast-exito"
    
    // PASO 3: Agregar texto
    div.textContent = mensaje;
    
    // PASO 4: Agregar al body (hacerlo visible)
    document.body.appendChild(div);
    
    // PASO 5: Programar que desaparezca después de 3 segundos
    setTimeout(() => {
        // Agregar clase para animación de salida
        div.classList.add('saliendo');
        
        // Después de la animación, eliminar del DOM
        setTimeout(() => {
            div.remove();
        }, 300);
    }, 3000);
}
```

**Ejemplo de uso:**
```javascript
// Mensaje de éxito
UI.toast('¡Ganaste la carrera!', 'exito');

// Mensaje de error
UI.toast('No tienes suficiente dinero', 'error');

// Mensaje informativo
UI.toast('Carrera iniciada');
```

---

## 📄 api.js - Explicación Detallada

### `Api.request()` - Hacer Petición al Servidor

```javascript
async request(endpoint, method = 'GET', body = null) {
    // endpoint = '/api/login', '/api/save', etc.
    // method = 'GET', 'POST', 'PUT', 'DELETE'
    // body = datos a enviar (opcional)
    
    // PASO 1: Preparar opciones de la petición
    const opciones = {
        method: method,  // GET, POST, etc.
        headers: {
            'Content-Type': 'application/json'  // Enviar JSON
        }
    };
    
    // PASO 2: Si hay token, agregarlo
    if (this.token) {
        opciones.headers['Authorization'] = 'Bearer ' + this.token;
    }
    
    // PASO 3: Si hay datos, convertirlos a JSON
    if (body) {
        opciones.body = JSON.stringify(body);
        // JSON.stringify convierte objeto a texto
        // {nombre: "Eclipse"} → '{"nombre":"Eclipse"}'
    }
    
    // PASO 4: Hacer la petición
    // fetch es una función del navegador para hacer peticiones HTTP
    // await espera a que termine
    const response = await fetch(
        'http://localhost:3000' + endpoint,
        opciones
    );
    
    // PASO 5: Convertir respuesta de JSON a objeto
    const data = await response.json();
    // '{"success":true}' → {success: true}
    
    // PASO 6: Manejar errores
    if (!response.ok) {
        throw new Error(data.error || 'Error en la petición');
    }
    
    // PASO 7: Devolver datos
    return data;
}
```

**Ejemplo de uso:**
```javascript
// GET - Obtener datos
let datos = await Api.request('/api/carreras', 'GET');

// POST - Enviar datos
let resultado = await Api.request('/api/save', 'POST', {
    caballos: Game.jugador.caballos,
    dinero: Game.jugador.dinero
});
```

---

## 🎯 Patrones Comunes

### Patrón 1: Recorrer un Array

```javascript
// Forma 1: forEach
caballos.forEach(function(caballo) {
    console.log(caballo.nombre);
});

// Forma 2: for tradicional
for (let i = 0; i < caballos.length; i++) {
    let caballo = caballos[i];
    console.log(caballo.nombre);
}

// Forma 3: for...of (más moderno)
for (let caballo of caballos) {
    console.log(caballo.nombre);
}
```

### Patrón 2: Buscar en un Array

```javascript
// Encontrar el primer elemento que cumple condición
let caballo = caballos.find(c => c.nombre === 'Eclipse');

// Encontrar todos los elementos que cumplen condición
let rapidos = caballos.filter(c => c.stats.velocidad > 80);

// Verificar si alguno cumple condición
let hayRapidos = caballos.some(c => c.stats.velocidad > 80);

// Verificar si todos cumplen condición
let todosRapidos = caballos.every(c => c.stats.velocidad > 80);
```

### Patrón 3: Transformar un Array

```javascript
// map crea un nuevo array transformando cada elemento
let nombres = caballos.map(c => c.nombre);
// ['Eclipse', 'Thunder', 'Storm']

let niveles = caballos.map(c => c.nivel);
// [5, 3, 7]
```

### Patrón 4: Copiar Objetos

```javascript
// Copia superficial (shallow copy)
let copia = {...original};

// Copia profunda (deep copy)
let copia = JSON.parse(JSON.stringify(original));
```

### Patrón 5: Condicionales

```javascript
// If simple
if (caballo.nivel > 10) {
    console.log('Caballo experimentado');
}

// If-else
if (caballo.nivel > 10) {
    console.log('Experimentado');
} else {
    console.log('Novato');
}

// If-else if-else
if (caballo.nivel > 20) {
    console.log('Maestro');
} else if (caballo.nivel > 10) {
    console.log('Experimentado');
} else {
    console.log('Novato');
}

// Operador ternario (if corto)
let mensaje = caballo.nivel > 10 ? 'Experimentado' : 'Novato';
```

---

## 🔧 Herramientas de Debugging

### console.log() - Tu Mejor Amigo

```javascript
// Ver valor de variable
console.log("Dinero:", Game.jugador.dinero);

// Ver objeto completo
console.log("Caballo:", caballo);

// Ver múltiples valores
console.log("Nivel:", caballo.nivel, "Velocidad:", caballo.stats.velocidad);

// Tabla (para arrays de objetos)
console.table(caballos);
```

### debugger - Pausar Ejecución

```javascript
function calcularVelocidad(caballo) {
    let velocidad = caballo.stats.velocidad;
    
    debugger;  // El código se pausa aquí
    
    velocidad = velocidad * 1.5;
    return velocidad;
}
```

Cuando el código llega a `debugger`, se pausa y puedes:
- Ver valores de variables
- Ejecutar código línea por línea
- Inspeccionar el estado del programa

---

Esta documentación te da las bases para entender y modificar el código. ¡Experimenta y aprende haciendo! 🚀
