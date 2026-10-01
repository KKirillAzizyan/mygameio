// ============ АКТИВНЫЕ СПОСОБНОСТИ (п.2) + призрак (п.10) ============
// Тратят энергию. Максимум энергии растёт с массой.
(function (G) {
  const U = G.U, C = G.C;

  const LIST = [
    { id: 'dash',      key: 'Q', name: 'Рывок',        icon: '💨', cost: 15, cd: 4,   dur: 0.4,  desc: 'Быстро перемещает клетку вперёд' },
    { id: 'shield',    key: 'E', name: 'Щит',          icon: '🛡️', cost: 25, cd: 12,  dur: 2.5,  desc: 'Защищает от поглощения' },
    { id: 'split',     key: 'R', name: 'Разделение',   icon: '✂️', cost: 30, cd: 10,  dur: 0,    desc: 'Несколько быстрых клеток' },
    { id: 'absorb',    key: 'F', name: 'Поглощение',   icon: '🌀', cost: 20, cd: 15,  dur: 6,    desc: 'Следующая цель даёт +40% массы' },
    { id: 'teleport',  key: 'C', name: 'Телепорт',     icon: '🔯', cost: 40, cd: 25,  dur: 0,    desc: 'Перенос в безопасную точку' },
    { id: 'freeze',    key: 'V', name: 'Заморозка',    icon: '❄️', cost: 35, cd: 18,  dur: 2.5,  desc: 'Замедляет ближайших игроков' },
    { id: 'ghost',     key: 'X', name: 'Призрак',      icon: '👻', cost: 30, cd: 20,  dur: 4,    desc: 'Нельзя съесть, проход сквозь стены' },
  ];

  const abilities = {
    LIST,
    byId: id => LIST.find(a => a.id === id),

    use(state, org, id) {
      const a = abilities.byId(id);
      if (!a || !org.alive) return false;
      if ((org.cds[id] || 0) > 0) return false;
      const cost = org.stat('abilityCost') !== undefined ? a.cost * org.stat('abilityCost') : a.cost;
      if (org.energy < cost) {
        if (org.isPlayer) G.ui.toast(G.Tf('no_energy', { name: G.T(a.name), cost }), 'bad');
        return false;
      }
      org.energy -= cost;
      org.cds[id] = a.cd;

      const cell = org.mainCell();
      switch (id) {
        case 'dash': {
          const ang = U.angle(cell.x, cell.y, org.aimX, org.aimY);
          cell.fx += Math.cos(ang) * 1500;
          cell.fy += Math.sin(ang) * 1500;
          org.addEff('dashvis', 0.4, 1);
          G.world.spark(cell.x, cell.y, '#38bdf8', 10);
          break;
        }
        case 'shield':
          org.addEff('shield', a.dur, 1);
          break;
        case 'split':
          org.abilitySplit();
          break;
        case 'absorb':
          org.addEff('absorb', a.dur, 1);
          break;
        case 'teleport': {
          const p = G.world.findSafeSpot(state, 350);
          for (const c of org.cells) { c.x = p.x + U.rand(-40, 40); c.y = p.y + U.rand(-40, 40); c.vx = c.vy = 0; c.fx = c.fy = 0; }
          G.world.ring(p.x, p.y, 120, '#a78bfa');
          if (org.isPlayer) G.ui.toast('🌀 Телепорт!', '');
          break;
        }
        case 'freeze': {
          for (const other of state.orgs) {
            if (other === org || !other.alive) continue;
            for (const c of other.cells) {
              if (U.dist2(c.x, c.y, cell.x, cell.y) < 550 * 550) {
                other.addEff('slow', a.dur, 0.25);
                other.addEff('frozenVis', a.dur, 1);
                break;
              }
            }
          }
          for (const n of state.npcs) {
            if (U.dist2(n.x, n.y, cell.x, cell.y) < 550 * 550) n.type = { ...n.type, speed: n.type.speed * 0.3 };
          }
          G.world.ring(cell.x, cell.y, 550, '#7dd3fc');
          break;
        }
        case 'ghost':
          org.addEff('ghost', a.dur, 1);
          break;
      }
      if (org.isPlayer) G.ui.toast(a.icon + ' ' + G.T(a.name), 'good');
      return true;
    },
  };

  G.abilities = abilities;
})(window.G = window.G || {});
