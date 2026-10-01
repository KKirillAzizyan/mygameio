// ============ МАГНИТЫ МАССЫ (п.9) ============
// Подобрал магнит — частицы рядом летят к ближайшей клетке в зоне.
// Другие игроки в зоне тоже пользуются эффектом.
(function (G) {
  const U = G.U, C = G.C;

  const magnets = {
    ensure(state) {
      while (state.magnets.length < C.MAGNET_COUNT) {
        const p = G.world.findSafeSpot(state, 400);
        state.magnets.push({ x: p.x, y: p.y, r: 42, t: 0, active: 0, holder: null });
      }
    },

    update(state, dt) {
      for (const m of state.magnets) {
        m.t += dt;
        if (m.active > 0) {
          m.active -= dt;
          if (m.active <= 0) m.holder = null;

          // еда внутри радиуса летит к ближайшей клетке активной зоны
          const range = C.MAGNET_RANGE;
          for (const f of state.food) {
            const d2m = U.dist2(f.x, f.y, m.x, m.y);
            if (d2m > range * range) continue;
            // ближайшая цель среди организмов в зоне
            let best = null, bd = Infinity;
            for (const org of state.orgs) {
              if (!org.alive) continue;
              for (const c of org.cells) {
                const dc = U.dist2(c.x, c.y, m.x, m.y);
                if (dc < range * range && dc < bd) { bd = dc; best = c; }
              }
            }
            if (!best) continue;
            const d = Math.sqrt(U.dist2(f.x, f.y, best.x, best.y)) || 1;
            const pull = 420 * dt;
            f.x += (best.x - f.x) / d * pull;
            f.y += (best.y - f.y) / d * pull;
          }
        } else {
          // подбор
          for (const org of state.orgs) {
            if (!org.alive) continue;
            const c = org.mainCell();
            if (U.dist2(c.x, c.y, m.x, m.y) < (c.r + m.r) ** 2) {
              m.active = C.MAGNET_DURATION;
              m.holder = org;
              G.world.ring(m.x, m.y, C.MAGNET_RANGE, '#22d3ee');
              if (org.isPlayer) G.ui.toast(G.Tf('magnet_self', { sec: C.MAGNET_DURATION }), 'good');
              else if (state.player && state.player.alive) G.ui.toast(G.Tf('magnet_other', { name: org.name }), '');
              break;
            }
          }
        }
      }
    },
  };

  G.magnets = magnets;
})(window.G = window.G || {});
