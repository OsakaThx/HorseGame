/* ============================================================
   data.js - Configuración y datos del juego
   ============================================================ */

/** CONFIG: ajustes generales editables sin tocar lógica */
const CONFIG = {
    DINERO_INICIAL: 5000,
    XP_BASE_NIVEL: 100,
    XP_FACTOR_NIVEL: 1.5,
    FATIGA_POR_CARRERA: 18,
    FATIGA_POR_ENTRENAMIENTO: 20,
    XP_GANADA_BASE: 50,
    XP_BONO_VICTORIA: 100,
    XP_BONO_PODIO: 50,
    FACTOR_ALEATORIO_MIN: 0.85,
    FACTOR_ALEATORIO_MAX: 1.15,
    DURACION_SIMULACION_MS: 7000,
    AUTOGUARDADO: true,
    SAVE_KEY: 'horse_racing_save_v2',
    MAX_STAT: 100,
    MIN_STAT: 1,
    RECOMPENSA_DIARIA_BASE: 250,
    RECOMPENSA_DIARIA_RACHA_MAX: 7,
    COSTO_CRIA: 1500,
    COOLDOWN_CRIA_DIAS: 2,
    NOMBRES_IA: ["Lightning","Storm","Blaze","Shadow","Comet","Spirit","Apollo","Ranger","Bullet","Phantom","Eclipse","Fury","Titan","Maverick","Zephyr","Diablo","Arrow","Tornado","Ember","Onyx","Rocket","Saber","Nova","Vortex"]
};

