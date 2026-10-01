// ============ ВИРУСЫ: 6 типов (п.6) ============
(function (G) {
  const U = G.U, C = G.C;

  const TYPES = [
    { id: 'normal',  name: 'Обычный вирус',        color: '#34d399', r: 40, spikes: 14, desc: 'Делит большую клетку' },
    { id: 'freeze',  name: 'Замораживающий',       color: '#7dd3fc', r: 36, spikes: 10, desc: 'Замедляет надолго' },
    { id: 'mass',    name: 'Массовый',             color: '#fb7185', r: 36, spikes: 12, desc: 'Отнимает массу' },
    { id: 'tele',    name: 'Телепорт-вирус',       color: '#a78bfa', r: 34, spikes: 10, desc: 'Переносит в другое место' },
    { id: 'chaos',   name: 'Хаотичный',            color: '#f472b6', r: 36, spikes: 16, desc: 'Случайно меняет размер' },
    { id: 'parasite',name: 'Паразитический',       color: '#facc15', r: 36, spikes: 12, desc: 'Выпускает NPC-паразитов' },
  ];

  const viruses = {
    TYPES,
    make(x, y, typeId) {
      const t = typeId ? TYPES.find(v => v.id === typeId) : U.pick(TYPES);
      return { x, y, type: t, r: t.r, spin: Math.random() * Math.PI * 2, t: 0 };
    },
    randomPos() {
      return { x: U.rand(150, C.WORLD_W - 150), y: U.rand(150, C.WORLD_H - 150) };
    },
    ensure(state, count) {
      while (state.viruses.length < count) {
        const p = viruses.randomPos();
        state.viruses.push(viruses.make(p.x, p.y));
      }
    },
    spawnAt(state, x, y, typeId) {
      state.viruses.push(viruses.make(x, y, typeId));
    },

    // столкновение клетки с вирусом. Возвращает true если вирус сработал (и погиб)
    onHit(state, org, cell, v) {
      const dmg = org.stat('dmgTaken');
      switch (v.type.id) {
        case 'normal':
          // делит только если клетка крупнее вируса
          if (cell.r > v.r * 0.95 && org.cells.length < C.MAX_CELLS) {
            org.split(cell, 0.9);
            org.addEff('recentSplit', 1, 1);
            G.world.shake(8);
            return true;
          }
          break;
        case 'freeze':
          org.addEff('slow', 5, 0.35);
          org.addEff('frozenVis', 5, 1);
          return true;
        case 'mass':
          org.hit(0.1 * dmg, v);
          org.addEff('recentSplit', 1, 1);
          return true;
        case 'tele': {
          const p = G.world.findSafeSpot(state, 200);
          cell.x = p.x; cell.y = p.y; cell.vx = cell.vy = 0;
          G.ui.toast('🌀 Телепорт-вирус!', '');
          return true;
        }
        case 'chaos': {
          const f = U.rand(0.7, 1.4);
          org.setMass(Math.max(C.MIN_MASS + 1, org.mass * f));
          G.ui.toast('🎲 Хаотичный вирус: размер изменён', '');
          return true;
        }
        case 'parasite': {
          for (let i = 0; i < 3; i++) {
            state.npcs.push(G.npc.make(U.rand(v.x - 80, v.x + 80), U.rand(v.y - 80, v.y + 80), 'parasite'));
          }
          return true;
        }
      }
      return false;
    }
  };

  G.viruses = viruses;
})(window.G = window.G || {});
