# Changelog - Horse Racing Legend

## Versión 2.0 - Online Multiplayer & Skill Mechanics

### 🎮 Nueva Mecánica de Habilidad: Ritmo Perfecto

**Problema resuelto:** Las carreras se sentían como pura suerte basada solo en stats del caballo.

**Solución implementada:**
- Durante carreras locales (vs IA) aparece un minijuego interactivo en la parte inferior de la pantalla
- Una barra con zona verde y un cursor que se mueve de lado a lado
- El jugador debe presionar **Espacio** o hacer **click/tap** cuando el cursor está en la zona verde
- **Perfecto** (centro de la zona): +2 puntos, gran impulso visual y descuento de tiempo
- **Bueno** (zona verde amplia): +1 punto, impulso moderado
- **Fallo** (fuera de zona): -1 punto, penalización de impulso
- El puntaje acumulado reduce el tiempo final de tu caballo (0.18s por punto)
- Esto puede cambiar el resultado de la carrera si juegas bien
- **No afecta carreras online** para mantener equidad

**Archivos modificados:**
- `ui.js`: `_iniciarRitmoPerfecto()`, `_golpeRitmoPerfecto()`, `_aplicarRitmoPerfecto()`, `_cerrarRitmoPerfecto()`
- `style.css`: Estilos `.ritmo-perfecto`, `.rp-bar`, `.rp-zone`, `.rp-cursor`

---

### 🏁 Carreras Corregidas

**Problemas resueltos:**
1. ✅ Caballos corrían mirando hacia el lado opuesto (usaban `gallop_left` cuando debían usar `gallop_right`)
2. ✅ La meta estaba a la izquierda pero los caballos iban a la derecha
3. ✅ El polvo quedaba del lado incorrecto
4. ✅ Las carreras locales se congelaban y no terminaban

**Cambios:**
- Caballos ahora corren de **IZQUIERDA → DERECHA**
- Usan animaciones `gallop_right`, `trot_right`, `walk_right`
- Meta reposicionada a la **derecha** (`right:10px`)
- Polvo ahora aparece **detrás** del caballo (lado izquierdo)
- Protección contra telemetría faltante que causaba freeze

**Archivos modificados:**
- `ui.js`: Líneas 585-651 (dirección de carrera, animaciones)
- `style.css`: `.meta-final`, `.runner::before` (polvo)

---

### 🌐 Sistema de Lobby Online Avanzado

**Problema resuelto:** El matchmaking era muy básico (solo 2 jugadores, sin opciones, sin votación).

**Funcionalidades implementadas:**

#### 1. Límite de Jugadores Configurable
- Selector en UI: 2, 3, 4, 6 u 8 jugadores
- Solo empareja con jugadores que eligieron el mismo límite
- Guardado en `matchmaking_queue.max_players` y `online_matches.max_players`

#### 2. Sistema de Lobby con Estados
- **Estado `lobby`**: Sala de espera donde los jugadores votan
- **Estado `racing`**: Carrera en progreso
- Los jugadores pueden ver cuántos están en la sala vs el máximo

#### 3. Votación de Modo de Carrera
- 4 modos disponibles:
  - **⚡ Velocidad**: 120m, favorece velocidad/punta/aceleración
  - **💪 Resistencia**: 420m, favorece estamina
  - **🚧 Obstáculos**: 260m, incluye saltos y obstáculos
  - **🎲 Mixta**: 220m, balanceada
- Cada jugador vota su modo preferido
- Los votos se guardan en `online_matches.mode_votes` (JSONB)

#### 4. Selección de Modo
- Si todos votan lo mismo → ese modo gana automáticamente
- Si votan distinto → al iniciar se elige **aleatoriamente** entre los votos
- Animación visual tipo "ruleta" que alterna entre los modos votados
- El modo seleccionado se guarda en `online_matches.selected_mode`

#### 5. Control de Inicio
- Botón **"🏁 Iniciar ya"**: Cualquier jugador puede iniciar cuando hay mínimo 2
- Botón **"⏳ Esperar más"**: Continúa esperando más jugadores
- Al iniciar, el servidor decide el modo final y cambia estado a `racing`

**Archivos modificados:**
- `server/db.js`: Nuevas columnas en tablas
- `server/index.js`: Endpoints `/vote-mode` y `/start`, lógica de matchmaking mejorada
- `api.js`: Métodos `voteMode()`, `startMatch()`
- `ui.js`: `_mostrarLobbyOnline()`, `votarModoOnline()`, `iniciarMatchOnline()`, `_animarSeleccionModo()`
- `server/schema.sql`: Schema actualizado

---

