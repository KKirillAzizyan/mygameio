// ============ ИНТЕФЕЙС: HUD, хотбар, лидерборд, попапы ============
(function (G) {
  const U = G.U, C = G.C;
  const $ = id => document.getElementById(id);

  const ui = {
    els: {},
    slots: [],
    bannerT: 0,

    init() {
      ui.els = {
        hud: $('hud'), menu: $('menu'), pause: $('pause'), help: $('help'),
        death: $('death'), evo: $('evoPopup'),
        mass: $('massVal'), energyFill: $('energyFill'), energyVal: $('energyVal'),
        effects: $('effects'), decoy: $('decoy'), decoyVal: $('decoyVal'),
        lb: $('lbList'), ct: $('ctList'),
        king: $('kingInfo'), kingText: $('kingText'), kingFill: $('kingFill'),
        banner: $('eventBanner'), combo: $('combo'), comboVal: $('comboVal'),
        toasts: $('toasts'), hotbar: $('hotbar'), minimap: $('minimap'),
        evoChoices: $('evoChoices'), deathStats: $('deathStats'),
        helpBody: $('helpBody'), nick: $('nick'),
      };

      ui.buildHotbar();
      ui.buildHelp();

      // кнопки
      $('playBtn').onclick = () => G.game.start();
      $('resumeBtn').onclick = () => G.game.togglePause();
      $('helpBtn').onclick = () => ui.showHelp();
      $('menuBtn').onclick = () => G.game.toMenu();
      $('helpClose').onclick = () => ui.hideHelp();
      $('respawnBtn').onclick = () => G.game.respawn();
      $('deathMenuBtn').onclick = () => G.game.toMenu();
      $('nick').addEventListener('keydown', e => { if (e.key === 'Enter') G.game.start(); });
    },

    /* ---------- хотбар ---------- */
    buildHotbar() {
      const groups = [
        { label: '⚡', list: G.abilities.LIST.map(a => ({ kind: 'ability', id: a.id, key: a.key, icon: a.icon, name: G.T(a.name), cost: a.cost, costLabel: 'энерг' })) },
        { label: '🧫', list: G.traps.TYPES.map(t => ({ kind: 'trap', id: t.id, key: t.key, icon: t.icon, name: G.T(t.name), cost: t.cost, costLabel: 'масса' })) },
        { label: '🧱', list: G.buildings.TYPES.map(t => ({ kind: 'build', id: t.id, key: t.key, icon: t.icon, name: G.T(t.name), cost: 0, costLabel: '%' })) },
      ];
      ui.slots = [];
      let html = '';
      for (const g of groups) {
        html += '<div class="slotGroup">';
        for (const s of g.list) {
          html += `<div class="slot" data-kind="${s.kind}" data-id="${s.id}" title="${s.name}${s.cost ? ' (' + s.cost + ' ' + G.T(s.costLabel) + ')' : ''}">`;
          html += `<span class="key">${s.key}</span>`;
          html += `<span class="ico">${s.icon}</span>`;
          html += `<span class="cost">${s.cost ? s.cost : ''}</span>`;
          html += `<div class="cd hidden"></div></div>`;
          ui.slots.push(s);
        }
        html += '</div>';
      }
      ui.els.hotbar.innerHTML = html;
    },

    buildHelp() {
      const T = G.T, Tf = G.Tf;
      const rows = (items) => items.map(i => `<tr><td><kbd>${i[0]}</kbd></td><td>${i[1]}</td></tr>`).join('');
      const aMeta = a => Tf('ability_meta', { cost: a.cost, cd: a.cd });
      ui.els.helpBody.innerHTML = `
        <h3>${T('🖱 Движение и боёвка')}</h3>
        <table>${rows([
          [T('Мышь'), T('Двигать клетку (курсор — цель)')],
          ['Space', T('Быстрое разделение — атака или побег')],
          [T('ЛКМ'), T('То же, что и движение (для тач-режима)')],
        ])}</table>
        <h3>${T('⚡ Способности (тратят энергию, энергия растёт с массой)')}</h3>
        <table>${rows(G.abilities.LIST.map(a => [a.key, `<b>${a.icon} ${T(a.name)}</b> — ${T(a.desc)} (${aMeta(a)})`]))}</table>
        <h3>${T('🧫 Ловушки (тратят массу, кулдаун)')}</h3>
        <table>${rows(G.traps.TYPES.map(t => [t.key, `<b>${t.icon} ${T(t.name)}</b> — ${T(t.desc)} (${Tf('trap_meta', { cost: t.cost })})`]))}</table>
        <h3>${T('🧱 Строительство (тратит % массы)')}</h3>
        <table>${rows(G.buildings.TYPES.map(b => [b.key, `<b>${b.icon} ${T(b.name)}</b> — ${T(b.desc)}`]))}</table>
        <h3>${T('⚙ Прочее')}</h3>
        <table>${rows([
          ['P', T('Пауза')], ['H', T('Эта справка')], ['Enter', T('Респавн после смерти')],
        ])}</table>
        <h3>${T('🧠 Стратегия (п.16 — риск размера)')}</h3>
        <table>
          <tr><th>${T('Размер')}</th><th>${T('Плюс')}</th><th>${T('Минус')}</th></tr>
          <tr><td>${T('Маленький')}</td><td>${T('Очень быстрый')}</td><td>${T('Мало массы')}</td></tr>
          <tr><td>${T('Средний')}</td><td>${T('Сбалансирован')}</td><td>${T('Нет преимуществ')}</td></tr>
          <tr><td>${T('Большой')}</td><td>${T('Сильный')}</td><td>${T('Медленный')}</td></tr>
          <tr><td>${T('Огромный')}</td><td>${T('Поглощает почти всех')}</td><td>${T('Уязвим к ловушкам')}</td></tr>
          <tr><td>${T('Гигантский')}</td><td>${T('Особые способности')}</td><td>${T('Виден на всей карте')}</td></tr>
        </table>
        <p>${Tf('help_decay')}</p>
        <p>${Tf('help_energy')}</p>
        <p>${Tf('help_king', { sec: C.KING_CAPTURE })}</p>
        <p>${Tf('help_phases')}</p>
      `;
    },

    /* ---------- уведомления ---------- */
    toast(msg, cls) {
      const el = document.createElement('div');
      el.className = 'toast ' + (cls || '');
      el.textContent = G.T(msg);
      ui.els.toasts.appendChild(el);
      while (ui.els.toasts.children.length > 5) ui.els.toasts.firstChild.remove();
      setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }, 3000);
    },

    banner(msg, ms) {
      const b = ui.els.banner;
      b.textContent = G.T(msg);
      b.classList.remove('hidden');
      ui.bannerT = (ms || 4000) / 1000;
    },

    hitFlash() { G.world.hitT = 1; },

    combo(n) { ui.els.combo.classList.remove('hidden'); ui.els.comboVal.textContent = n; },
    comboHide() { ui.els.combo.classList.add('hidden'); },

    /* ---------- оверлеи ---------- */
    showMenu() { ui.els.menu.classList.remove('hidden'); ui.els.hud.classList.add('hidden'); ui.els.nick.focus(); },
    hideMenu() { ui.els.menu.classList.add('hidden'); ui.els.hud.classList.remove('hidden'); },
    showPause() { ui.els.pause.classList.remove('hidden'); },
    hidePause() { ui.els.pause.classList.add('hidden'); },
    showHelp() { ui.els.help.classList.remove('hidden'); },
    hideHelp() { ui.els.help.classList.add('hidden'); },
    showDeath(killer, state) {
      const Tf = G.Tf;
      ui.els.death.classList.remove('hidden');
      ui.els.deathStats.innerHTML =
        Tf('d_mass', { v: U.fmt(state.player.lastMass || 0) }) + '<br>' +
        Tf('d_time', { v: U.time(state.player.lastTime || 0) }) + '<br>' +
        Tf('d_kills', { v: state.player.kills }) + '<br>' +
        Tf('d_evo', { v: state.player.evoTotal || 0 }) +
        (killer && killer.name ? '<br>' + Tf('d_killer', { c: killer.color || '#fff', n: killer.name }) : '') +
        (G.ysdk && G.ysdk.best ? '<br>' + Tf('d_best', { v: U.fmt(G.ysdk.best) }) : '');
    },
    hideDeath() { ui.els.death.classList.add('hidden'); },

    showEvo(org) {
      const cards = G.evo.CLASSES.map(cl => `
        <div class="evoCard" data-id="${cl.id}">
          <div class="evoIcon">${cl.icon}</div>
          <div class="evoName">${G.T(cl.name)}</div>
          <div class="evoDesc">${G.T(cl.desc)}</div>
          <div class="evoLvl">${G.Tf('evo_level', { a: org.evo[cl.id] || 0, b: (org.evo[cl.id] || 0) + 1 })}</div>
        </div>`).join('');
      ui.els.evoChoices.innerHTML = cards;
      ui.els.evoChoices.querySelectorAll('.evoCard').forEach(el => {
        el.onclick = () => { G.evo.choose(G.state, org, el.dataset.id); ui.hideEvo(); };
      });
      ui.els.evo.classList.remove('hidden');
    },
    hideEvo() {
      ui.els.evo.classList.add('hidden');
      if (G.state) { G.state.paused = false; G.state.evoPopupOpen = false; }
    },

    /* ---------- рекорд (сохранение прогресса, п.1.9) ---------- */
    renderBest() {
      const el = document.getElementById('bestLine');
      if (!el) return;
      if (G.ysdk && G.ysdk.best > 0) {
        el.classList.remove('hidden');
        el.textContent = G.Tf('best_line', { v: U.fmt(G.ysdk.best) });
      } else el.classList.add('hidden');
    },

    /* ---------- смена локализации (вызывается из i18n после определения языка) ---------- */
    relocalize() {
      if (!ui.els.menu) return; // DOM ещё не готов
      ui.buildHotbar();
      ui.buildHelp();
      G.i18n.applyDOM();
      ui.renderBest();
    },

    /* ---------- ежекадровое обновление ---------- */
    update(dt) {
      const state = G.state;
      if (!state) return;

      if (ui.bannerT > 0) {
        ui.bannerT -= dt;
        if (ui.bannerT <= 0) ui.els.banner.classList.add('hidden');
      }

      const p = state.player;
      if (!p || !p.alive) return;

      // масса и энергия
      ui.els.mass.textContent = U.fmt(p.mass);
      const en = Math.round(p.energy), mx = Math.round(p.maxEnergy());
      ui.els.energyFill.style.width = (p.energy / p.maxEnergy() * 100) + '%';
      ui.els.energyVal.textContent = `⚡ ${en}/${mx}`;

      // эффекты
      const icons = [];
      if (p.hasEff('shield')) icons.push('🛡');
      if (p.hasEff('speed')) icons.push('⚡');
      if (p.hasEff('slow')) icons.push('🐌');
      if (p.hasEff('root')) icons.push('🕸');
      if (p.hasEff('ghost')) icons.push('👻');
      if (p.hasEff('absorb')) icons.push('🌀');
      if (p.hasEff('massregen')) icons.push('💚');
      if (p.hasEff('frozenVis')) icons.push('❄️');
      if (p.spawnT > 0) icons.push('✨');
      if (p.attach) icons.push('🦠');
      ui.els.effects.innerHTML = icons.map(i => `<span class="effIcon">${i}</span>`).join('');

      // разложение
      if (p.decaying) {
        ui.els.decoy.style.display = 'block';
        ui.els.decoyVal.textContent = G.T('Разложение — ищи еду или двигайся!');
      } else ui.els.decoy.style.display = 'none';

      // лидерборд
      const lb = [...state.orgs].filter(o => o.alive).sort((a, b) => b.mass - a.mass).slice(0, 8);
      ui.els.lb.innerHTML = lb.map((o, i) =>
        `<li class="${o.isPlayer ? 'me' : ''}"><span class="lbRank">${i + 1}.</span>${o.name} — ${U.fmt(o.mass)}${o.king ? ' 👑' : ''}${o.bounty ? ' 🎯' : ''}</li>`
      ).join('');

      // контракты
      ui.els.ct.innerHTML = G.contracts.active.map(c => {
        const done = c.done;
        const prog = c.def.id === 'survive' ? G.Tf('time_prog', { a: Math.floor(c.progress), b: c.def.target })
          : `${Math.floor(Math.min(c.progress, c.def.target))}/${c.def.target}`;
        return `<li class="${done ? 'done' : ''}">${done ? '✅' : '▫'} ${G.T(c.def.name)} <span class="ctProg">${done ? G.Tf('contract_reward', { r: G.T(c.def.reward) }) : prog}</span></li>`;
      }).join('');

      // король
      const z = G.king.zone;
      if (p.king) {
        ui.els.king.classList.remove('hidden');
        ui.els.kingText.textContent = G.Tf('king_you', { t: Math.ceil(p.kingT) });
        ui.els.kingFill.style.width = (p.kingT / C.KING_DURATION * 100) + '%';
      } else if (z) {
        ui.els.king.classList.remove('hidden');
        if (z.holder === p) {
          ui.els.kingText.textContent = G.Tf('king_hold', { t: Math.ceil(C.KING_CAPTURE - z.capture) });
          ui.els.kingFill.style.width = (z.capture / C.KING_CAPTURE * 100) + '%';
        } else {
          const holder = z.holder;
          ui.els.kingText.textContent = holder
            ? G.Tf('king_holding', { name: holder.name, t: Math.ceil(z.life) })
            : G.Tf('king_inside', { t: Math.ceil(z.life) });
          ui.els.kingFill.style.width = (z.capture / C.KING_CAPTURE * 100) + '%';
        }
      } else ui.els.king.classList.add('hidden');

      // событие
      if (state.event) {
        ui.els.banner.classList.remove('hidden');
        if (ui.bannerT <= 0) ui.els.banner.textContent = G.Tf('event_timer', { name: G.T(state.event.name), t: Math.ceil(state.event.t) });
      }

      // хотбар: кулдауны и доступность
      for (const el of ui.els.hotbar.querySelectorAll('.slot')) {
        const kind = el.dataset.kind, id = el.dataset.id;
        const cdEl = el.querySelector('.cd');
        let cd = 0, disabled = false;
        if (kind === 'ability') {
          cd = p.cds[id] || 0;
          const a = G.abilities.byId(id);
          disabled = p.energy < a.cost;
        } else if (kind === 'trap') {
          cd = p.trapCds[id] || 0;
          const t = G.traps.byId(id);
          disabled = p.mass < t.cost;
        } else if (kind === 'build') {
          cd = p.buildCds[id] || 0;
          const b = G.buildings.byId(id);
          disabled = p.mass < b.minMass;
        }
        if (cd > 0) { cdEl.classList.remove('hidden'); cdEl.textContent = Math.ceil(cd); }
        else cdEl.classList.add('hidden');
        el.classList.toggle('disabled', disabled);
      }

      // хотбар влезает в экран
      const hb = ui.els.hotbar;
      if (hb) {
        const avail = window.innerWidth - 12;
        const sc = Math.min(1, avail / (hb.offsetWidth || 1));
        const tr = 'translateX(-50%) scale(' + sc.toFixed(3) + ')';
        if (hb.style.transform !== tr) hb.style.transform = tr;
      }

      // миникарта
      G.world.drawMinimap(ui.els.minimap.getContext('2d'), state);
    },
  };

  G.ui = ui;
})(window.G = window.G || {});
