// ============ СИСТЕМА «КОРОЛЯ» (п.7) ============
// Каждые 5 минут зона появляется; удержи её — получи бонусы, но будь виден всем.
(function (G) {
  const U = G.U, C = G.C;

  const king = {
    cooldown: C.KING_FIRST, // когда появится зона (при инициализации — первая раньше)
    zone: null,             // {x,y,r, capture, holder, life}

    update(state, dt) {
      const k = king;

      if (!k.zone) {
        k.cooldown -= dt;
        if (k.cooldown <= 0) {
          // появление зоны
          const p = G.world.findSafeSpot(state, 600);
          k.zone = { x: p.x, y: p.y, r: C.KING_ZONE_R, capture: 0, holder: null, life: 120, t: 0 };
          if (state.player && state.player.isPlayer) G.ui.banner(G.Tf('king_zone', { sec: C.KING_CAPTURE }), 5000);
          G.world.ring(p.x, p.y, C.KING_ZONE_R, '#fde047');
        }
        return;
      }

      const z = k.zone;
      z.t += dt;
      z.life -= dt;

      // кто в зоне
      let inside = null, insideCount = 0;
      for (const org of state.orgs) {
        if (!org.alive) continue;
        const c = org.mainCell();
        if (U.dist2(c.x, c.y, z.x, z.y) < z.r * z.r) { inside = org; insideCount++; }
      }

      if (inside && insideCount === 1) {
        if (z.holder !== inside) { z.holder = inside; z.capture = 0; }
        z.capture += dt;
        if (z.capture >= C.KING_CAPTURE && !inside.king) {
          king.crown(state, inside);
        }
      } else {
        z.capture = Math.max(0, z.capture - dt * 1.5);
        if (insideCount > 1) z.holder = null;
      }

      // правление короля
      for (const org of state.orgs) {
        if (!org.king) continue;
        org.kingT -= dt;
        // пока король — масса растёт
        org.gainMass(C.KING_MASS_PER_SEC * dt, 'king');
        if (org.kingT <= 0 || !org.alive) {
          org.king = false;
          if (org.isPlayer && org.alive) G.ui.toast('👑 Правление окончено', '');
        }
      }

      if (z.life <= 0) {
        k.zone = null;
        k.cooldown = C.KING_INTERVAL - 120;
      }
    },

    crown(state, org) {
      org.king = true;
      org.kingT = C.KING_DURATION;
      org.energy = org.maxEnergy();
      const c = org.mainCell();
      G.world.ring(c.x, c.y, 300, '#fde047');
      G.world.spark(c.x, c.y, '#fde047', 30);
      if (org.isPlayer) {
        G.ui.toast(G.T('👑 ВЫ КОРОЛЬ! +масса/с, −50% стоимость способностей, отметка на карте!'), 'good');
        G.ui.banner(G.Tf('king_banner', { name: org.name }), 4000);
      } else if (state.player && state.player.alive) {
        G.ui.toast(G.Tf('king_crowned', { name: org.name }), 'bad');
      }
    },
  };

  G.king = king;
})(window.G = window.G || {});
