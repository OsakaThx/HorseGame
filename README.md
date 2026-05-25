# 🏇 Horse Racing Legend v2

Juego de gestión y carreras de caballos hecho en **HTML5 + CSS3 + JavaScript vanilla** (sin frameworks, sin instalación).

---

## 📱 APK + Base de Datos Real

Esta versión puede correr como app web con backend real y también empaquetarse como APK usando Capacitor.

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar servidor

Copia `.env.example` a `.env` y cambia `JWT_SECRET`:

```bash
PORT=3000
JWT_SECRET=pon_aqui_un_secreto_largo
DB_PATH=./server/data/horse_racing.sqlite
CORS_ORIGIN=*
```

### 3. Levantar backend + juego

```bash
npm start
```

Abre:

```text
http://localhost:3000
```

La base de datos SQLite se crea automáticamente en:

```text
server/data/horse_racing.sqlite
```

### 4. APK para Android

Instala Android Studio y luego ejecuta:

```bash
npm run android:init
npm run android:sync
npm run android:open
```

Si ya ejecutaste `android:init` una vez, después normalmente solo necesitas:

```bash
npm run android:sync
npm run android:open
```

Desde Android Studio puedes generar:

- **Debug APK**: `Build > Build Bundle(s) / APK(s) > Build APK(s)`
- **Release APK/AAB**: `Build > Generate Signed Bundle / APK`

### 5. Importante para jugar desde cualquier celular

La APK necesita que el backend esté publicado en internet, por ejemplo en:

- **Render** — recomendado para empezar gratis. Fácil de conectar con GitHub. El servicio gratis puede dormir si nadie lo usa.
- **Railway** — muy cómodo, pero el plan gratuito puede cambiar o quedarse corto rápido.
- **VPS** — mejor para producción, pero normalmente es de pago.
- **Servidor propio** — sirve si tienes una PC encendida siempre y dominio/IP pública.

Para algo gratis y simple al inicio, usa **Render + Neon PostgreSQL**:

- **Render**: servidor Node.js para la API.
- **Neon**: base de datos PostgreSQL real y persistente.

### 6. Crear base de datos gratis en Neon

