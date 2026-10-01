// ============ ЭВОЛЮЦИЯ КЛЕТКИ (п.3): дерево мутаций 100→500→1500→5000 ============
(function (G) {
  const U = G.U, C = G.C;

  const CLASSES = [
    { id: 'predator', name: 'Хищник',  icon: '🦈', desc: 'Быстрее поглощает: +12% массы с еды и +8% радиус поглощения за уровень.' },
    { id: 'tank',     name: 'Танк',    icon: '🛡️', desc: '−40% получаемого урона и −50% урона от ловушек, но −8% скорости.' },
    { id: 'hunter',   name: 'Охотник', icon: '🦅', desc: '+8% скорости и +20% радиус обнаружения на миникарте.' },
    { id: 'parasite', name: 'Паразит', icon: '🦠', desc: '35% шанс вместо съедения прикрепиться к врагу и качать его массу.' },
    { id: 'mutant',   name: 'Мутант',  icon: '🧬', desc: '+25% максимума энергии и случайный бафф каждые 20 секунд.' },
  ];

  const evo = {
    CLASSES,

    // проверка порогов; возвращает true если нужно показать выбор
    check(state, org) {
      if (!org.alive || org.milestoneIdx >= G.EVO_MILESTONES.length) return false;
      if (org.mass >= G.EVO_MILESTONES[org.milestoneIdx]) {
        org.milestoneIdx++;
        if (org.isPlayer) {
          org.pendingEvo = true;
          return true;
        }
        // бот выбирает случайный путь
        evo.choose(state, org, U.pick(CLASSES).id, true);
      }
      return false;
    },

    choose(state, org, classId, silent) {
      org.evo[classId] = (org.evo[classId] || 0) + 1;
      org.evoTotal = (org.evoTotal || 0) + 1;
      org.pendingEvo = false;
      const cl = CLASSES.find(c => c.id === classId);
      if (org.isPlayer) {
        G.ui.toast(G.Tf('evo_mutation', { name: G.T(cl.name), lvl: org.evo[classId] }), 'good');
        G.ui.hideEvo();
        if (!state.paused) { /* возвращаем игру */ }
      }
      // бафф при получении уровня
      org.addEff('evoGlow', 3, 1);
      return cl;
    },

    // агрегированные статы — вызывается каждый кадр в org.refreshStats()
    stats(org) {
      const e = org.evo;
      const s = {};
      s.speedMult = 1 + 0.08 * (e.hunter || 0) - 0.08 * (e.tank || 0);
      s.dmgTaken = Math.pow(0.6, e.tank || 0);
      s.trapResist = Math.pow(0.5, e.tank || 0);
      s.eatRadius = 1 + 0.08 * (e.predator || 0);
      s.eatGain = 1 + 0.12 * (e.predator || 0);
      s.energyMax = 1 + 0.25 * (e.mutant || 0);
      s.vision = 1 + 0.2 * (e.hunter || 0);
      s.parasiteChance = 0.35 * (e.parasite || 0);
      return s;
    },

    // мутант: случайный бафф
    mutantTick(state, org, dt) {
      if (!(org.evo.mutant > 0)) return;
      org.mutantT = (org.mutantT || 0) - dt;
      if (org.mutantT <= 0) {
        org.mutantT = 20;
        const roll = Math.random();
        if (roll < 0.3) org.addEff('speed', 6, 1.35);
        else if (roll < 0.6) org.addEff('massregen', 6, 2);
        else if (roll < 0.8) org.addEff('shield', 3, 1);
        else { org.energy = org.maxEnergy(); }
        if (org.isPlayer) G.ui.toast('🧬 Мутация проявилась!', 'good');
      }
    },
  };

  G.evo = evo;
})(window.G = window.G || {});
