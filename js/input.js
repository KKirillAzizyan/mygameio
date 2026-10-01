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

    // Раскладконезависимый код клавиши (требование 1.6.2.4):
    // на русской раскладке «й» даёт KeyQ, а не e.key === 'q'.
    const keyOf = (e) => {
      const c = e.code || '';
      if (/^Key[A-Z]$/.test(c)) return c.slice(3);
      if (/^Digit[0-9]$/.test(c)) return c.slice(5);
      if (/^Numpad[0-9]$/.test(c)) return c.slice(6);
      if (c === 'Space') return ' ';
      if (c === 'Enter' || c === 'NumpadEnter') return 'Enter';
      return e.key.length === 1 ? e.key.toUpperCase() : e.key;
    };

    window.addEventListener('keydown', e => {
      const k = keyOf(e);
      if (!input.keys[k]) input.tapped[k] = true;
      input.keys[k] = true;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      const k = keyOf(e);
      input.keys[k] = false;
    });
    window.addEventListener('blur', () => { input.keys = {}; input.down = false; });

    // Требования 1.6.1.8 / 1.6.2.7: на игровом поле нет выделения текста
    // и контекстного меню (долгое нажатие на тач-устройствах).
    window.addEventListener('contextmenu', e => {
      if (e.target === canvas || e.target === document.body) e.preventDefault();
    });
    canvas.addEventListener('mousedown', e => { if (e.button === 2) e.preventDefault(); });
  };

  // одноразовое нажатие
  input.tap = function (k) {
    if (input.tapped[k]) { input.tapped[k] = false; return true; }
    return false;
  };
  input.endFrame = function () { input.tapped = {}; };

  G.input = input;
})(window.G = window.G || {});
