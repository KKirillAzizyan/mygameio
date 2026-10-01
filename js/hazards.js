// ============ ОПАСНОСТИ НА КАРТЕ (п.4): 9 типов ============
(function (G) {
  const U = G.U, C = G.C;

  const TYPES = {
    meteor:      { name: 'Метеорит',           color: '#f97316', r: 26 },
    moverSpike:  { name: 'Движущийся шип',     color: '#ef4444', r: 30 },
    electric:    { name: 'Электрическая зона', color: '#38bdf8', r: 130 },
    blackhole:   { name: 'Чёрная дыра',        color: '#7c3aed', r: 190 },
    acid:        { name: 'Кислотная область',  color: '#84cc16', r: 140 },
    volcano:     { name: 'Вулканическая зона', color: '#dc2626', r: 120 },
    movingWall:  { name: 'Движущаяся стена',   color: '#64748b', w: 260, h: 44 },
    current:     { name: 'Зона течения',       color: '#22d3ee', w: 320, h: 320 },
    closed:      { name: 'Закрытая зона',      color: '#475569', w: 500, h: 500 },
  };

  const hazards = {
    TYPES,

    spawn(state, kind, x, y, opts = {}) {
      const t = TYPES[kind];
      const h = {
        kind, x, y, r: t.r || 0, w: t.w || 0, h: t.h || 0,
        color: t.color, life: opts.life || 60, maxLife: opts.life || 60,
        t: 0, tick: 0, dead: false,
        vx: opts.vx || 0, vy: opts.vy || 0,
        dir: opts.dir || U.rand(0, Math.PI * 2),
        patrolA: opts.patrolA || null, patrolB: opts.patrolB || null, goingB: false,
        ownerId: opts.ownerId !== undefined ? opts.ownerId : null,
        ...opts,
      };
      state.hazards.push(h);
      return h;
    },

    // случайная точка, избегая центра игрока — для спавна событий
    randomSpot(state) {
      for (let i = 0; i < 20; i++) {
        const p = { x: U.rand(300, C.WORLD_W - 300), y: U.rand(300, C.WORLD_H - 300) };
        const pl = state.player;
        if (!pl || !pl.alive || U.dist(p.x, p.y, pl.mainCell().x, pl.mainCell().y) > 900) return p;
      }
      return { x: U.rand(300, C.WORLD_W - 300), y: U.rand(300, C.WORLD_H - 300) };
    },

    update(state, dt) {
      for (const h of state.hazards) {
        h.t += dt;
        h.life -= dt;
        if (h.life <= 0) { h.dead = true; continue; }

        switch (h.kind) {
          case 'meteor':
            h.x += h.vx * dt; h.y += h.vy * dt;
            if (h.x < -60 || h.y < -60 || h.x > C.WORLD_W + 60 || h.y > C.WORLD_H + 60) h.dead = true;
            break;
          case 'moverSpike':
            if (h.patrolA && h.patrolB) {
              const target = h.goingB ? h.patrolB : h.patrolA;
              const d = U.dist(h.x, h.y, target.x, target.y);
              if (d < 12) h.goingB = !h.goingB;
              else { h.vx = (target.x - h.x) / d * 160; h.vy = (target.y - h.y) / d * 160; }
            }
            h.x += h.vx * dt; h.y += h.vy * dt;
            break;
          case 'movingWall': {
            const target = h.goingB ? h.patrolB : h.patrolA;
            if (target) {
              const d = U.dist(h.x, h.y, target.x, target.y);
              if (d < 10) h.goingB = !h.goingB;
              else { h.x += (target.x - h.x) / d * 90 * dt; h.y += (target.y - h.y) / d * 90 * dt; }
            }
            break;
          }
          case 'volcano': {
            h.tick -= dt;
            if (h.tick <= 0) {
              h.tick = 2.6;
              for (let i = 0; i < 7; i++) {
                const a = U.rand(0, Math.PI * 2);
                state.projectiles.push({
                  kind: 'fire', owner: null, volcano: h,
                  x: h.x, y: h.y, vx: Math.cos(a) * U.rand(180, 330), vy: Math.sin(a) * U.rand(180, 330),
                  r: 10, life: 2.4, dmg: 0.03, color: '#f97316',
                });
              }
              G.world.spark(h.x, h.y, '#f97316', 20);
            }
            break;
          }
        }
      }

      state.hazards = state.hazards.filter(h => !h.dead);

      // контактные зоны: каждый тик
      hazards.zoneTick(state, dt);
      hazards.contact(state, dt);
      hazards.applyForces(state, dt);
    },

    zoneTick(state, dt) {
      hazards._zt = (hazards._zt || 0) + dt;
      if (hazards._zt < 0.5) return;
      hazards._zt = 0;

      const targets = [];
      for (const o of state.orgs) if (o.alive) targets.push(o);
      for (const n of state.npcs) targets.push(n);

      for (const h of state.hazards) {
        for (const org of targets) {
          const cells = org.cells || [org];
          for (const c of cells) {
            const inZone = (h.kind === 'electric' || h.kind === 'acid' || h.kind === 'closed') &&
              U.dist2(c.x, c.y, h.x, h.y) < h.r * h.r;
            if (!inZone) continue;
            if (org.cells && org.hasEff && org.hasEff('ghost')) continue;
            if (h.kind === 'electric') {
              hazards.damage(state, org, c, 0.03, h);
              G.world.spark(c.x, c.y, '#7dd3fc', 4);
            } else if (h.kind === 'acid') {
              hazards.damage(state, org, c, 0.025, h);
            } else if (h.kind === 'closed') {
              hazards.damage(state, org, c, 0.04, h);
            }
          }
        }
      }
    },

    // прямой контакт: метеориты, шипи, стены — бьют при касании
    contact(state, dt) {
      for (const h of state.hazards) {
        if (h.dead) continue;
        if (!['meteor', 'moverSpike', 'movingWall'].includes(h.kind)) continue;
        for (const org of state.orgs) {
          if (!org.alive) continue;
          if (org.hasEff('ghost')) continue;
          for (const c of org.cells) {
            let hit = false;
            if (h.kind === 'movingWall') {
              const rect = { x: h.x - h.w / 2, y: h.y - h.h / 2, w: h.w, h: h.h };
              hit = !!U.circleRect(c.x, c.y, c.r, rect.x, rect.y, rect.w, rect.h);
            } else {
              hit = U.dist2(c.x, c.y, h.x, h.y) < (c.r + h.r) ** 2;
            }
            if (hit) {
              hazards.damage(state, org, c, h.kind === 'meteor' ? 0.08 : 0.04, h);
              const a = U.angle(h.x, h.y, c.x, c.y);
              c.fx += Math.cos(a) * 500; c.fy += Math.sin(a) * 500;
              if (h.kind === 'meteor') {
                hazards.explode(state, h.x, h.y, 140, 0.05, null);
                h.dead = true;
                G.world.shake(9);
              }
            }
          }
        }
      }
    },

    applyForces(state, dt) {
      for (const h of state.hazards) {
        if (h.kind !== 'blackhole' && h.kind !== 'current') continue;
        const targets = [];
        for (const o of state.orgs) if (o.alive) targets.push(o);
        for (const n of state.npcs) targets.push(n);

        for (const org of targets) {
          if (org.cells && org.hasEff && org.hasEff('ghost')) continue;
          const cells = org.cells || [org];
          for (const c of cells) {
            if (h.kind === 'blackhole') {
              const d = U.dist(c.x, c.y, h.x, h.y);
              if (d < h.r && d > 1) {
                const pull = 900 * (1 - d / h.r) + 200;
                c.fx += (h.x - c.x) / d * pull * dt * 60 * 0.1;
                c.fy += (h.y - c.y) / d * pull * dt * 60 * 0.1;
                if (d < h.r * 0.35) hazards.damage(state, org, c, 0.015, h);
              }
            } else if (h.kind === 'current') {
              if (Math.abs(c.x - h.x) < h.w / 2 && Math.abs(c.y - h.y) < h.h / 2) {
                c.fx += Math.cos(h.dir) * 420 * dt;
                c.fy += Math.sin(h.dir) * 420 * dt;
              }
            }
          }
        }
      }
    },

    // доля массы
    damage(state, org, cell, frac, src) {
      if (org.hasEff && org.hasEff('shield')) { G.world.spark(cell.x, cell.y, '#38bdf8', 5); return; }
      const mult = org.stat ? org.stat('dmgTaken') : 1;
      const lose = Math.min(org.mass * frac * mult, cell.mass * 0.6);
      cell.mass = Math.max(1, cell.mass - lose);
      if (org.isPlayer) { G.ui.hitFlash(org); G.world.shake(3); }
      if (org.cells && org.totalMass() < C.MIN_MASS) org.die(src);
    },

    // взрыв: урон + отброс всем вокруг
    explode(state, x, y, radius, frac, owner) {
      const targets = [];
      for (const o of state.orgs) if (o.alive) targets.push(o);
      for (const n of state.npcs) targets.push(n);
      for (const org of targets) {
        const cells = org.cells || [org];
        for (const c of cells) {
          const d = U.dist(c.x, c.y, x, y);
          if (d > radius + c.r) continue;
          if (org.hasEff && org.hasEff('ghost')) continue;
          hazards.damage(state, org, c, frac, owner);
          const a = U.angle(x, y, c.x, c.y);
          const push = 700 * (1 - Math.min(d / radius, 1));
          c.fx += Math.cos(a) * push; c.fy += Math.sin(a) * push;
        }
      }
      G.world.spark(x, y, '#fb923c', 26);
      G.world.ring(x, y, radius, '#fb923c');
    },

    // прямоугольные помехи для движения (вместе с постройками)
    rectBlockers(state) {
      const out = [];
      for (const h of state.hazards) {
        if (h.kind === 'movingWall' || h.kind === 'closed') {
          out.push({ x: h.x - h.w / 2, y: h.y - h.h / 2, w: h.w, h: h.h, src: h });
        }
      }
      return out;
    },
  };

  G.hazards = hazards;
})(window.G = window.G || {});
