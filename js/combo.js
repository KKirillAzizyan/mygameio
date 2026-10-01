// ============ СЕРИЯ ПОГЛОЩЕНИЙ / КОМБО (п.15) ============
(function (G) {
  const U = G.U, C = G.C;

  const combo = {
    mult(org) {
      // множитель массы при поедании: до x5
      return 1 + Math.min(org.combo, C.COMBO_MAX) * 0.25;
    },
    speedMult(org) {
      return 1 + Math.min(org.combo, C.COMBO_MAX) * 0.06;
    },
    onKill(org) {
      org.combo++;
      org.comboT = C.COMBO_WINDOW;
      if (org.isPlayer && org.combo >= 2) {
        G.ui.combo(Math.min(org.combo, C.COMBO_MAX));
      }
    },
    update(state, dt) {
      for (const org of state.orgs) {
        if (org.combo > 0) {
          org.comboT -= dt;
          if (org.comboT <= 0) {
            org.combo = 0;
            if (org.isPlayer) G.ui.comboHide();
          }
        }
      }
    },
  };

  G.combo = combo;
})(window.G = window.G || {});
