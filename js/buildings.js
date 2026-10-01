// ============ СТРОИТЕЛЬСТВО (п.11): стена, барьер, турель, портал ============
(function (G) {
  const U = G.U, C = G.C;

  const TYPES = [
    { id: 'wall',    key: '7', name: 'Стена',   icon: '🧱', costFrac: 0.10, minMass: 200, hp: 260, w: 190, h: 36, desc: 'Блокирует путь врагам' },
    { id: 'barrier', key: '8', name: 'Барьер',  icon: '🚧', costFrac: 0.12, minMass: 300, hp: 180, w: 130, h: 30, desc: 'Узкий барьер, тормозит всех' },
    { id: 'turret',  key: '9', name: 'Турель',  icon: '🔫', costFrac: 0.15, minMass: 400, hp: 150, r: 26, rate: 1.4, dmg: 0.035, desc: 'Стреляет по врагам' },
    { id: 'portal',  key: '0', name: 'Портал',  icon: '🌀', costFrac: 0.10, minMass: 250, hp: 120, r: 34, desc: 'Парные телепорты' },
  ];

  const buildings = {
    TYPES,
    byId: id => TYPES.find(t => t.id === id),

    place(state, org, typeId) {
      const t = buildings.byId(typeId);
      if (!t || !org.alive) return false;
      const cost = Math.ceil(org.mass * t.costFrac);
      if (org.mass < t.minMass) {
        if (org.isPlayer) G.ui.toast('Нужно минимум ' + t.minMass + ' массы для: ' + t.name, 'bad');
        return false;
      }
      if ((org.buildCds[t.id] || 0) > 0) return false;

      const cell = org.mainCell();
      const dx = org.aimX - cell.x, dy = org.aimY - cell.y;
      const d = Math.hypot(dx, dy) || 1;
      const px = cell.x + dx / d * Math.min(d, cell.r + 80);
      const py = cell.y + dy / d * Math.min(d, cell.r + 80);

      if (t.id === 'portal') {
        if (!org.pendingPortal) {
          org.pendingPortal = { x: px, y: py };
          org.buildCds[t.id] = 6;
          if (org.isPlayer) G.ui.toast('🌀 Первый портал поставлен — поставьте второй в радиусе 400 (списуется масса)', '');
          return true;
        }
        const a = org.pendingPortal;
        if (U.dist(a.x, a.y, px, py) > 400) {
          if (org.isPlayer) G.ui.toast('🌀 Второй портал слишком далеко — поставьте его рядом с первым', 'bad');
          return false; // первая точка сохраняется, масса не списывается
        }
        org.spendMass(cost);
        org.buildCds[t.id] = 6;
        const b0 = { type: t, owner: org, kind: 'portal', x: a.x, y: a.y, r: t.r, hp: t.hp, maxHp: t.hp, pair: null, t: 0 };
        const b1 = { type: t, owner: org, kind: 'portal', x: px, y: py, r: t.r, hp: t.hp, maxHp: t.hp, pair: b0, t: 0 };
        b0.pair = b1;
        state.buildings.push(b0, b1);
        org.pendingPortal = null;
        if (org.isPlayer) G.ui.toast('🌀 Порталы соединены! (−' + cost + ' массы)', 'good');
        return true;
      }

      org.spendMass(cost);
      org.buildCds[t.id] = 6;

      const b = {
        type: t, owner: org, kind: t.id,
        x: px, y: py, r: t.r || 0,
        w: t.w || 0, h: t.h || 0,
        hp: t.hp, maxHp: t.hp, t: 0, cd: 0,
        dead: false,
      };
      state.buildings.push(b);
      if (org.isPlayer) G.ui.toast(t.icon + ' ' + t.name + ' построена (−' + cost + ' массы)', 'good');
      return true;
    },

    update(state, dt) {
      for (const b of state.buildings) {
        b.t += dt;
        if (b.hp <= 0) { b.dead = true; continue; }

        if (b.kind === 'turret') {
          b.cd -= dt;
          if (b.cd <= 0) {
            const target = buildings.nearestEnemy(state, b, 620);
            if (target) {
              b.cd = b.type.rate;
              const ang = U.angle(b.x, b.y, target.x, target.y);
              b.aim = ang;
              state.projectiles.push({
                kind: 'turret', owner: b.owner,
                x: b.x + Math.cos(ang) * b.r, y: b.y + Math.sin(ang) * b.r,
                vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520,
                r: 7, life: 1.6, dmg: b.type.dmg, color: '#fbbf24',
              });
            }
          }
        }

        if (b.kind === 'portal') {
          b.t = (b.t + dt) % 1000;
          for (const org of state.orgs) {
            if (!org.alive) continue;
            if (org.portalCd > 0) continue;
            for (const c of org.cells) {
              if (b.pair && U.dist2(c.x, c.y, b.x, b.y) < (c.r + b.r) * (c.r + b.r)) {
                // телепорт к паре
                const ox = c.x - b.x, oy = c.y - b.y;
                c.x = b.pair.x + ox; c.y = b.pair.y + oy;
                c.fx = c.fy = 0;
                org.portalCd = 3;
                G.world.spark(b.x, b.y, '#a78bfa', 14);
                G.world.spark(b.pair.x, b.pair.y, '#a78bfa', 14);
                if (org.isPlayer) G.ui.toast('🌀 Телепорт!', '');
                break;
              }
            }
          }
        }
      }
      state.buildings = state.buildings.filter(b => !b.dead);
    },

    nearestEnemy(state, b, range) {
      let best = null, bd = range * range;
      for (const org of state.orgs) {
        if (!org.alive || org === b.owner) continue;
        for (const c of org.cells) {
          if (org.hasEff('ghost')) continue;
          const d2 = U.dist2(b.x, b.y, c.x, c.y);
          if (d2 < bd) { bd = d2; best = c; }
        }
      }
      return best;
    },

    // препятствия для движения: стены и барьеры. ghost проходит сквозь всё.
    blockers(state) {
      return state.buildings.filter(b => (b.kind === 'wall' || b.kind === 'barrier') && b.hp > 0);
    },

    onHitByCell(state, org, cell, dt) {
      // клетки вгрызаются в турели (стены обрабатываются в world.collideWorld)
      for (const b of state.buildings) {
        if (b.hp <= 0 || b.owner === org) continue;
        if (b.kind === 'turret') {
          if (U.dist2(cell.x, cell.y, b.x, b.y) < (cell.r + b.r) ** 2) b.hp -= cell.r * dt * 1.2;
        }
      }
    },
  };

  G.buildings = buildings;
})(window.G = window.G || {});
