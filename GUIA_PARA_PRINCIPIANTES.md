# 🎓 Guía para Principiantes - Horse Racing Legend

Esta guía te explica **TODO** el código del juego paso a paso, como si nunca hubieras programado.

---

## 📚 Índice

1. [Conceptos Básicos de Programación](#conceptos-básicos)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Cómo Funciona el Juego](#cómo-funciona-el-juego)
4. [Archivos Principales Explicados](#archivos-principales)
5. [Cómo Agregar Nuevas Funcionalidades](#cómo-agregar-funcionalidades)
6. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## 🔤 Conceptos Básicos

### ¿Qué es una Variable?
Una variable es como una caja donde guardas información.

```javascript
// Crear una variable (declarar)
let nombre = "Eclipse";  // Guarda texto
let edad = 5;            // Guarda un número
let esRapido = true;     // Guarda verdadero/falso

// Usar la variable
console.log(nombre);     // Muestra "Eclipse" en la consola
```

### ¿Qué es una Función?
Una función es como una receta: le das ingredientes y te devuelve un resultado.

```javascript
// Definir una función
function sumar(a, b) {
    return a + b;  // Devuelve la suma
}

// Usar la función
let resultado = sumar(5, 3);  // resultado = 8
```

### ¿Qué es un Objeto?
Un objeto agrupa información relacionada.

```javascript
// Crear un objeto caballo
let caballo = {
    nombre: "Eclipse",
    edad: 5,
    velocidad: 85,
    correr: function() {
        console.log(this.nombre + " está corriendo!");
    }
};

// Usar el objeto
console.log(caballo.nombre);     // "Eclipse"
console.log(caballo.velocidad);  // 85
caballo.correr();                // "Eclipse está corriendo!"
```

### ¿Qué es un Array (Lista)?
Un array es una lista ordenada de cosas.

```javascript
// Crear un array
let caballos = ["Eclipse", "Thunder", "Storm"];

// Acceder a elementos (empiezan en 0)
console.log(caballos[0]);  // "Eclipse" (primero)
console.log(caballos[1]);  // "Thunder" (segundo)

// Agregar elemento
caballos.push("Lightning");  // Ahora hay 4 caballos

// Recorrer todos los elementos
caballos.forEach(function(caballo) {
    console.log(caballo);  // Muestra cada nombre
});
```

---

## 📁 Estructura del Proyecto

```
HorseRace/
├── index.html          # Página principal (lo que ves en el navegador)
├── style.css           # Estilos (colores, tamaños, posiciones)
├── game.js             # Lógica del juego (caballos, carreras, stats)
├── ui.js               # Interfaz de usuario (pantallas, botones)
├── data.js             # Datos del juego (razas, carreras, items)
├── sprites.js          # Animaciones de caballos
├── api.js              # Comunicación con el servidor
├── auth.js             # Login y registro
├── admin.js            # Panel de administrador
├── init.js             # Inicialización del juego
│
├── server/             # Servidor (backend)
│   ├── index.js        # Servidor principal
│   ├── db.js           # Base de datos
│   └── schema.sql      # Estructura de la base de datos
│
└── assets/             # Imágenes y sprites
```

---

## 🎮 Cómo Funciona el Juego

### Flujo Principal

```
1. Usuario abre index.html
   ↓
2. Se cargan todos los archivos .js
   ↓
3. init.js inicializa el juego
   ↓
4. auth.js muestra pantalla de login
   ↓
5. Usuario se loguea
   ↓
6. api.js carga datos del servidor
   ↓
7. ui.js muestra el menú principal
   ↓
8. Usuario selecciona una acción (carrera, tienda, etc.)
   ↓
9. game.js procesa la lógica
   ↓
10. ui.js actualiza la pantalla
```

### Ejemplo: ¿Qué pasa cuando corres una carrera?

```javascript
// 1. Usuario hace click en "Correr carrera"
UI.iniciarCarrera('carrera_sprint_30m');

// 2. Se valida que tengas dinero y caballo
if (Game.jugador.dinero < carrera.costo) {
    UI.toast('Sin dinero', 'error');
    return;
}

// 3. Se crea la carrera con IA
let competidores = [miCaballo, ia1, ia2, ia3];

// 4. Se simula la carrera
let resultado = Race.simular(competidores, carrera);

// 5. Se anima en pantalla
UI.animarCarrera(resultado, carrera, miCaballo);

// 6. Se muestran resultados
UI.finalizarCarrera(resultado, carrera, miCaballo);

// 7. Se guardan cambios
Game.guardar();
```

---

## 📄 Archivos Principales Explicados

### 1. `game.js` - Cerebro del Juego

Este archivo contiene toda la lógica del juego.

#### Objeto `Game`
```javascript
const Game = {
    // Datos del jugador actual
    jugador: {
        dinero: 1000,
        caballos: [],
        nivel: 1,
        // ... más datos
    },
    
    // Cambiar dinero del jugador
    cambiarDinero(cantidad) {
        this.jugador.dinero += cantidad;
        if (this.jugador.dinero < 0) {
            this.jugador.dinero = 0;
            return false;  // No tenía suficiente
        }
        return true;  // Éxito
    }
};
```

#### Objeto `Horse` - Todo sobre caballos
```javascript
const Horse = {
    // Crear un caballo nuevo
    crear(razaId, nivel) {
        let caballo = {
            id: 'horse_' + Date.now(),  // ID único
            nombre: this._generarNombre(),
            raza: razaId,
            nivel: nivel,
            stats: {
                velocidad: 50,
                estamina: 50,
                // ... más stats
            },
            condicion: 100  // Energía (0-100)
        };
        return caballo;
    },
    
    // Subir nivel a un caballo
    subirNivel(caballo) {
        caballo.nivel++;
        // Mejorar stats aleatoriamente
        caballo.stats.velocidad += Math.random() * 5;
        caballo.stats.estamina += Math.random() * 5;
    }
};
```

#### Objeto `Race` - Simulación de carreras
```javascript
const Race = {
    // Simular una carrera completa
    simular(competidores, carrera, seed) {
        // competidores = [caballo1, caballo2, ...]
        // carrera = {distancia: 200, terreno: 'pasto', ...}
        // seed = número para hacer la carrera predecible
        
        let telemetria = [];  // Guardar cada frame
        let progreso = {};    // Progreso de cada caballo
        
        // Simular frame por frame
        for (let tick = 0; tick < 1000; tick++) {
            // Calcular velocidad de cada caballo
            competidores.forEach(c => {
                let velocidad = this._calcularVelocidad(c, carrera);
                progreso[c.id] += velocidad;
            });
            
            // Guardar este frame
            telemetria.push({...progreso});
            
            // ¿Alguien llegó a la meta?
            if (progreso[alguien] >= carrera.distancia) {
                break;
            }
        }
        
        return {telemetria, ranking};
    }
};
```

---

### 2. `ui.js` - Interfaz de Usuario

Este archivo maneja TODO lo que ves en pantalla.

#### Objeto `UI`
```javascript
const UI = {
    // Cambiar de pantalla
    show(pantallaId) {
        // Ocultar todas las pantallas
        document.querySelectorAll('.pantalla').forEach(p => {
            p.classList.remove('activa');
        });
        
        // Mostrar solo la pantalla solicitada
        document.getElementById(pantallaId).classList.add('activa');
        
        // Renderizar contenido de la pantalla
        if (pantallaId === 'pantalla-carreras') {
            this.renderCarreras();
        }
    },
    
    // Mostrar mensaje temporal
    toast(mensaje, tipo) {
        // tipo = 'exito', 'error', o 'info'
        let div = document.createElement('div');
        div.className = 'toast toast-' + tipo;
        div.textContent = mensaje;
        document.body.appendChild(div);
        
        // Desaparecer después de 3 segundos
        setTimeout(() => div.remove(), 3000);
    },
    
    // Mostrar ventana modal
    modal(titulo, contenido, onConfirm) {
        let html = `
            <div class="modal-overlay">
                <div class="modal">
                    <h2>${titulo}</h2>
                    <div>${contenido}</div>
                    <button onclick="confirmar()">Aceptar</button>
                </div>
            </div>
        `;
        // ... mostrar modal
    }
};
```

---

### 3. `data.js` - Base de Datos del Juego

Aquí están TODOS los datos del juego.

```javascript
const DATA = {
    // Todas las razas de caballos
    razas: {
        pura_sangre: {
            nombre: "Pura Sangre",
            emoji: "🐎",
            precio_base: 500,
            stats_base: {
                velocidad: 70,
                estamina: 60,
                // ...
            }
        },
        arabe: {
            nombre: "Árabe",
            emoji: "🏇",
            precio_base: 800,
            stats_base: {
                velocidad: 65,
                estamina: 80,
                // ...
            }
        }
    },
    
    // Todas las carreras disponibles
    carreras: [
        {
            id: 'sprint_30m',
            nombre: "Sprint 30m",
            distancia: 30,
            terreno: 'pasto',
            clima: 'soleado',
            costo_inscripcion: 50,
            premios: [200, 100, 50],  // 1°, 2°, 3°
            nivel_minimo: 1
        },
        // ... más carreras
    ],
    
    // Todos los items de la tienda
    items: {
        pocion_energia: {
            nombre: "Poción de Energía",
            emoji: "🧪",
            precio: 75,
            efecto_tipo: "condicion",
            valor: 50  // Restaura 50 de condición
        }
    }
};
```

---

### 4. `api.js` - Comunicación con Servidor

Este archivo habla con el servidor para guardar/cargar datos.

```javascript
const Api = {
    token: null,  // Token de autenticación
    
    // Hacer petición al servidor
    async request(endpoint, method, body) {
        // endpoint = '/api/login'
        // method = 'GET', 'POST', 'PUT', 'DELETE'
        // body = datos a enviar
        
        let opciones = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Si hay token, agregarlo
        if (this.token) {
            opciones.headers['Authorization'] = 'Bearer ' + this.token;
        }
        
        // Si hay datos, convertirlos a JSON
        if (body) {
            opciones.body = JSON.stringify(body);
        }
        
        // Hacer la petición
        let response = await fetch(endpoint, opciones);
        let data = await response.json();
        
        return data;
    },
    
    // Login
    async login(email, password) {
        let data = await this.request('/api/login', 'POST', {
            email: email,
            password: password
        });
        
        if (data.token) {
            this.token = data.token;  // Guardar token
            return true;
        }
        return false;
    },
    
    // Guardar progreso
    async guardar(datosJugador) {
        await this.request('/api/save', 'POST', datosJugador);
    }
};
```

---

## 🛠️ Cómo Agregar Funcionalidades

### Ejemplo 1: Agregar una Nueva Raza de Caballo

**Paso 1:** Abre `data.js`

**Paso 2:** Encuentra el objeto `razas`

**Paso 3:** Agrega tu nueva raza:

```javascript
razas: {
    // ... razas existentes ...
    
    // TU NUEVA RAZA
    unicornio: {
        nombre: "Unicornio Mágico",
        emoji: "🦄",
        precio_base: 2000,  // Más caro
        color: '#ff00ff',   // Color morado
        stats_base: {
            velocidad: 90,      // Muy rápido
            velocidadPunta: 95,
            estamina: 70,
            salto: 100,         // Salta muy alto
            aceleracion: 85
        },
        descripcion: "Caballo legendario con poderes mágicos"
    }
}
```

**¡Listo!** Ahora puedes comprar unicornios en la tienda.

---

### Ejemplo 2: Agregar una Nueva Carrera

**Paso 1:** Abre `data.js`

**Paso 2:** Encuentra el array `carreras`

**Paso 3:** Agrega tu carrera:

```javascript
carreras: [
    // ... carreras existentes ...
    
    // TU NUEVA CARRERA
    {
        id: 'carrera_volcan',           // ID único
        nombre: "Carrera del Volcán",   // Nombre que se muestra
        tipo: 'obstaculos',             // Tipo de carrera
        distancia: 500,                 // Metros
        terreno: 'rocoso',              // Terreno difícil
        clima: 'calor',                 // Hace calor
        costo_inscripcion: 200,         // Cuesta entrar
        premios: [1000, 500, 250, 100], // Premios 1°-4°
        nivel_minimo: 10,               // Solo nivel 10+
        num_competidores: 5,            // 5 caballos compiten
        nivel_ia: 12,                   // IA nivel 12
        stat_weights: {                 // Qué stats importan
            estamina: 0.4,              // 40% estamina
            salto: 0.3,                 // 30% salto
            velocidad: 0.2,             // 20% velocidad
            aceleracion: 0.1            // 10% aceleración
        }
    }
]
```

**¡Listo!** La carrera aparecerá en el menú de carreras.

---

### Ejemplo 3: Agregar un Nuevo Item a la Tienda

**Paso 1:** Abre `data.js`

**Paso 2:** Encuentra el objeto `items`

**Paso 3:** Agrega tu item:

```javascript
items: {
    // ... items existentes ...
    
    // TU NUEVO ITEM
    zanahoria_dorada: {
        nombre: "Zanahoria Dorada",
        emoji: "🥕",
        precio: 500,
        descripcion: "Aumenta velocidad permanentemente",
        efecto_tipo: "stats_single",  // Afecta un stat
        stat: "velocidad",             // Qué stat
        valor: 5                       // +5 velocidad
    }
}
```

**Paso 4:** Abre `game.js` y encuentra la función `aplicarItem`

**Paso 5:** Agrega el código para tu nuevo tipo de efecto:

```javascript
aplicarItem(c, itemId) {
    const it = DATA.items[itemId];
    if (!it) return false;
    
    if (it.efecto_tipo === 'condicion') {
        c.condicion = Math.min(100, c.condicion + it.valor);
    }
    else if (it.efecto_tipo === 'xp') {
        this.añadirXP(c, it.valor);
    }
    // TU NUEVO EFECTO
    else if (it.efecto_tipo === 'stats_single') {
        c.stats[it.stat] += it.valor;
    }
    
    return true;
}
```

**¡Listo!** Ya puedes comprar y usar zanahorias doradas.

---

## 📖 Ejemplos Prácticos

### Ejemplo: Crear un Sistema de Logros

**1. Definir los logros en `data.js`:**

```javascript
const LOGROS = [
    {
        id: 'primera_victoria',
        nombre: "Primera Victoria",
        emoji: "🏆",
        descripcion: "Gana tu primera carrera",
        recompensa_dinero: 100,
        condicion: function(jugador) {
            // Se cumple si ganaste al menos 1 carrera
            return jugador.estadisticas.carreras_ganadas >= 1;
        }
    },
    {
        id: 'coleccionista',
        nombre: "Coleccionista",
        emoji: "🐴",
        descripcion: "Ten 10 caballos",
        recompensa_dinero: 500,
        condicion: function(jugador) {
            return jugador.caballos.length >= 10;
        }
    }
];
```

**2. Agregar función para verificar logros en `game.js`:**

```javascript
const Game = {
    // ... código existente ...
    
    verificarLogros() {
        LOGROS.forEach(logro => {
            // ¿Ya lo desbloqueaste?
            if (this.jugador.logros[logro.id]) {
                return;  // Ya lo tienes
            }
            
            // ¿Cumples la condición?
            if (logro.condicion(this.jugador)) {
                // ¡Desbloqueado!
                this.jugador.logros[logro.id] = true;
                this.cambiarDinero(logro.recompensa_dinero);
                UI.toast(`¡Logro desbloqueado! ${logro.emoji} ${logro.nombre}`, 'exito');
            }
        });
    }
};
```

**3. Llamar la verificación después de cada acción:**

```javascript
// En ui.js, después de terminar una carrera:
finalizarCarrera(ranking, carrera, mi) {
    // ... código existente ...
    
    // Verificar logros
    Game.verificarLogros();
    
    // Guardar
    Game.guardar();
}
```

---

### Ejemplo: Sistema de Clima Dinámico

**1. Agregar climas en `data.js`:**

```javascript
const CLIMAS = {
    soleado: {
        emoji: "☀️",
        nombre: "Soleado",
        modificador_velocidad: 1.0,  // Normal
        modificador_estamina: 1.0
    },
    lluvioso: {
        emoji: "🌧️",
        nombre: "Lluvioso",
        modificador_velocidad: 0.9,  // 10% más lento
        modificador_estamina: 1.1    // Gasta más energía
    },
    nevado: {
        emoji: "❄️",
        nombre: "Nevado",
        modificador_velocidad: 0.8,  // 20% más lento
        modificador_estamina: 1.2    // Gasta mucha energía
    }
};
```

**2. Usar el clima en la simulación (`game.js`):**

```javascript
const Race = {
    simular(competidores, carrera, seed) {
        // Obtener modificadores del clima
        let clima = CLIMAS[carrera.clima] || CLIMAS.soleado;
        
        // Al calcular velocidad:
        let velocidadBase = caballo.stats.velocidad;
        let velocidadFinal = velocidadBase * clima.modificador_velocidad;
        
        // Al gastar estamina:
        let gastoBase = 0.5;
        let gastoFinal = gastoBase * clima.modificador_estamina;
        
        // ... resto de la simulación
    }
};
```

---

## 🎯 Consejos para Aprender

### 1. Empieza Pequeño
No intentes entender todo de una vez. Empieza con:
- Cambiar textos y números
- Agregar nuevas razas/carreras/items
- Modificar colores y estilos en CSS

### 2. Usa `console.log()` para Entender
Agrega esto en cualquier parte del código para ver qué está pasando:

```javascript
console.log("Valor de la variable:", miVariable);
console.log("¿Llegó aquí el código?");
console.log("Datos del caballo:", caballo);
```

Luego abre la consola del navegador (F12) para ver los mensajes.

### 3. Copia y Modifica
Encuentra código que haga algo similar a lo que quieres y cópialo:

```javascript
// Código original que suma dinero
Game.cambiarDinero(100);

// Tu código nuevo que suma XP (copiado y modificado)
Game.cambiarXP(50);
```

### 4. Comenta Tu Código
Siempre escribe comentarios explicando qué hace cada parte:

```javascript
// Verificar si el jugador tiene suficiente dinero
if (Game.jugador.dinero < 100) {
    // Mostrar mensaje de error
    UI.toast('No tienes suficiente dinero', 'error');
    // Salir de la función
    return;
}

// Restar el dinero
Game.cambiarDinero(-100);
```

### 5. Experimenta Sin Miedo
El código no se va a romper permanentemente. Si algo sale mal:
- Ctrl+Z para deshacer
- Git para volver a versión anterior
- Copia de seguridad antes de cambios grandes

---

## 🔍 Glosario de Términos

- **Variable**: Caja que guarda un valor
- **Función**: Receta que hace algo y puede devolver un resultado
- **Objeto**: Grupo de variables y funciones relacionadas
- **Array**: Lista ordenada de cosas
- **DOM**: El HTML de la página que puedes modificar con JavaScript
- **API**: Forma de comunicarse con el servidor
- **JSON**: Formato para enviar datos (como un objeto convertido a texto)
- **Async/Await**: Forma de esperar a que algo termine (como cargar datos del servidor)
- **Event Listener**: Código que se ejecuta cuando pasa algo (click, tecla presionada, etc.)

---

## 📚 Recursos para Seguir Aprendiendo

1. **MDN Web Docs** (español): https://developer.mozilla.org/es/
   - Documentación oficial de JavaScript

2. **JavaScript.info** (español): https://es.javascript.info/
   - Tutorial completo desde cero

3. **FreeCodeCamp** (español): https://www.freecodecamp.org/espanol/
   - Cursos interactivos gratis

4. **YouTube - Canales recomendados:**
   - "Fazt Code" (español)
   - "midudev" (español)
   - "The Net Ninja" (inglés con subtítulos)

---

## 🎓 Siguiente Paso

Ahora que tienes esta guía, te recomiendo:

1. **Leer los comentarios** que voy a agregar a todos los archivos
2. **Experimentar** cambiando valores pequeños
3. **Agregar** una nueva raza o carrera usando los ejemplos
4. **Preguntar** cuando no entiendas algo específico

¡Mucha suerte en tu aprendizaje! 🚀
