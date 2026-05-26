# 🎮 Sistema de Minijuegos - Horse Racing Legend

## Descripción General

El sistema de minijuegos reemplaza el simple "Ritmo Perfecto" con **8 minijuegos variados** que se seleccionan aleatoriamente durante cada carrera local. La dificultad escala automáticamente según el nivel del caballo.

---

## 📊 Sistema de Dificultad

### Cálculo de Dificultad
```javascript
dificultad = Math.min(5, Math.floor(nivelCaballo / 5) + 1)
```

### Niveles de Dificultad
- **Nivel 1** (Caballos 1-4): Muy fácil, zonas grandes, velocidad lenta
- **Nivel 2** (Caballos 5-9): Fácil, zonas medianas
- **Nivel 3** (Caballos 10-14): Normal, zonas reducidas
- **Nivel 4** (Caballos 15-19): Difícil, zonas pequeñas, velocidad alta
- **Nivel 5** (Caballos 20+): Muy difícil, zonas mínimas, máxima velocidad

---

## 🎯 Los 8 Minijuegos

### 1. ⚡ Ritmo Perfecto
**Mecánica:** Cursor que se mueve de lado a lado, presiona cuando esté en la zona verde.

**Escalado por dificultad:**
- Velocidad del cursor: `1.2 + dif * 0.4`
- Tamaño de zona: `max(10%, 20% - dif * 2%)`

**Puntuación:**
- Perfecto (centro): +3 pts
- Bueno (zona verde): +1 pt
- Fallo: -1 pt

**Controles:** Espacio o Click

---

### 2. 🎯 Secuencia
**Mecánica:** Memoriza y repite una secuencia de flechas direccionales.

**Escalado por dificultad:**
- Longitud de secuencia: `2 + dif` (2-7 teclas)

**Puntuación:**
- Secuencia completa: +4 a +9 pts (según dificultad)
- Error: -2 pts y reinicia secuencia

**Controles:** Flechas del teclado (↑ ↓ ← →)

---

### 3. ⚡ Reacción
**Mecánica:** Espera a que aparezca "¡YA!" y presiona lo más rápido posible.

**Escalado por dificultad:**
- Intervalo de espera: `max(800ms, 2200ms - dif * 300ms)`

**Puntuación:**
- < 200ms: +5 pts
- < 400ms: +3 pts
- > 400ms: +1 pt
- Muy pronto: -2 pts

**Controles:** Espacio o Click

---

### 4. 🎯 Precisión
**Mecánica:** Cursor móvil debe tocar un objetivo que cambia de posición.

**Escalado por dificultad:**
- Velocidad: `0.8 + dif * 0.3`
- Tamaño objetivo: `max(8%, 18% - dif * 2%)`

**Puntuación:**
- Acierto: +3 pts
- Fallo: -1 pt

**Controles:** Espacio o Click

---

### 5. 🧠 Memoria
**Mecánica:** Memoriza una secuencia de colores (emojis) y repítela.

**Escalado por dificultad:**
- Cantidad de colores: `2 + dif` (2-7 colores)
- Tiempo de visualización: `1500ms + dif * 400ms`

**Puntuación:**
- Secuencia correcta: +5 a +10 pts
- Error: -2 pts

**Controles:** Click en botones de colores (🔴🔵🟢🟡🟣🟠)

---

### 6. 🔥 Combo
**Mecánica:** Presiona Espacio rápidamente múltiples veces seguidas.

**Escalado por dificultad:**
- Objetivo de combo: `3 + dif * 2` (3-13 toques)
- Tiempo máximo entre toques: 1500ms

**Puntuación:**
- Combo completo: +6 a +16 pts
- Combo roto: -1 pt

**Controles:** Espacio o Click (rápido)

---

### 7. ⏱️ Timing
**Mecánica:** Múltiples zonas verdes, presiona cuando cursor pase por cualquiera.

**Escalado por dificultad:**
- Velocidad: `1.5 + dif * 0.5`
- Número de zonas: `2 + floor(dif / 2)` (2-4 zonas)

**Puntuación:**
- Acierto en zona: +2 pts
- Fallo: -1 pt

**Controles:** Espacio o Click

---

### 8. 💨 Reflejos
**Mecánica:** Zona verde que se mueve, cursor que se mueve, presiona cuando se toquen.

**Escalado por dificultad:**
- Velocidad cursor: `1.8 + dif * 0.6`
- Velocidad zona: `0.6 + dif * 0.2`

**Puntuación:**
- Acierto: +4 pts
- Fallo: -1 pt

**Controles:** Espacio o Click

---

## 🎲 Selección Aleatoria

En cada carrera local se elige **aleatoriamente** uno de los 8 minijuegos:

