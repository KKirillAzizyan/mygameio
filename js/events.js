// ============ СОБЫТИЯ (п.13): каждые ~90 секунд ============
(function (G) {
  const U = G.U, C = G.C;

  const EVENTS = [
    { id: 'rain',     name: '🌧 Массовый дождь',    desc: 'По карте сыплется огромное количество еды!' },
    { id: 'bigvirus', name: '🦠 Большой вирус',     desc: 'Появились гигантские вирусы!' },
    { id: 'hunt',     name: '🎯 Охота',              desc: 'За одним игроком назначена награда!' },
    { id: 'hole',     name: '🕳 Чёрная дыра',       desc: 'Часть карты стала опасной!' },
    { id: 'golden',   name: '✨ Золотая минута',     desc: 'Вся еда приносит втрое больше массы!' },
    { id: 'invasion', name: '👹 Нашествие NPC',      desc: 'Агрессивные существа заполнили карту!' },
  ];

  const events = {
    EVENTS,
    nextAt: C.EVENT_INTERVAL,
    last: null,

    update(state, dt) {
      const e = events;

      if (state.event) {
        state.event.t -= dt;
        if (state.event.t <= 0) {
          events.end(state, state.event);
          state.event = null;
        } else if (state.event.id === 'rain') {
          // дождь: сыпем еду
          state.rainT = (state.rainT || 0) + dt;
          while (state.rainT > 0.15) {
            state.rainT -= 0.15;
            const p = { x: U.rand(50, C.WORLD_W - 50), y: U.rand(50, C.WORLD_H - 50) };
            state.food.push(G.foods.make(p.x, p.y));
          }
        }
        return;
      }

      e.nextAt -= dt;
      if (e.nextAt <= 0) {
        e.nextAt = C.EVENT_INTERVAL;
        let pool = EVENTS.filter(x => x.id !== e.last);
        const ev = U.pick(pool);
        e.last = ev.id;
        events.start(state, ev);
      }
    },

    start(state, ev) {
      state.event = { ...ev, t: C.EVENT_DURATION };
      const player = state.player;

      switch (ev.id) {
        case 'rain': break;
        case 'bigvirus': {
          for (let i = 0; i < 4; i++) {
            const p = G.world.findSafeSpot(state, 500);
            const v = G.viruses.make(p.x, p.y, 'normal');
            v.r *= 1.7;
            state.viruses.push(v);
          }
          break;
        }
        case 'hunt': {
          // цель — живой организм с хорошей массой (не игрок, чтобы не пугать... хотя может и игрок)
          const cands = state.orgs.filter(o => o.alive && o.mass > 60);
          if (cands.length) {
            const target = U.pick(cands);
            target.bounty = true;
            state.event.target = target;
          }
          break;
        }
        case 'hole': {
          const p = G.hazards.randomSpot(state);
          G.hazards.spawn(state, 'blackhole', p.x, p.y, { life: C.EVENT_DURATION });
          break;
        }
        case 'golden': break;
        case 'invasion': {
          for (let i = 0; i < 8; i++) {
            const p = G.world.findSafeSpot(state, 600);
            state.npcs.push(G.npc.make(p.x, p.y, 'predator'));
          }
          break;
        }
      }

      if (player && player.alive) {
        G.ui.banner(G.T(ev.name) + ' — ' + G.T(ev.desc), 4500);
        G.ui.toast(G.T(ev.name), 'good');
      }
    },

    end(state, ev) {
      if (ev.target) ev.target.bounty = false;
      if (state.player) G.ui.toast(G.Tf('event_ended', { name: G.T(ev.name) }), '');
    },
  };

  G.events = events;
})(window.G = window.G || {});
