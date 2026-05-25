/* ============================================================
   sprites.js - Sistema de sprites animados para caballos
   ----
   - Carga sprite sheets desde assets/Full_Pack/Horse_Sprite_Asset/Horses_equipped_smallsaddle/
   - Auto-detecta los frames de cada animación (escaneando píxeles transparentes)
   - Anima canvases con atributo data-anim (idle_right, gallop_right, eat_right, etc.)
   - API:
       Sprites.init()                              -> Promise (cargar default)
       Sprites.htmlFor(variant, anim, size)        -> string HTML con <canvas>
       Sprites.listVariants()                       -> ['brown_brown', 'white_brown', ...]
       Sprites.loadVariant(name)                    -> Promise
   ============================================================ */

const Sprites = {
    BASE_PATH: 'assets/Full_Pack/Horse_Sprite_Asset/Horses_equipped_smallsaddle/',

    // Lista de variantes disponibles (filename -> id corto)
    VARIANTS: {
        'fullcolor_brown_brown':  'Horse_fullcolor_brown_brownsaddled_smallsaddle.png',
        'fullcolor_brown_black':  'Horse_fullcolor_brown_blacksaddled_smallsaddle.png',
        'fullcolor_black_brown':  'Horse_fullcolor_black_brownsaddled_smallsaddle.png',
        'fullcolor_black_black':  'Horse_fullcolor_black_blacksaddled_smallsaddle.png',
        'fullcolor_white_brown':  'Horse_fullcolor_White_brownsaddled_smallsaddle.png',
        'fullcolor_white_black':  'Horse_fullcolor_White_blacksaddled_smallsaddle.png',
        'paint_brown_brown':      'Horse_paint_brown_brownsaddled_smallsaddle.png',
        'paint_brown_black':      'Horse_paint_brown_blacksaddled_smallsaddle.png',
        'paint_black_brown':      'Horse_paint_black_brownsaddled_smallsaddle.png',
        'paint_black_black':      'Horse_paint_black_blacksaddled_smallsaddle.png',
        'paint_beige_brown':      'Horse_paint_beige\u200b\u200b_brownsaddled_smallsaddle.png',
        'paint_beige_black':      'Horse_paint_beige\u200b\u200b_blacksaddled_smallsaddle.png',
        'socks_brown_brown':      'Horse_socks_brown_brownsaddled_smallsaddle.png',
        'socks_brown_black':      'Horse_socks_brown_blacksaddled_smallsaddle.png',
        'socks_black_brown':      'Horse_socks_black_brownsaddled_smallsaddle.png',
        'socks_black_black':      'Horse_socks_black_blacksaddled_smallsaddle.png',
        'socks_beige_brown':      'Horse_socks_beige\u200b\u200b_brownsaddled_smallsaddle.png',
        'socks_beige_black':      'Horse_socks_beige\u200b\u200b_blacksaddled_smallsaddle.png',
    },
    DEFAULT_VARIANT: 'fullcolor_brown_brown',

    // Etiquetas legibles (orden de detección típico para este sprite sheet)
    ANIM_ORDER: ['idle_left','eat_left','walk_left','trot_left','gallop_left',
                 'idle_right','eat_right','walk_right','trot_right','gallop_right',
                 'idle_down','walk_down','idle_up','walk_up'],

    // FPS recomendado por animación
    ANIM_FPS: {
        idle_left:6,  eat_left:6,  walk_left:8,  trot_left:11, gallop_left:14,
        idle_right:6, eat_right:6, walk_right:8, trot_right:11, gallop_right:14,
        idle_down:6,  walk_down:8, idle_up:6,    walk_up:8
    },

    sheets: {},        // variantId -> { img, animations: {name: {fps, frames:[{x,y,w,h}]}} }
    _loopRunning: false,
    _frameConfig: null, // detección compartida (todas las variantes tienen mismo layout)

    /** Carga la variante por defecto y arranca el loop de animación */
    async init() {
        await this.loadVariant(this.DEFAULT_VARIANT);
        if (!this._loopRunning) {
            this._loopRunning = true;
            requestAnimationFrame(this._loop.bind(this));
        }
    },

    /** Carga una variante específica (descarga PNG + reutiliza detección si ya existe) */
    async loadVariant(variantId) {
        if (this.sheets[variantId]) return this.sheets[variantId];
        const filename = this.VARIANTS[variantId];
        if (!filename) throw new Error('Variante desconocida: ' + variantId);
        const img = await this._loadImage(this.BASE_PATH + filename);
        // Detectar frames la primera vez; reutilizar para variantes siguientes
        if (!this._frameConfig) {
            this._frameConfig = this._detectFrames(img);
        }
        // Construir mapa de animaciones por nombre
        const animations = {};
        this._frameConfig.bands.forEach((band, i) => {
            const name = this.ANIM_ORDER[i] || `anim_${i}`;
            animations[name] = {
                fps: this.ANIM_FPS[name] || 8,
                frames: band.frames
            };
        });
        this.sheets[variantId] = { img, animations };
        return this.sheets[variantId];
    },

    listVariants() { return Object.keys(this.VARIANTS); },

    /** Carga PNG como Image */
    _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(new Error('No se pudo cargar ' + src));
            img.src = src;
        });
    },

    /** Escanea el PNG: busca filas/columnas transparentes para separar frames */
    _detectFrames(img) {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
        const W = cv.width, H = cv.height;
        const alpha = (x, y) => data[(y * W + x) * 4 + 3];

        const rowHas = y => { for (let x = 0; x < W; x++) if (alpha(x, y) > 10) return true; return false; };
        const colHasInBand = (x, y1, y2) => {
            for (let y = y1; y < y2; y++) if (alpha(x, y) > 10) return true;
            return false;
        };

        // 1) bandas horizontales
        const bands = [];
        let inBand = false, start = 0;
        for (let y = 0; y < H; y++) {
            const h = rowHas(y);
            if (h && !inBand) { start = y; inBand = true; }
            else if (!h && inBand) { bands.push([start, y - 1]); inBand = false; }
        }
        if (inBand) bands.push([start, H - 1]);

        // 2) frames por banda
        const result = [];
        bands.forEach((b) => {
            const y1 = b[0], y2 = b[1] + 1;
            const frames = [];
            let inFr = false, sx = 0;
            for (let x = 0; x < W; x++) {
                const has = colHasInBand(x, y1, y2);
                if (has && !inFr) { sx = x; inFr = true; }
                else if (!has && inFr) { frames.push({ x: sx, y: y1, w: x - sx, h: y2 - y1 }); inFr = false; }
            }
            if (inFr) frames.push({ x: sx, y: y1, w: W - sx, h: y2 - y1 });
            if (frames.length > 0 && (y2 - y1) > 10) {
                const maxW = Math.max(...frames.map(f => f.w));
                const maxH = Math.max(...frames.map(f => f.h));
                result.push({ y: y1, h: y2 - y1, frames, maxW, maxH });
            }
        });
        console.log('[Sprites] Auto-detectado:', result.length, 'animaciones');
        return { bands: result };
    },

    /**
     * Devuelve HTML para un caballo animado.
     * @param variant variante de sprite (ej. 'fullcolor_brown_brown')
     * @param anim nombre de animación (ej. 'idle_right')
     * @param size tamaño en píxeles (cuadrado)
     */
    htmlFor(variant, anim, size = 48) {
        variant = variant || this.DEFAULT_VARIANT;
        anim = anim || 'idle_right';
        // Si no está cargada esa variante, dispara carga (la próxima vez que se renderice mostrará)
        if (!this.sheets[variant]) this.loadVariant(variant).catch(()=>{});
        return `<canvas class="sprite-canvas" data-variant="${variant}" data-anim="${anim}" style="width:${size}px;height:${size}px;image-rendering:pixelated"></canvas>`;
    },

    /** Loop global: anima todos los <canvas class="sprite-canvas"> en el DOM */
    _loop(now) {
        const canvases = document.querySelectorAll('canvas.sprite-canvas');
        canvases.forEach(cv => this._tickCanvas(cv, now));
        requestAnimationFrame(this._loop.bind(this));
    },

    _tickCanvas(cv, now) {
        const variant = cv.dataset.variant || this.DEFAULT_VARIANT;
        const animName = cv.dataset.anim || 'idle_right';
        const sheet = this.sheets[variant] || this.sheets[this.DEFAULT_VARIANT];
        if (!sheet) return;
        const anim = sheet.animations[animName] || sheet.animations['idle_right'];
        if (!anim || !anim.frames.length) return;

        // Inicializar estado en el canvas la primera vez
        if (!cv._sprite) {
            cv._sprite = { frame: 0, last: now, lastAnim: animName };
            // Ajustar tamaño interno del canvas al frame más grande de la animación (mejor calidad)
            const maxW = Math.max(...anim.frames.map(f => f.w));
            const maxH = Math.max(...anim.frames.map(f => f.h));
            cv.width = maxW;
            cv.height = maxH;
        }
        // Reset si cambia animación
        if (cv._sprite.lastAnim !== animName) {
            cv._sprite.lastAnim = animName;
            cv._sprite.frame = 0;
            const maxW = Math.max(...anim.frames.map(f => f.w));
            const maxH = Math.max(...anim.frames.map(f => f.h));
            cv.width = maxW;
            cv.height = maxH;
        }

        const interval = 1000 / anim.fps;
        if (now - cv._sprite.last >= interval) {
            cv._sprite.last = now;
            const f = anim.frames[cv._sprite.frame % anim.frames.length];
            const ctx = cv.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, cv.width, cv.height);
            // Centrar el frame dentro del canvas (anchos variables)
            const dx = Math.floor((cv.width - f.w) / 2);
            const dy = Math.floor((cv.height - f.h) / 2);
            ctx.drawImage(sheet.img, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h);
            cv._sprite.frame++;
        }
    }
};
