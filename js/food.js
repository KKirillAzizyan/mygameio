// ============ ЕДА: 6 типов (п.5) ============
(function (G) {
  const U = G.U, C = G.C;

  // types: id, name, icon, color, mass, weight (частота), effect
  const TYPES = [
    { id: 'normal', name: 'Обычная масса', color: '#4ade80', mass: 1,  weight: 70, r: 7 },
    { id: 'energy', name: 'Энергия',       color: '#38bdf8', mass: 1,  weight: 10, r: 8, eff: 'speed' },
    { id: 'gold',   name: 'Золотая масса', color: '#fbbf24', mass: 10, weight: 7,  r: 11 },
    { id: 'muta',   name: 'Мутационная',   color: '#c084fc', mass: 2,  weight: 5,  r: 9, eff: 'muta' },
    { id: 'boom',   name: 'Взрывоопасная', color: '#f87171', mass: 1,  weight: 4,  r: 9, eff: 'boom' },
    { id: 'heal',   name: 'Лечебная',      color: '#f1f5f9', mass: 3,  weight: 4,  r: 9, eff: 'heal' },
  ];
  const TOTAL_W = TYPES.reduce((s, t) => s + t.weight, 0);

  function rollType() {
    let r = Math.random() * TOTAL_W;
    for (const t of TYPES) { r -= t.weight; if (r <= 0) return t; }
    return TYPES[0];
  }

  const foods = {
    TYPES,
    make(x, y) {
      const t = rollType();
      return { x, y, type: t, r: t.r, hue: Math.random() * 360 };
    },
    randomPos() {
      return { x: U.rand(30, C.WORLD_W - 30), y: U.rand(30, C.WORLD_H - 30) };
    },
    ensure(state) {
      while (state.food.length < C.FOOD_COUNT) {
        const p = foods.randomPos();
        state.food.push(foods.make(p.x, p.y));
      }
    },
    // съедание: возвращает массу и применяет эффекты
    eat(state, org, f) {
      let gain = f.type.mass;
      // золотая минута (событие)
      if (state.event && state.event.id === 'golden') gain *= 3;
      if (state.king && org.king) gain *= 1.25;

      switch (f.type.id) {
        case 'energy':
          org.addEff('speed', 5, 1.4);
          break;
        case 'muta': {
          const roll = Math.random();
          if (roll < 0.25) org.addEff('shield', 3, 1);
          else if (roll < 0.5) org.addEff('speed', 4, 1.5);
          else if (roll < 0.7) org.addEff('absorb', 6, 1);
          else if (roll < 0.85) { org.energy = org.maxEnergy(); G.ui.toast('⚡ Энергия восстановлена!', 'good'); }
          else { org.addEff('massregen', 8, 2); }
          org.addEff('mutaglow', 3, 1);
          break;
        }
        case 'boom': {
          // рискованно: взрыв отталкивает и бьёт всех вокруг, едящий получает бонус
          gain = 12;
          G.hazards.explode(state, f.x, f.y, 130, 0.06, null);
          org.hit(0.04, null); // небольшой урон самому себе
          G.world.shake(6);
          break;
        }
        case 'heal':
          gain = 5;
          org.addEff('massregen', 6, 3);
          break;
      }
      org.gainMass(gain * org.stat('eatGain') * G.combo.mult(org), 'food');
      org.lastEat = 0;
    }
  };

  G.foods = foods;
})(window.G = window.G || {});
