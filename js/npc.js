// ============ NPC-СУЩЕСТВА (п.12): бактерии, хищники, паразиты, боссы ============
(function (G) {
  const U = G.U, C = G.C;

  const TYPES = {
    bacteria: { name: 'Бактерия',   color: '#22c55e', mass: 3,   speed: 40,  ai: 'wander',  r0: 10 },
    predator: { name: 'Хищник',     color: '#ef4444', mass: 70,  speed: 120, ai: 'hunter',  r0: 32 },
    parasite: { name: 'Паразит',    color: '#eab308', mass: 14,  speed: 160, ai: 'attach',  r0: 24 },
    boss:     { name: 'Босс',       color: '#a21caf', mass: 2200,speed: 55,  ai: 'boss',    r0: 250 },
  };

  const npc = {
    TYPES,

    make(x, y, kind) {
      const t = TYPES[kind];
      const m = kind === 'bacteria' ? U.rand(2, 4) : t.mass * U.rand(0.85, 1.15);
      return {
        kind, type: t, name: t.name + ' ' + U.randInt(1, 99),
        x, y, vx: 0, vy: 0, fx: 0, fy: 0,
        mass: m, r: U.massToR(m), color: t.color,
        alive: true, aiT:  0, dirX: 0, dirY: 0,
        attach: null, hp: kind === 'boss' ? 1 : 0,
        wanderA: U.rand(0, Math.PI * 2),
      };
    },

    ensure(state) {
      const count = (k, n) => { let c = 0; for (const p of state.npcs) if (p.kind === k) c++; return c; };
      const spawn = (k) => { const p = G.world.findSafeSpot(state, 350); state.npcs.push(npc.make(p.x, p.y, k)); };

      while (count('bacteria') < C.NPC_BACTERIA) spawn('bacteria');
      while (count('predator') < C.NPC_PREDATOR) spawn('predator');
      while (count('parasite') < C.NPC_PARASITE) spawn('parasite');
      if (state.phase >= 3) while (count('boss') < C.NPC_BOSS) spawn('boss');
    },

    update(state, dt) {
      for (const n of state.npcs) {
        if (!n.alive) continue;
        n.r = U.massToR(n.mass);
        n.aiT -= dt;

        if (n.kind === 'bacteria') {
          n.wanderA += U.rand(-1, 1) * dt;
          n.dirX = Math.cos(n.wanderA); n.dirY = Math.sin(n.wanderA);
        } else if (n.kind === 'predator' || n.kind === 'boss') {
          if (n.aiT <= 0) { n.aiT = 0.4; npc.think(state, n); }
        } else if (n.kind === 'parasite') {
          if (n.aiT <= 0) { n.aiT = 0.5; npc.thinkParasite(state, n); }
        }

        const spd = n.type.speed * (n.kind === 'boss' ? 1 : 1) * (n.mass > 0 ? Math.pow(70 / Math.max(n.mass, 20), 0.1) : 1);
        if (n.attach) {
          // висит на клетке
          const host = n.attach;
          if (!host.org || !host.org.alive || host.org.cells.indexOf(host.cell) < 0) {
            n.attach = null;
          } else {
            const c = host.cell;
            n.x = c.x + Math.cos(n.attachA) * (c.r + n.r * 0.4);
            n.y = c.y + Math.sin(n.attachA) * (c.r + n.r * 0.4);
            n.vx = c.vx; n.vy = c.vy;
            // качает массу
            const drain = Math.min(c.mass * 0.012 * dt, n.mass * 0.4 * dt + 0.5 * dt);
            c.mass -= drain; n.mass += drain;
            n.attachT -= dt;
            if (n.attachT <= 0) { n.attach = null; }
            continue;
          }
        }

        n.vx = U.lerp(n.vx, n.dirX * spd, 1 - Math.exp(-6 * dt));
        n.vy = U.lerp(n.vy, n.dirY * spd, 1 - Math.exp(-6 * dt));
        n.vx += n.fx * dt; n.vy += n.fy * dt;
        n.fx *= Math.exp(-4 * dt); n.fy *= Math.exp(-4 * dt);
        n.x += n.vx * dt; n.y += n.vy * dt;

        // границы
        n.x = U.clamp(n.x, n.r, C.WORLD_W - n.r);
        n.y = U.clamp(n.y, n.r, C.WORLD_H - n.r);
        if (n.mass < (n.kind === 'bacteria' ? 1 : 5)) n.alive = false;
      }
      state.npcs = state.npcs.filter(n => n.alive);
    },

    think(state, n) {
      let prey = null, pd = Infinity, threat = null, td = Infinity;
      const all = [];
      for (const o of state.orgs) if (o.alive) all.push(o);

      for (const org of all) {
        for (const c of org.cells) {
          const d = U.dist(n.x, n.y, c.x, c.y);
          const range = n.kind === 'boss' ? 700 : 520;
          if (d < range) {
            if (c.mass < n.mass * 0.85 && d < pd) { pd = d; prey = c; }
            else if (c.mass > n.mass * 1.15 && d < td) { td = d; threat = c; }
          }
        }
      }
      // босс не боится никого кроме гигантов
      if (threat && n.kind !== 'boss') {
        const a = U.angle(threat.x, threat.y, n.x, n.y);
        n.dirX = Math.cos(a); n.dirY = Math.sin(a);
      } else if (prey) {
        const a = U.angle(n.x, n.y, prey.x, prey.y);
        n.dirX = Math.cos(a); n.dirY = Math.sin(a);
      } else {
        n.dirX = Math.cos(n.wanderA += U.rand(-1, 1)); n.dirY = Math.sin(n.wanderA);
      }
    },

    thinkParasite(state, n) {
      if (n.attach) return;
      let best = null, bd = 620;
      for (const org of state.orgs) {
        if (!org.alive) continue;
        for (const c of org.cells) {
          if (c.mass < n.mass * 1.5) continue; // цепляемся только к большим
          const d = U.dist(n.x, n.y, c.x, c.y);
          if (d < bd) { bd = d; best = c; }
        }
      }
      if (best) {
        const a = U.angle(n.x, n.y, best.x, best.y);
        n.dirX = Math.cos(a); n.dirY = Math.sin(a);
        if (bd < best.r + n.r * 0.6) {
          n.attach = { cell: best, org: state.orgs.find(o => o.cells.includes(best)) };
          n.attachA = U.rand(0, Math.PI * 2);
          n.attachT = 7;
        }
      } else {
        n.dirX = Math.cos(n.wanderA += U.rand(-1, 1)); n.dirY = Math.sin(n.wanderA);
      }
    },

    // NPC едят еду; возвращает массив съеденных
    eatFood(state, n) {
      const eatR = n.r * 0.9;
      for (let i = 0; i < state.food.length; i++) {
        const f = state.food[i];
        if (U.dist2(n.x, n.y, f.x, f.y) < (eatR + f.r) ** 2) {
          n.mass += f.type.mass;
          state.food.splice(i, 1);
          return true;
        }
      }
      return false;
    },
  };

  G.npc = npc;
})(window.G = window.G || {});
