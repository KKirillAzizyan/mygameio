// ============ ГЛАВНЫЙ: игровой цикл, состояния, ввод ============
(function (G) {
  const U = G.U, C = G.C;

  let canvas, ctx;
  let lastTs = 0;
  let acc = 0;

  function createState(nick) {
    const state = {
      time: 0, phase: 0, paused: false,
      food: [], viruses: [], traps: [], buildings: [],
      hazards: [], npcs: [], magnets: [], projectiles: [],
      bots: [], orgs: [],
      event: null, lastPlayerMass: undefined,
      viewW: canvas.width, viewH: canvas.height,
      peakMass: 0, bornAt: 0,
    };

    // мир
    G.world.init();
    G.foods.ensure(state);
    G.viruses.ensure(state, C.VIRUS_COUNT);
    G.magnets.ensure(state);

    // игрок
    const p = G.world.findSafeSpot(state, 0);
    const player = new G.Organism(state, {
      name: nick || 'Игрок', x: p.x, y: p.y, mass: C.START_MASS, isPlayer: true,
    });
    player.energy = player.maxEnergy();
    state.player = player;
    state.orgs.push(player);
    state.bornAt = 0;

    // боты
    G.bots.spawn(state);

    // NPC
    G.npc.ensure(state);

    // контракты
    G.contracts.reset();

    // сбросить таймеры одноразовых систем
    G.events.nextAt = C.EVENT_INTERVAL;
    G.events.last = null;
    G.king.cooldown = C.KING_FIRST;
    G.king.zone = null;
    G.state = state;
    return state;
  }

  const game = {
    mode: 'menu', // menu | playing | dead

    init() {
      canvas = document.getElementById('game');
      ctx = canvas.getContext('2d');
      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (G.state) { G.state.viewW = canvas.width; G.state.viewH = canvas.height; }
      };
      window.addEventListener('resize', resize);
      resize();

      G.input.init(canvas);
      G.ui.init();
      G.ui.showMenu();

      lastTs = performance.now();
      requestAnimationFrame(game.loop);
    },

    start() {
      const nick = (G.ui.els.nick.value || '').trim() || 'Игрок';
      createState(nick);
      game.mode = 'playing';
      G.ui.hideMenu();
      G.ui.hideDeath();
      G.ui.hidePause();
      G.ui.hideEvo();
      G.ui.banner('🧫 Выживи и стань большим! Мир меняется со временем...', 5000);
      G.ui.toast('Добро пожаловать! H — справка по управлению', 'good');
    },

    respawn() { game.start(); },

    toMenu() {
      game.mode = 'menu';
      G.state = null;
      G.ui.hideDeath();
      G.ui.hidePause();
      G.ui.hideEvo();
      G.ui.showMenu();
    },

    togglePause() {
      if (game.mode !== 'playing' || !G.state) return;
      G.state.paused = !G.state.paused;
      if (G.state.paused) G.ui.showPause(); else G.ui.hidePause();
    },

    onPlayerDeath(killer) {
      const s = G.state;
      game.mode = 'dead';
      s.player.lastMass = s.peakMass;
      s.player.lastTime = s.time - s.bornAt;
      s.paused = true;
      setTimeout(() => { if (game.mode === 'dead') G.ui.showDeath(killer, s); }, 600);
    },

    /* ---------- ввод ---------- */
    handleInput(state) {
      const p = state.player;
      if (!p) return;
      const inp = G.input;

      // мир → экран: прицел
      const cam = G.world.cam;
      p.aimX = cam.x + (inp.sx - state.viewW / 2) / cam.scale;
      p.aimY = cam.y + (inp.sy - state.viewH / 2) / cam.scale;

      // хотkeys работают всегда
      if (inp.tap('P') && game.mode === 'playing') game.togglePause();
      if (inp.tap('H')) {
        const helpHidden = G.ui.els.help.classList.contains('hidden');
        if (helpHidden) {
          G.ui.showHelp();
          state.wasPausedForHelp = state.paused;
          state.paused = true;
        } else {
          G.ui.hideHelp();
          state.paused = !!state.wasPausedForHelp;
          state.wasPausedForHelp = false;
        }
      }
      if (inp.tap('Enter') && game.mode === 'dead') game.respawn();

      if (game.mode !== 'playing' || !p.alive || state.paused) return;

      if (inp.tap(' ')) p.playerSplit();

      // способности
      for (const a of G.abilities.LIST) {
        if (inp.tap(a.key)) G.abilities.use(state, p, a.id);
      }
      // ловушки
      for (const t of G.traps.TYPES) {
        if (inp.tap(t.key)) G.traps.place(state, p, t.id);
      }
      // стройки
      for (const b of G.buildings.TYPES) {
        if (inp.tap(b.key)) G.buildings.place(state, p, b.id);
      }
    },

    /* ---------- шаг симуляции (вызывается из цикла и из тестов) ---------- */
    update(dt) {
      const state = G.state;
      if (!state) return;
      state.viewW = canvas.width;
      state.viewH = canvas.height;
      game.handleInput(state);

      if (game.mode === 'playing' && !state.paused) {
        state.time += dt;

        // системы верхнего уровня
        G.events.update(state, dt);
        G.king.update(state, dt);
        G.contracts.update(state, dt);
        G.combo.update(state, dt);

        // эволюция игрока (боты эволюционируют автоматически внутри check)
        G.evo.check(state, state.player);
        if (state.player.pendingEvo && !state.evoPopupOpen) {
          state.evoPopupOpen = true;
          state.paused = true;
          G.ui.showEvo(state.player);
        }

        // ИИ и мир
        G.bots.update(state, dt);
        G.world.update(state, dt);
        G.magnets.update(state, dt);

        // пик массы для экрана смерти
        if (state.player.alive && state.player.mass > state.peakMass) state.peakMass = state.player.mass;
      }
    },

    /* ---------- цикл ---------- */
    loop(ts) {
      let dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (dt > 0.05) dt = 0.05; // защита от скачков
      if (dt < 0) dt = 0;

      const state = G.state;
      game.update(dt);

      if (state) {
        G.world.draw(ctx, state);
      } else {
        // фон меню
        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawMenuBg(ctx, ts);
      }

      G.ui.update(dt);
      G.input.endFrame();
      requestAnimationFrame(game.loop);
    },
  };

  // анимированный фон меню
  function drawMenuBg(ctx, ts) {
    const t = ts / 1000;
    for (let i = 0; i < 26; i++) {
      const x = ((i * 313 + t * (20 + i * 7)) % (canvas.width + 200)) - 100;
      const y = (i * 197) % canvas.height;
      const r = 12 + (i * 37) % 40;
      const hue = (i * 47 + t * 20) % 360;
      ctx.fillStyle = `hsla(${hue},70%,60%,0.16)`;
      ctx.beginPath(); ctx.arc(x, y, r + Math.sin(t + i) * 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  G.game = game;

  // старт
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => game.init());
  else game.init();
})(window.G = window.G || {});