/** DEFAULT_DATA: valores por defecto. El admin puede modificar y los cambios se guardan. */
const DEFAULT_DATA = {
    razas: {
        pura_sangre: {
            nombre:"Pura Sangre", descripcion:"Velocistas elite, dominan sprints",
            emoji:"🐎", color:"#8B4513", imagen:null,
            stats_base:{velocidad:60,velocidadPunta:70,estamina:40,salto:40,aceleracion:60},
            crecimiento:{velocidad:1.2,velocidadPunta:1.5,estamina:0.8,salto:0.7,aceleracion:1.3},
            precio_base:2000, terreno_pref:"pasto"
        },
        cuarto_milla: {
            nombre:"Cuarto de Milla", descripcion:"Explosión inicial, sprints cortos",
            emoji:"🏇", color:"#A0522D", imagen:null,
            stats_base:{velocidad:55,velocidadPunta:75,estamina:35,salto:35,aceleracion:80},
            crecimiento:{velocidad:1.0,velocidadPunta:1.6,estamina:0.6,salto:0.5,aceleracion:1.8},
            precio_base:2500, terreno_pref:"arena"
        },
        arabe: {
            nombre:"Árabe", descripcion:"Resistencia legendaria",
            emoji:"🐴", color:"#D2B48C", imagen:null,
            stats_base:{velocidad:50,velocidadPunta:45,estamina:75,salto:50,aceleracion:50},
            crecimiento:{velocidad:1.0,velocidadPunta:0.7,estamina:1.8,salto:1.1,aceleracion:0.9},
            precio_base:1800, terreno_pref:"tierra"
        },
        mustang: {
            nombre:"Mustang", descripcion:"Versátil, especialista en obstáculos",
            emoji:"🦓", color:"#5C4033", imagen:null,
            stats_base:{velocidad:55,velocidadPunta:50,estamina:60,salto:65,aceleracion:55},
            crecimiento:{velocidad:1.1,velocidadPunta:0.9,estamina:1.3,salto:1.6,aceleracion:1.0},
            precio_base:2200, terreno_pref:"tierra"
        }
    },
    carreras: [
        {id:"sprint_50m", nombre:"Sprint 50m", emoji:"⚡", banner:null, distancia:50, tipo:"recta", terreno:"pasto", clima:"soleado", nivel_minimo:1, costo_inscripcion:50, premios:[500,300,150,50,0,0], num_competidores:5, nivel_ia:1, stat_weights:{velocidadPunta:0.5,aceleracion:0.3,velocidad:0.2}},
        {id:"carrera_100m", nombre:"Carrera Corta 100m", emoji:"🏃", banner:null, distancia:100, tipo:"recta", terreno:"pasto", clima:"soleado", nivel_minimo:2, costo_inscripcion:100, premios:[1000,600,300,100,0,0], num_competidores:5, nivel_ia:2, stat_weights:{velocidad:0.4,velocidadPunta:0.3,aceleracion:0.2,estamina:0.1}},
        {id:"carrera_200m", nombre:"Carrera Media 200m", emoji:"🌬️", banner:null, distancia:200, tipo:"recta", terreno:"tierra", clima:"nublado", nivel_minimo:3, costo_inscripcion:150, premios:[1500,900,450,150,0,0], num_competidores:5, nivel_ia:3, stat_weights:{estamina:0.4,velocidad:0.35,velocidadPunta:0.15,aceleracion:0.1}},
        {id:"carrera_400m", nombre:"Carrera Larga 400m", emoji:"🏞️", banner:null, distancia:400, tipo:"recta", terreno:"tierra", clima:"soleado", nivel_minimo:5, costo_inscripcion:200, premios:[2000,1200,600,200,0,0], num_competidores:5, nivel_ia:5, stat_weights:{estamina:0.6,velocidad:0.3,aceleracion:0.1}},
        {id:"obstaculos_150m", nombre:"Obstáculos 150m", emoji:"🚧", banner:null, distancia:150, tipo:"obstaculos", terreno:"pasto", clima:"nublado", nivel_minimo:4, costo_inscripcion:175, premios:[1750,1050,525,175,0,0], num_competidores:5, nivel_ia:4, stat_weights:{salto:0.45,velocidad:0.25,estamina:0.2,aceleracion:0.1}},
        {id:"curvas_250m", nombre:"Carrera Curvas 250m", emoji:"🌀", banner:null, distancia:250, tipo:"curvas", terreno:"arena", clima:"lluvioso", nivel_minimo:6, costo_inscripcion:250, premios:[2500,1500,750,250,0,0], num_competidores:5, nivel_ia:6, stat_weights:{velocidad:0.4,estamina:0.3,aceleracion:0.2,velocidadPunta:0.1}}
    ],
    equipamiento: {
        /* MONTURAS (slot: montura) */
        montura_basica:    {nombre:"Montura Básica",    emoji:"🟫", slot:"montura", precio:300,  bonus:{velocidad:2, aceleracion:1}, descripcion:"+2 Velocidad, +1 Aceleración"},
        montura_carrera:   {nombre:"Montura de Carrera",emoji:"🏁", slot:"montura", precio:1200, bonus:{velocidad:5, velocidadPunta:4, aceleracion:3}, descripcion:"+5 Vel, +4 Punta, +3 Acel"},
        montura_resistencia:{nombre:"Montura Resistente",emoji:"🛡️", slot:"montura", precio:1000, bonus:{estamina:8, velocidad:2}, descripcion:"+8 Estamina, +2 Velocidad"},
        montura_salto:     {nombre:"Montura de Salto",  emoji:"🦘", slot:"montura", precio:1100, bonus:{salto:8, aceleracion:3}, descripcion:"+8 Salto, +3 Aceleración"},
        montura_elite:     {nombre:"Montura Élite",     emoji:"👑", slot:"montura", precio:5000, bonus:{velocidad:5, velocidadPunta:5, estamina:5, salto:5, aceleracion:5}, descripcion:"+5 a TODO"},
        /* HERRADURAS (slot: herradura) */
        herradura_hierro:  {nombre:"Herradura de Hierro",emoji:"🔩", slot:"herradura", precio:200,  bonus:{aceleracion:3}, descripcion:"+3 Aceleración"},
        herradura_acero:   {nombre:"Herradura de Acero", emoji:"⚙️", slot:"herradura", precio:600,  bonus:{aceleracion:5, velocidadPunta:3}, descripcion:"+5 Acel, +3 Punta"},
        herradura_aligerada:{nombre:"Herradura Aligerada",emoji:"🪶", slot:"herradura", precio:900,  bonus:{velocidad:4, velocidadPunta:4, aceleracion:2}, descripcion:"+4 Vel, +4 Punta, +2 Acel"},
        herradura_grip:    {nombre:"Herradura Anti-deslice",emoji:"🧗", slot:"herradura", precio:800,  bonus:{salto:6, estamina:3}, descripcion:"+6 Salto, +3 Estamina"},
        /* RIENDAS (slot: rienda) */
        rienda_estandar:   {nombre:"Riendas Estándar",  emoji:"➰", slot:"rienda", precio:150,  bonus:{aceleracion:2}, descripcion:"+2 Aceleración"},
        rienda_premium:    {nombre:"Riendas Premium",   emoji:"💎", slot:"rienda", precio:1500, bonus:{velocidad:3, velocidadPunta:3, aceleracion:3}, descripcion:"+3 a stats de velocidad"},
        rienda_endurance:  {nombre:"Riendas Endurance", emoji:"⚓", slot:"rienda", precio:700,  bonus:{estamina:6}, descripcion:"+6 Estamina"}
    },
    entrenamientos: {
        velocidad:   {nombre:"Entrenamiento de Velocidad", emoji:"💨", costo:100, mejora:{velocidad:3,estamina:-1}},
        resistencia: {nombre:"Entrenamiento de Resistencia", emoji:"💪", costo:100, mejora:{estamina:4,velocidadPunta:-1}},
        salto:       {nombre:"Entrenamiento de Salto", emoji:"🦘", costo:150, mejora:{salto:5,velocidad:-1}},
        aceleracion: {nombre:"Entrenamiento de Aceleración", emoji:"🚀", costo:120, mejora:{aceleracion:4,estamina:-1}},
        completo:    {nombre:"Entrenamiento Completo", emoji:"⭐", costo:300, mejora:{velocidad:2,velocidadPunta:2,estamina:2,salto:1,aceleracion:2}}
    },
    recompensasNivel: {
        2:  { dinero:500,  mensaje:"¡Buen comienzo! Primeras carreras completadas." },
        3:  { dinero:800,  equipo:'herradura_hierro', mensaje:"¡Herradura de Hierro desbloqueada!" },
        5:  { dinero:1500, equipo:'montura_basica', mensaje:"¡Montura Básica desbloqueada!" },
        7:  { dinero:2000, equipo:'rienda_estandar', mensaje:"¡Riendas Estándar obtenidas!" },
        10: { dinero:5000, equipo:'herradura_acero', caballo:{raza:'pure_sangre',nombre:'Campeón',nivel:3}, mensaje:"¡Nivel 10! Nuevo caballo y Herradura de Acero." },
        12: { dinero:3000, equipo:'montura_resistencia', mensaje:"¡Montura Resistente desbloqueada!" },
        15: { dinero:8000, equipo:'montura_carrera', mensaje:"¡Montura de Carrera desbloqueada!" },
        18: { dinero:5000, equipo:'herradura_aligerada', mensaje:"¡Herradura Aligerada obtenida!" },
        20: { dinero:15000, equipo:'montura_elite', caballo:{raza:'mustang',nombre:'Élite',nivel:5}, mensaje:"¡Nivel 20! Montura Élite + Caballo Élite." },
        25: { dinero:20000, equipo:'rienda_premium', mensaje:"¡Nivel 25! Riendas Premium desbloqueadas." },
        30: { dinero:30000, equipo:'montura_salto', mensaje:"¡Nivel 30! Montura de Salto desbloqueada." }
    },
    items: {
        pocion_energia:    {nombre:"Poción de Energía", emoji:"🧪", precio:75,  descripcion:"Restaura 50 de condición",      efecto_tipo:"condicion", valor:50},
        descanso_completo: {nombre:"Descanso Completo", emoji:"🛌", precio:150, descripcion:"Restaura condición al 100%",    efecto_tipo:"condicion", valor:100},
        tonico_xp:         {nombre:"Tónico de XP",      emoji:"📘", precio:200, descripcion:"+150 XP al caballo",            efecto_tipo:"xp",        valor:150},
        super_alimento:    {nombre:"Super Alimento",    emoji:"🥕", precio:400, descripcion:"+1 a todas las stats permanente", efecto_tipo:"stats_all", valor:1}
    }
};

