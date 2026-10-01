// ============ БОТЫ — ИИ противников ============
(function (G) {
  const U = G.U, C = G.C;

  const NAMES = [
    'Бактерия', 'Амёба', 'Пузырёк', 'Клетка', 'Микроб', 'Вирус', 'Плазма',
    'Дракон', 'Охотник', 'Тень', 'Космо', 'Ластик', 'Гриб', 'Слизень',
    'Ядро', 'Мутант', 'Титан', 'Комета', 'Призрак', 'Шип', 'Вихрь',
    'Астероид', 'Люмен', 'Зефир', 'Кобра', 'Нимб', 'Осколок', 'Персик',
  ];

  const bots = {
    spawn(state) {
      for (let i = 0; i < C.BOT_COUNT; i++) bots.spawnOne(state);
    },

    spawnOne(state) {
      const p = G.world.findSafeSpot(state, 300);
      const org = new G.Organism(state, {
        name: U.pick(NAMES) + '-' + U.randInt(1, 99),
        x: p.x, y: p.y,
        mass: U.rand(C.START_MASS, C.START_MASS * 3),
        isPlayer: false,
      });
      org.aiT = U.rand(0, 0.3);
      state.bots.push(org);
      state.orgs.push(org);
      return org;
    },

    update(state, dt) {
      for (const bot of state.bots) {
        if (!bot.alive) {
          bot.respawnT -= dt;
          if (bot.respawnT <= 0) {
            // респавн: обновляем на месте мёртвого
                const p = G.world.findSafeSpot(state, 350);
            bot.cells = [G.newCell(p.x, p.y, C.START_MASS)];
            bot.alive = true;
            bot.name = U.pick(NAMES) + '-' + U.randInt(1, 99);
            bot.color = U.hexHsl(U.rand(0, 360), 70, 55);
            bot.eff = {}; bot.cds = {}; bot.trapCds = {}; bot.buildCds = {};
            bot.evo = { predator: 0, tank: 0, hunter: 0, parasite: 0, mutant: 0 };
            bot.evoTotal = 0; bot.milestoneIdx = 0;
            bot.king = false; bot.combo = 0; bot.kills = 0;
            bot.energy = bot.maxEnergy();
            bot.spawnT = 3;
            bot.attach = null;
          }
          continue;
        }

        bot.aiT -= dt;
        if (bot.aiT <= 0) {
          bot.aiT = U.rand(0.2, 0.35);
          bots.think(state, bot);
        }
        // боты эволюционируют автоматически (выбор случайного пути)
        G.evo.check(state, bot);
      }
    },

    think(state, bot) {
      const mc = bot.mainCell();
      let flee = null, fd = Infinity;
      let prey = null, pd = Infinity;
      let hazard = null, hd = Infinity;
      let food = null, fwd = Infinity;

      // угрозы: кто заметно больше
      const scan = (x, y, mass, isNpc) => {
        const d = U.dist(mc.x, mc.y, x, y);
        if (mass > bot.mass * 1.2 && d < 520 && d < fd) { fd = d; flee = { x, y }; }
        if (mass < bot.mass * 0.72 && d < 700 && d < pd) { pd = d; prey = { x, y, mass }; }
      };
      for (const o of state.orgs) {
        if (o === bot || !o.alive || o.hasEff('ghost')) continue;
        for (const c of o.cells) scan(c.x, c.y, c.mass);
      }
      for (const n of state.npcs) {
        if (n.kind === 'bacteria') continue;
        scan(n.x, n.y, n.mass);
      }

      // опасности
      for (const h of state.hazards) {
        if (!['blackhole', 'acid', 'electric', 'closed', 'volcano', 'meteor', 'moverSpike', 'movingWall'].includes(h.kind)) continue;
        const d = U.dist(mc.x, mc.y, h.x, h.y);
        const zone = (h.w ? Math.max(h.w, h.h) / 2 : h.r) + 220;
        if (d < zone && d < hd) { hd = d; hazard = { x: h.x, y: h.y }; }
      }

      // ловушки врагов — обходим
      for (const tr of state.traps) {
        if (tr.owner === bot) continue;
        const d = U.dist(mc.x, mc.y, tr.x, tr.y);
        if (d < 160 && tr.type.id === 'mine') { flee = { x: tr.x, y: tr.y }; fd = d; break; }
      }

      if (flee) {
        const a = U.angle(flee.x, flee.y, mc.x, mc.y);
        bot.aimX = mc.x + Math.cos(a) * 700;
        bot.aimY = mc.y + Math.sin(a) * 700;
        // рывок при побеге
        if (bot.mass > 60 && Math.random() < 0.25) G.abilities.use(state, bot, 'dash');
        return;
      }
      if (hazard) {
        const a = U.angle(hazard.x, hazard.y, mc.x, mc.y);
        bot.aimX = mc.x + Math.cos(a) * 600;
        bot.aimY = mc.y + Math.sin(a) * 600;
        return;
      }
      if (prey) {
        bot.aimX = prey.x; bot.aimY = prey.y;
        // шанс разделиться на добычу
        if (prey.mass && bot.mass > prey.mass * 2.4 && pd < mc.r * 2.2 && bot.canSplit() && Math.random() < 0.5) {
          bot.playerSplit();
        }
        return;
      }

      // зона короля — иногда стремимся туда
      if (G.king.zone && bot.mass > 80 && Math.random() < 0.3) {
        bot.aimX = G.king.zone.x; bot.aimY = G.king.zone.y;
        return;
      }

      // ближайшая еда (предпочитаем золотую/мутагенную)
      let bestScore = -Infinity;
      for (const f of state.food) {
        const d = U.dist2(mc.x, mc.y, f.x, f.y);
        if (d > 800 * 800) continue;
        let score = -Math.sqrt(d);
        if (f.type.id === 'gold') score += 400;
        if (f.type.id === 'heal' && bot.mass < 120) score += 200;
        if (f.type.id === 'boom') score -= 150;
        if (score > bestScore) { bestScore = score; food = f; }
      }
      if (food) { bot.aimX = food.x; bot.aimY = food.y; return; }

      // блуждание
      if (!bot.wanderT || bot.wanderT <= 0) {
        bot.wanderT = U.rand(2, 5);
        bot.aimX = U.rand(200, C.WORLD_W - 200);
        bot.aimY = U.rand(200, C.WORLD_H - 200);
      }
      bot.wanderT -= 0.3;
    },
  };

  G.bots = bots;
})(window.G = window.G || {});