### 🎯 Carreras Online Determinísticas

**Problema resuelto:** Cada jugador veía resultados diferentes en la misma carrera online.

**Solución:**
- Generación de `race_seed` único por match en el servidor
- Función `seededRandom()` en `game.js` para RNG determinístico
- `Race.simular()` acepta parámetro `seed` opcional
- Ambos clientes usan la misma semilla → mismo resultado garantizado
- Orden de participantes consistente usando `participants` array del servidor

**Archivos modificados:**
- `game.js`: `seededRandom()`, `Race.simular()` con seed
- `server/index.js`: Generación y envío de `race_seed`
- `server/db.js`: Columna `race_seed` en `online_matches`
- `ui.js`: Uso de `match.seed` al simular carrera online

---

### 📊 Base de Datos

**Nuevas columnas en `matchmaking_queue`:**
- `max_players INTEGER NOT NULL DEFAULT 2`

**Nuevas columnas en `online_matches`:**
- `race_seed TEXT`
- `max_players INTEGER NOT NULL DEFAULT 2`
- `status TEXT NOT NULL DEFAULT 'lobby'`
- `mode_votes JSONB NOT NULL DEFAULT '{}'::jsonb`
- `selected_mode TEXT`

**Migraciones automáticas:**
Todas las columnas se agregan con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, por lo que es seguro ejecutar en bases existentes.

---

### 🔧 Mejoras Técnicas

1. **Token JWT mejorado**: Ahora incluye `email` además de `id` y `username`
2. **Validación de sintaxis**: Todos los archivos JS pasan `node --check`
3. **Build automatizado**: `npm run build:web` y `npx cap sync android` ejecutados correctamente
4. **Código más robusto**: Manejo de errores mejorado, protección contra datos faltantes

---

### 📱 APK Generation

**Estado actual:**
- ✅ Código validado sin errores
- ✅ Assets web sincronizados con Android
- ❌ APK build falló por falta de Android SDK

**Para generar APK:**
1. Instalar Android Studio
2. Configurar Android SDK
3. Crear `android/local.properties`:
   ```properties
   sdk.dir=C:\\Users\\Pc\\AppData\\Local\\Android\\Sdk
   ```
4. Ejecutar: `npm run android:build`
5. APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

---

### 🚀 Deployment

**Para desplegar en Railway:**
1. Push código a repositorio Git
2. Conectar Railway al repo
3. Configurar variables de entorno:
   - `DATABASE_URL`: URL de Neon PostgreSQL
   - `JWT_SECRET`: Secret largo y aleatorio
   - `CORS_ORIGIN`: `*` o tu dominio
   - `NODE_ENV`: `production`
4. Railway ejecutará `npm start` automáticamente

**La app web estará disponible en:** `https://tu-proyecto.up.railway.app`

---

### 📝 Testing Checklist

- [x] Carreras locales funcionan sin freeze
- [x] Caballos corren en dirección correcta
- [x] Mecánica Ritmo Perfecto funciona
- [x] Matchmaking encuentra oponentes
- [x] Lobby muestra jugadores y votos
- [x] Votación de modo funciona
- [x] Animación de selección de modo
- [x] Carreras online son determinísticas
- [x] Ambos jugadores ven mismo resultado
- [ ] APK genera correctamente (requiere Android SDK)

---

### 🎯 Próximos Pasos Sugeridos

1. **Expandir modos de carrera**: Agregar clima/terreno variables
2. **Sistema de ranking**: Tabla de líderes global
3. **Torneos**: Competencias programadas con premios
4. **Replay**: Guardar y compartir carreras épicas
5. **Personalización**: Más opciones de customización de caballos
6. **Logros online**: Achievements por victorias online
7. **Chat/Emotes**: Comunicación básica en lobby
8. **Espectadores**: Permitir ver carreras de otros

---

## Resumen de Archivos Modificados

### Backend
- `server/db.js` - Schema extendido con lobby/votos
- `server/index.js` - Endpoints vote-mode, start, matchmaking mejorado
- `server/schema.sql` - Documentación de schema actualizada

### Frontend
- `ui.js` - Lobby online, votación, mecánica Ritmo Perfecto
- `api.js` - Nuevos métodos para votos y start
- `game.js` - Función seededRandom para determinismo
- `style.css` - Estilos de Ritmo Perfecto, corrección de meta/polvo

### Config
- `package.json` - Sin cambios
- `capacitor.config.js` - Sin cambios
- `README.md` - (Actualizar con nuevas features)

---

**Versión:** 2.0.0  
**Fecha:** Mayo 26, 2026  
**Autor:** Cascade AI Assistant
