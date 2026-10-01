// ============ КОНТРАКТЫ (п.14): задания за временные бонусы ============
(function (G) {
  const U = G.U, C = G.C;

  const DEFS = [
    { id: 'eat5',    name: 'Съешь 5 игроков меньше тебя', target: 5,  reward: 'x2 масса на 30с', rewardEff: ['massregen2x', 30] },
    { id: 'mass500', name: 'Собери 500 массы',            target: 500,reward: 'ускорение на 30с', rewardEff: ['speed', 30, 1.4] },
    { id: 'survive', name: 'Выживи 2 минуты без потери массы', target: 120, reward: 'щит 10с + энергия', rewardEff: ['shield', 10, 1] },
    { id: 'traps3',  name: 'Уничтожь 3 ловушки',          target: 3,  reward: 'x2 масса на 20с', rewardEff: ['massregen2x', 20] },
  ];

  const contracts = {
    active: [], // {def, progress, done, cooldown}

    reset() {
      contracts.active = [];
      while (contracts.active.length < C.CONTRACT_SLOTS) contracts.add();
    },

    add() {
      const used = contracts.active.map(a => a.def.id);
      const pool = DEFS.filter(d => !used.includes(d.id));
      if (!pool.length) return;
      const def = U.pick(pool);
      contracts.active.push({ def, progress: 0, done: false, cd: 0 });
    },

    update(state, dt) {
      const p = state.player;
      if (!p || !p.alive) return;

      for (const c of contracts.active) {
        if (c.done) {
          c.cd -= dt;
          if (c.cd <= 0) {
            contracts.active.splice(contracts.active.indexOf(c), 1);
            contracts.add();
          }
          continue;
        }
        if (c.def.id === 'survive') {
          // сбрасывается если потерял массу за последнюю секунду
          if (state.lastPlayerMass !== undefined && p.mass < state.lastPlayerMass - 0.5) {
            c.progress = 0;
          }
          c.progress += dt;
          if (c.progress >= c.def.target) contracts.complete(state, c);
        }
      }
      state.lastPlayerMass = p.mass;
    },

    onKillPlayer(state, killer) {
      if (killer !== state.player) return;
      const c = contracts.active.find(c => !c.done && c.def.id === 'eat5');
      if (c) { c.progress++; if (c.progress >= c.def.target) contracts.complete(state, c); }
    },

    onMassGain(state, org, amount) {
      if (org !== state.player) return;
      const c = contracts.active.find(c => !c.done && c.def.id === 'mass500');
      if (c) {
        c.progress = Math.min(c.def.target, c.progress + amount);
        if (c.progress >= c.def.target) contracts.complete(state, c);
      }
    },

    onDestroyTrap(org) {
      const state = G.state;
      if (org !== state.player) return;
      const c = contracts.active.find(c => !c.done && c.def.id === 'traps3');
      if (c) { c.progress++; if (c.progress >= c.def.target) contracts.complete(state, c); }
    },

    complete(state, c) {
      c.done = true;
      c.cd = C.CONTRACT_COOLDOWN;
      const p = state.player;
      const [eff, dur, val] = c.def.rewardEff;
      if (eff === 'massregen2x') p.addEff('massregen', dur, 3);
      else p.addEff(eff, dur, val || 1);
      if (c.def.id === 'survive') { p.energy = p.maxEnergy(); }
      G.ui.toast(G.Tf('contract_done', { name: G.T(c.def.name), reward: G.T(c.def.reward) }), 'good');
    },
  };

  G.contracts = contracts;
})(window.G = window.G || {});
