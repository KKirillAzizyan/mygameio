// ============ ВВОД (мышь, клавиатура, тач) ============
(function (G) {
  const input = {
    sx: 0, sy: 0,          // экранная позиция мыши
    worldX: 0, worldY: 0,  // мировая (заполняет main по камере)
    down: false,
    keys: {},              // сейчас нажато
    tapped: {},            // нажато в этом кадре (consume сбрасывает)
    isTouch: false,
  };

  input.init = function (canvas) {
    canvas.addEventListener('mousemove', e => {
      input.sx = e.clientX; input.sy = e.clientY; input.down = e.buttons > 0;
    });
    canvas.addEventListener('mousedown', e => { input.down = true; input.sx = e.clientX; input.sy = e.clientY; });
    window.addEventListener('mouseup', () => { input.down = false; });

    canvas.addEventListener('touchstart', e => {
      e.preventDefault(); input.isTouch = true;
      const t = e.touches[0]; input.sx = t.clientX; input.sy = t.clientY; input.down = true;
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0]; input.sx = t.clientX; input.sy = t.clientY;
    }, { passive: false });
    canvas.addEventListener('touchend', e => { e.preventDefault(); input.down = false; }, { passive: false });

    window.addEventListener('keydown', e => {
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!input.keys[k]) input.tapped[k] = true;
      input.keys[k] = true;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      input.keys[k] = false;
    });
    window.addEventListener('blur', () => { input.keys = {}; input.down = false; });
  };

  // одноразовое нажатие
  input.tap = function (k) {
    if (input.tapped[k]) { input.tapped[k] = false; return true; }
    return false;
  };
  input.endFrame = function () { input.tapped = {}; };

  G.input = input;
})(window.G = window.G || {});