```javascript
const tipos = ['ritmo', 'secuencia', 'reaccion', 'precision', 'memoria', 'combo', 'timing', 'reflejos'];
const tipoActual = tipos[Math.floor(Math.random() * tipos.length)];
```

Esto asegura variedad y evita que el jugador se acostumbre a un solo patrón.

---

## 💪 Impacto en la Carrera

### Bonus Visual
Durante la carrera, los puntos acumulados generan un **impulso visual** que hace que tu caballo se vea adelante de su posición real. Esto no afecta el resultado final, solo la percepción durante la animación.

### Bonus Final
Al terminar la carrera, el puntaje total reduce el tiempo final de tu caballo:

```javascript
tiempoFinal = tiempoOriginal - (score * 0.18 segundos)
```

**Ejemplo:**
- Puntaje de 20 pts = -3.6 segundos
- Esto puede cambiar tu posición de 3° a 1° si juegas bien

---

## 🎓 Curva de Aprendizaje

### Caballos Nivel 1-4 (Dificultad 1)
- Minijuegos muy fáciles
- Zonas grandes, velocidad lenta
- Ideal para aprender las mecánicas

### Caballos Nivel 5-9 (Dificultad 2)
- Dificultad moderada
- El jugador ya conoce los 8 tipos
- Empieza a requerir concentración

### Caballos Nivel 10-14 (Dificultad 3)
- Dificultad media
- Zonas más pequeñas
- Secuencias más largas

### Caballos Nivel 15-19 (Dificultad 4)
- Difícil
- Requiere buenos reflejos
- Combos largos, memoria exigente

### Caballos Nivel 20+ (Dificultad 5)
- Muy difícil
- Máxima velocidad
- Zonas mínimas
- Solo para jugadores expertos

---

## 🚫 Exclusión en Online

Los minijuegos **NO aparecen en carreras online** para mantener la equidad entre jugadores con diferentes latencias y dispositivos.

```javascript
if (!onFinish) this._iniciarRitmoPerfecto(carrera, mi);
else this._cerrarRitmoPerfecto();
```

---

## 🎨 Diseño Visual

Cada minijuego tiene su propio estilo visual:

- **Ritmo/Precisión/Timing/Reflejos:** Barras con cursores y zonas
- **Secuencia:** Teclas de flechas con feedback visual
- **Reacción:** Pantalla grande con cambio de estado
- **Memoria:** Emojis de colores con botones interactivos
- **Combo:** Barra de progreso con contador

Todos comparten:
- Overlay semi-transparente en la parte inferior
- Título con emoji y nivel de dificultad
- Contador de puntos en tiempo real
- Feedback visual/sonoro (toasts) en cada acción

---

## 📱 Compatibilidad

### Desktop
- Teclado: Espacio, Flechas
- Mouse: Click en overlay

### Mobile/Tablet
- Touch: Tap en overlay
- Touch: Tap en botones (Memoria)

Todos los minijuegos funcionan tanto con teclado como con touch/click.

---

## 🔧 Implementación Técnica

### Archivos Modificados
- `ui.js`: 8 funciones nuevas (`_minijuegoX`)
- `style.css`: Estilos para cada tipo de minijuego

### Estructura de Código
```javascript
_iniciarRitmoPerfecto(carrera, mi) {
    // Calcula dificultad según nivel
    // Elige minijuego aleatorio
    // Inicializa estado
    // Llama a función específica
}

_minijuegoX(dificultad, overlay) {
    // Configura parámetros según dificultad
    // Renderiza HTML específico
    // Configura event listeners
    // Inicia loop de animación (si aplica)
}
```

### Limpieza
Todos los minijuegos se limpian correctamente al terminar la carrera:

```javascript
_cerrarRitmoPerfecto() {
    if (this._skillRace && this._skillRace.hit) 
        window.removeEventListener('keydown', this._skillRace.hit);
    const el = document.getElementById('ritmo-perfecto');
    if (el) el.remove();
    if (this._skillRace) this._skillRace.running = false;
    this._skillRace = null;
}
```

---

## 🎯 Estrategia para Jugadores

1. **Aprende todos los 8 tipos** con caballos de bajo nivel
2. **Practica los más difíciles** (Memoria, Secuencia, Reflejos)
3. **Usa caballos de alto nivel** solo cuando domines todos
4. **No te frustres** si fallas - la IA también es fuerte
5. **El skill importa** pero el caballo también debe ser bueno

---

## 📈 Balance

El sistema está balanceado para que:
- Un jugador **experto** con caballo **malo** pueda ganar a IA
- Un jugador **novato** con caballo **bueno** tenga ventaja
- Un jugador **experto** con caballo **bueno** domine completamente
- La **variedad** evite monotonía y memorización mecánica

---

**¡Buena suerte en las carreras!** 🏇
