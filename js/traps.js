// ============ ЛОВУШКИ: 6 типов (п.1) — ставятся за массу ============
(function (G) {
  const U = G.U, C = G.C;

  const TYPES = [
    { id: 'spike',  key: '1', name: 'Шип',            icon: '🔺', cost: 8,  cd: 4,  life: 40, r: 15, color: '#f59e0b', desc: 'Отнимает 10% массы врага' },
    { id: 'glue',   key: '2', name: 'Клей',           icon: '🟡', cost: 10, cd: 6,  life: 25, r: 20, color: '#a3e635', desc: 'Замедляет на 3 сек' },
    { id: 'mine',   key: '3', name: 'Мина',           icon: '💣', cost: 15, cd: 8,  life: 45, r: 13, color: '#ef4444', desc: 'Взрыв при приближении' },
    { id: 'net',    key: '4', name: 'Сеть',           icon: '🕸️', cost: 12, cd: 7,  life: 20, r: 22, color: '#94a3b8', desc: 'Сковывает движение' },
    { id: 'puddle', key: '5', name: 'Липкая лужа',    icon: '🟤', cost: 20, cd: 10, life: 30, r: 34, color: '#78350f', desc: 'Замедляет всех внутри' },
    { id: 'fake',   key: '6', name: 'Фальшивая еда',  icon: '🔴', cost: 5,  cd: 3,  life: 60, r: 8,  color: '#f472b6', desc: 'Выглядит как еда, но отнимает массу' },
  ];

  const traps = {
    TYPES,
    byId: id => TYPES.find(t => t.id === id),

    place(state, org, typeId) {
      const t = traps.byId(typeId);
      if (!t || org.alive === false) return false;
      if ((org.trapCds[t.id] || 0) > 0) return false;
      if (org.mass < t.cost) { if (org.isPlayer) G.ui.toast(G.Tf('trap_low_mass', { cost: t.cost }), 'bad'); return false; }

      const cell = org.mainCell();
      const dx = org.aimX - cell.x, dy = org.aimY - cell.y;
      const d = Math.hypot(dx, dy) || 1;
      const px = cell.x + dx / d * Math.min(d, cell.r + t.r + 20);
      const py = cell.y + dy / d * Math.min(d, cell.r + t.r + 20);

      org.spendMass(t.cost);
      org.trapCds[t.id] = t.cd;
      state.traps.push({
        type: t, x: px, y: py, r: t.r, owner: org,
        life: t.life, maxLife: t.life, armed: 0.4, dead: false,
      });
      if (org.isPlayer) G.ui.toast(G.Tf('trap_placed', { icon: t.icon, name: G.T(t.name), cost: t.cost }), '');
      return true;
    },

    update(state, dt) {
      for (const tr of state.traps) {
        if (tr.dead) continue;
        tr.life -= dt;
        if (tr.armed > 0) tr.armed -= dt;
        if (tr.life <= 0) { tr.dead = true; continue; }
        if (tr.armed > 0) continue;

        for (const org of state.orgs) {
          if (!org.alive || org === tr.owner) continue;
          if (org.hasEff('ghost')) continue;
          const hit = org.cells.find(c => U.dist2(c.x, c.y, tr.x, tr.y) < (c.r + tr.r) * (c.r + tr.r));
          if (!hit) continue;
          traps.trigger(state, tr, org, hit);
          break;
        }
      }
      state.traps = state.traps.filter(t => !t.dead);
    },

    trigger(state, tr, org, cell) {
      const t = tr.type;
      const resist = org.stat('trapResist');
      switch (t.id) {
        case 'spike':
          org.hit(0.10 * resist, tr.owner);
          cell.fx += (cell.x - tr.x) * 3; cell.fy += (cell.y - tr.y) * 3;
          G.ui.hitFlash(org);
          break;
        case 'glue':
          // танк меньше страдает от замедления
          org.addEff('slow', 3, 0.45 + 0.25 * (1 - org.stat('trapResist')));
          break;
        case 'mine':
          G.hazards.explode(state, tr.x, tr.y, 150, 0.12, tr.owner);
          org.hit(0.08 * resist, tr.owner);
          cell.fx += (cell.x - tr.x) * 6; cell.fy += (cell.y - tr.y) * 6;
          G.world.shake(10);
          break;
        case 'net':
          org.addEff('root', 2.2, 1);
          org.addEff('netVis', 2.2, 1);
          break;
        case 'puddle':
          org.addEff('slow', 2.5, 0.5);
          break;
        case 'fake': {
          // съел как еду — потерял массу
          const lose = Math.min(org.mass * 0.04, 25);
          org.setMass(Math.max(C.MIN_MASS + 1, org.mass - lose));
          org.addEff('slow', 1.5, 0.6);
          if (org.isPlayer) G.ui.toast(G.Tf('trap_hit', { lose: Math.round(lose) }), 'bad');
          if (tr.owner && tr.owner.isPlayer) G.ui.toast(G.Tf('trap_owner_hit', { name: tr.owner.name }), 'good');
          break;
        }
      }
      tr.dead = true;
      // засчитываем уничтожение ловушки для контрактов владельца жертвы? — см. contracts.onDestroyTrap
      G.contracts.onDestroyTrap(org);
      G.world.spark(tr.x, tr.y, t.color, 12);
    },

    // ловушки владельца видны только ему и врагам? — рисуем всех ( Gameplay )
    countOf(state, org) { return state.traps.filter(t => t.owner === org).length; },
  };

  G.traps = traps;
})(window.G = window.G || {});