1. Entra a **https://neon.tech**
2. Crea cuenta o entra con GitHub.
3. Presiona **New Project**.
4. Elige nombre, por ejemplo: `horse-racing`.
5. Copia la conexión que se ve como `DATABASE_URL`.
6. En **SQL Editor**, pega este query:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saves (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saves_updated_at ON saves(updated_at);

CREATE TABLE IF NOT EXISTS friends (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  horse_snapshot JSONB NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS online_matches (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player1_horse JSONB NOT NULL,
  player2_horse JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7. Subir backend gratis a Render

1. Sube este proyecto a GitHub.
2. Entra a **https://render.com**
3. Crea cuenta o entra con GitHub.
4. Presiona **New +** → **Web Service**.
5. Conecta tu repo.
6. Configura:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
7. En **Environment Variables**, agrega:
   - `DATABASE_URL`: pega la URL de Neon.
   - `JWT_SECRET`: pega un texto largo aleatorio.
   - `CORS_ORIGIN`: `*`
   - `NODE_ENV`: `production`
8. Presiona **Deploy Web Service**.

Render te dará una URL parecida a:

```text
https://horse-racing-api.onrender.com
```

Cuando el backend esté publicado, configura `api.js`:

```js
baseUrl: 'https://TU-SERVIDOR.com',
```

Si el backend no está online, la app puede abrir localmente, pero no sincronizará partidas entre celulares.

---

## ▶️ Cómo jugar

> **⚠️ IMPORTANTE:** ahora el juego usa **sprite sheets** (sprites animados de pixel art).
> Los navegadores bloquean la lectura de píxeles si abres el HTML por `file://`.
> Por eso debes ejecutar el juego con **`start.bat`** (doble clic) — eso arranca un servidor local
> en `http://localhost:8000` y abre el navegador automáticamente.
>
> Requiere **Python 3** o **Node.js** (lo más probable es que ya tengas uno).

1. Doble clic en **`start.bat`** (Windows). Se abrirá tu navegador.
2. Empezarás con **$5,000** y un caballo `Starter` (un hermoso caballo café animado 🐎).
3. Reclama tu **recompensa diaria** cada día (la racha multiplica el premio).
4. Desde el menú principal:
   - **🏁 Carreras** — Inscríbete y compite con animación de hipódromo.
   - **🐴 Mis Caballos** — Selecciona, entrena, vende.
   - **🏪 Tienda** — Caballos / Entrenamientos / Items.
   - **💕 Cría** — Combina ♂ y ♀ para crear potrillos que heredan stats.
   - **🏅 Logros** — 12 logros con recompensa en dinero.
   - **📊 Estadísticas** — Tu progreso global.
   - **⚙️ Admin Panel** — Crea y modifica TODO en tiempo real.

El progreso se guarda automáticamente en `localStorage`.

---

## 🎨 Editar pixel art (recomendaciones)

Los sprites del juego están en `assets/Full_Pack/Horse_Sprite_Asset/Horses_equipped_smallsaddle/`.
Para crear nuevas variantes de color o retocar los existentes, te recomiendo:

| Editor | Costo | Mejor para |
|---|---|---|
| **[Piskel](https://www.piskelapp.com/)** | Gratis (web) | Editar sprites en el navegador, sin instalar. Recomendado para empezar. |
| **[LibreSprite](https://libresprite.github.io/)** | Gratis (open source) | Fork libre de Aseprite. Ideal para sprite sheets y animaciones. |
| **[Aseprite](https://www.aseprite.org/)** | ~$20 USD | El estándar profesional de pixel art. Si te enganchas, vale cada centavo. |
| **GIMP / Krita** | Gratis | Generalistas; sirven pero no son específicos de pixel art. |

### Workflow recomendado
1. Abre uno de los PNG del caballo en **Piskel** o **LibreSprite**.
2. Usa **"Replace Color"** para cambiar el color base sin redibujar todo.
3. Guarda como PNG (mismo formato y tamaño 720×1152).
4. Súbelo al juego desde el **Admin Panel** (pestaña Caballos) — el sistema auto-detecta los frames sin que tengas que medir nada.

---

## ✨ Novedades v2

### 🎨 Visuales de carrera mejoradas
La pantalla de carrera ahora es un **hipódromo completo**:
- **Cielo** con gradiente que cambia según el clima.
- **Sol** brillante (en días soleados) que pulsa.
- **Nubes** flotando con parallax (varias capas).
- **Lluvia** animada en clima lluvioso (60 gotas).
- **Montañas** en el horizonte.
- **Gradas** con público (silueta repetida).
- **Pista** que se colorea según el terreno (pasto/arena/tierra).
- **Carriles** con líneas separadoras.
- **Caballos animados galopando** (animación CSS de cuerpo + emoji 💨 de polvo dejando estela).
- **Corona 👑** sobre el caballo líder.
- **Meta** con bandera 🏁 ondeante y patrón de cuadros.

### 🎮 Sistemas nuevos
- **Recompensa diaria** con racha (hasta x7).
- **Sexo** en cada caballo (♂/♀).
- **Cría** (breeding): potrillo que hereda 30% del promedio de stats de los padres.
- **Cooldown de cría** (2 días tras criar).
- **12 logros** con recompensas en dinero (auto-detectados).
- **Items expandidos**: pociones, tónicos de XP, super alimento.

### ⚙️ Admin Panel (NUEVO)
Acceso desde el menú. Puedes:
- **🐎 Razas**: crear/editar/borrar razas, subir imágenes PNG/JPG (se guardan como base64), cambiar stats base, crecimiento, color, terreno preferido.
- **🏁 Carreras**: CRUD completo con validación de pesos de stats (deben sumar 1.0).
- **🐴 Caballos**: edita tus caballos directamente — nombre, sexo, raza, nivel, stats, condición, buff %, imagen personalizada, cooldown.
- **💪 Entrenamientos**: añade entrenamientos custom con cualquier combinación de stats.
- **🧪 Items**: crea pociones con efectos de condición, XP o stats globales.
- **💰 Cheats**: dinero ($1k/$10k/$100k o exacto), max condición a todos, XP a todos, limpiar cooldowns, desbloquear logros.
- **💾 Datos**: exportar partida como `.json`, importar otra, reset de datos por defecto.

---

## 📂 Estructura

```
HorseRace/
├── index.html      Estructura HTML (todas las pantallas)
├── style.css       Estilos y animaciones (hipódromo, galope, etc.)
├── data.js         CONFIG + datos por defecto + LOGROS
├── game.js         Horse, Race, Breeding, Achiev, Game, Save
├── ui.js           Interfaz, render, navegación
├── admin.js        Panel de administración (CRUD)
├── init.js         Punto de entrada
└── README.md       Este archivo
```

---

## 🛠️ Cómo modificar el juego

### Sin tocar código → usa el **Admin Panel**
Es lo más fácil. Abre el juego, ve a `⚙️ Admin Panel` y modifica todo desde formularios.

### Tocando código
| Quiero... | Archivo | Sección |
|---|---|---|
| Cambiar balance general (dinero inicial, XP, fatiga, etc.) | `data.js` | `CONFIG` |
| Añadir/cambiar razas por defecto | `data.js` | `DEFAULT_DATA.razas` |
| Añadir/cambiar carreras por defecto | `data.js` | `DEFAULT_DATA.carreras` |
| Añadir logros | `data.js` | `LOGROS` |
| Cambiar fórmula de rendimiento | `game.js` | `Race.calcularRendimiento` |
| Cambiar herencia de la cría | `game.js` | `Breeding.cruzar` |
| Cambiar visual de la pista | `style.css` | sección "ESCENA DE CARRERA" |
| Cambiar animación del galope | `style.css` | `@keyframes galopar` |

### Ejemplo: nueva raza desde código
```js
DEFAULT_DATA.razas.unicornio = {
    nombre:"Unicornio", descripcion:"Mítico",
    emoji:"🦄", color:"#ff00ff", imagen:null,
    stats_base:{velocidad:80,velocidadPunta:80,estamina:80,salto:80,aceleracion:80},
    crecimiento:{velocidad:1.5,velocidadPunta:1.5,estamina:1.5,salto:1.5,aceleracion:1.5},
    precio_base:5000, terreno_pref:"pasto"
};
```

### Ejemplo: nueva carrera
```js
DEFAULT_DATA.carreras.push({
    id:"copa_oro", nombre:"Copa de Oro", emoji:"🏆",
    distancia:500, tipo:"recta", terreno:"pasto", clima:"soleado",
    nivel_minimo:10, costo_inscripcion:1000,
    premios:[10000,5000,2500,1000,0,0],
    num_competidores:5, nivel_ia:10,
    stat_weights:{velocidad:0.4, estamina:0.4, aceleracion:0.2}  // debe sumar 1.0
});
```

---

## 💡 Tips para que sea adictivo

1. **Especializa caballos**: no entrenes "completo" siempre. Un Pura Sangre con sprint maxeado domina sprints.
2. **Aprovecha el terreno**: cada raza tiene `terreno_pref` con +10% rendimiento.
3. **Cría estratégica**: cruza tus dos mejores caballos para crear un campeón.
4. **Mantén la racha diaria** para multiplicar el dinero gratis (hasta x7).
5. **Usa pociones antes de carreras importantes** si la condición está baja.

---

## 🐛 Casos especiales manejados

- 😴 Caballo agotado (cond. < 10) no puede correr.
- 💸 Sin dinero → botones deshabilitados.
- 🔒 Nivel insuficiente → carrera bloqueada.
- 🐴 No vender último caballo, no borrar última raza.
- 📏 Stats topadas a 100 / 1.
- ✅ Validación de pesos en carreras (deben sumar 1.0).
- 💕 Cría sólo entre ♂ y ♀, con condición ≥ 50% y sin cooldown.

---

## 🚀 Migración a otras plataformas

Cuando domines la web puedes portar a **Godot 4** (recomendado para 2D) o **Unity**. La arquitectura modular (data / game / ui) facilita el port: en Godot las clases serían `Resource` y los módulos `Autoload`.

¡A correr! 🐎🏆