/** LOGROS - definidos como constantes de juego (no editables) */
const LOGROS = [
    {id:'primera_victoria', emoji:'🥇', nombre:'Primera Sangre',     desc:'Gana tu primera carrera',  recompensa:200,  check:j=>j.estadisticas.victorias>=1},
    {id:'cinco_victorias',  emoji:'🏆', nombre:'Veterano',           desc:'Gana 5 carreras',          recompensa:500,  check:j=>j.estadisticas.victorias>=5},
    {id:'veinte_victorias', emoji:'👑', nombre:'Leyenda',            desc:'Gana 20 carreras',         recompensa:2000, check:j=>j.estadisticas.victorias>=20},
    {id:'tres_caballos',    emoji:'🐴', nombre:'Establo Pequeño',    desc:'Ten 3 caballos',           recompensa:300,  check:j=>j.caballos.length>=3},
    {id:'diez_caballos',    emoji:'🏟️', nombre:'Magnate Equino',     desc:'Ten 10 caballos',          recompensa:1500, check:j=>j.caballos.length>=10},
    {id:'nivel_5',          emoji:'⭐', nombre:'Entrenador Pro',     desc:'Caballo a nivel 5',        recompensa:400,  check:j=>j.caballos.some(c=>c.nivel>=5)},
    {id:'nivel_10',         emoji:'🌟', nombre:'Maestro Entrenador', desc:'Caballo a nivel 10',       recompensa:1200, check:j=>j.caballos.some(c=>c.nivel>=10)},
    {id:'cria_primera',     emoji:'💕', nombre:'Cupido',             desc:'Cría tu primer caballo',   recompensa:500,  check:j=>j.estadisticas.crias>=1},
    {id:'rico_10k',         emoji:'💰', nombre:'Acaudalado',         desc:'Acumula $10,000',          recompensa:500,  check:j=>j.dinero>=10000},
    {id:'rico_50k',         emoji:'💎', nombre:'Millonario Equino',  desc:'Acumula $50,000',          recompensa:2500, check:j=>j.dinero>=50000},
    {id:'racha_7',          emoji:'📅', nombre:'Constancia',         desc:'Login 7 días seguidos',    recompensa:1000, check:j=>j.rachaMax>=7},
    {id:'todas_carreras',   emoji:'🌈', nombre:'Versatilidad',       desc:'Gana 1 carrera de cada tipo', recompensa:1500, check:j=>Object.keys(j.estadisticas.victorias_por_tipo||{}).length>=DATA.carreras.length}
];

/** DATA: copia mutable. El admin la modifica y se persiste en localStorage. */
let DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
