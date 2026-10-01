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
        { label: '⚡', list: G.abilities.LIST.map(a => ({ kind: 'ability', id: a.id, key: a.key, icon: a.icon, name: a.name, cost: a.cost, costLabel: 'энерг' })) },
        { label: '🧫', list: G.traps.TYPES.map(t => ({ kind: 'trap', id: t.id, key: t.key, icon: t.icon, name: t.name, cost: t.cost, costLabel: 'масса' })) },
        { label: '🧱', list: G.buildings.TYPES.map(t => ({ kind: 'build', id: t.id, key: t.key, icon: t.icon, name: t.name, cost: 0, costLabel: '%' })) },
      ];
      ui.slots = [];
      let html = '';
      for (const g of groups) {
        html += '<div class="slotGroup">';
        for (const s of g.list) {
          html += `<div class="slot" data-kind="${s.kind}" data-id="${s.id}" title="${s.name}${s.cost ? ' (' + s.cost + ' ' + s.costLabel + ')' : ''}">
            <span class="key">${s.key}</span>
            <span class="ico">${s.icon}</span>
            <span class="cost">${s.cost ? s.cost : ''}</span>
            <div class="cd hidden"></div>
          </div>`;
          ui.slots.push(s);
        }
        html += '</div>';
      }
      ui.els.hotbar.innerHTML = html;
    },

    buildHelp() {
      const rows = (items) => items.map(i => `<tr><td><kbd>${i[0]}</kbd></td><td>${i[1]}</td></tr>`).join('');
      ui.els.helpBody.innerHTML = `
        <h3>🖱 Движение и боёвка</h3>
        <table>${rows([
          ['Мышь', 'Двигать клетку (курсор — цель)'],
          ['Space', 'Быстрое разделение — атака или побег'],
          ['ЛКМ', 'То же, что и движение (для тач-режима)'],
        ])}</table>
        <h3>⚡ Способности (тратят энергию, энергия растёт с массой)</h3>
        <table>${rows(G.abilities.LIST.map(a => [a.key, `<b>${a.icon} ${a.name}</b> — ${a.desc} (${a.cost} энергии, кулдаун ${a.cd}с)`]))}</table>
        <h3>🧫 Ловушки (тратят массу, кулдаун)</h3>
        <table>${rows(G.traps.TYPES.map(t => [t.key, `<b>${t.icon} ${t.name}</b> — ${t.desc} (${t.cost} массы)`]))}</table>
        <h3>🧱 Строительство (тратит % массы)</h3>
        <table>${rows(G.buildings.TYPES.map(b => [b.key, `<b>${b.icon} ${b.name}</b> — ${b.desc}`]))}</table>
        <h3>⚙ Прочее</h3>
        <table>${rows([
          ['P', 'Пауза'], ['H', 'Эта справка'], ['Enter', 'Респавн после смерти'],
        ])}</table>
        <h3>🧠 Стратегия (п.16 — риск размера)</h3>
        <table>
          <tr><th>Размер</th><th>Плюс</th><th>Минус</th></tr>
          <tr><td>Маленький</td><td>Очень быстрый</td><td>Мало массы</td></tr>
          <tr><td>Средний</td><td>Сбалансирован</td><td>Нет преимуществ</td></tr>
          <tr><td>Большой</td><td>Сильный</td><td>Медленный</td></tr>
          <tr><td>Огромный</td><td>Поглощает почти всех</td><td>Уязвим к ловушкам</td></tr>
          <tr><td>Гигантский</td><td>Особые способности</td><td>Виден на всей карте</td></tr>
        </table>
        <p>⚠️ Большие клетки <b>разлагаются</b>: без еды теряют массу быстрее. Двигайся и охотись!</p>
        <p>💡 <b>Энергия</b> растёт с массой: оставь массу себе — станешь сильнее; трать на ловушки — контролируй территорию; трать на способности — атакуй и убегай.</p>
        <p>👑 Каждые 5 минут появляется <b>зона короля</b>: удержи её ${C.KING_CAPTURE} сек и получи бонусы — но местоположение увидят все.</p>
        <p>🌍 Мир меняется: 0–3 мин спокойно → 3–6 мин вирусы → 6–10 мин часть карты закрывается → 10+ мин опасные зоны и гигантские NPC.</p>
      `;
    },

    /* ---------- уведомления ---------- */
    toast(msg, cls) {
      const el = document.createElement('div');
      el.className = 'toast ' + (cls || '');
      el.textContent = msg;
      ui.els.toasts.appendChild(el);
      while (ui.els.toasts.children.length > 5) ui.els.toasts.firstChild.remove();
      setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }, 3000);
    },

    banner(msg, ms) {
      const b = ui.els.banner;
      b.textContent = msg;
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
      ui.els.death.classList.remove('hidden');
      ui.els.deathStats.innerHTML =
        `Масса: <b>${U.fmt(state.player.lastMass || 0)}</b><br>` +
        `Время выживания: <b>${U.time(state.player.lastTime || 0)}</b><br>` +
        `Убийств: <b>${state.player.kills}</b><br>` +
        `Мутаций: <b>${state.player.evoTotal || 0}</b>` +
        (killer && killer.name ? `<br>Убийца: <span style="color:${killer.color || '#fff'}">${killer.name}</span>` : '');
    },
    hideDeath() { ui.els.death.classList.add('hidden'); },

    showEvo(org) {
      const cards = G.evo.CLASSES.map(cl => `
        <div class="evoCard" data-id="${cl.id}">
          <div class="evoIcon">${cl.icon}</div>
          <div class="evoName">${cl.name}</div>
          <div class="evoDesc">${cl.desc}</div>
          <div class="evoLvl">текущий уровень: ${org.evo[cl.id] || 0} → ${(org.evo[cl.id] || 0) + 1}</div>
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
        ui.els.decoyVal.textContent = 'Разложение — ищи еду или двигайся!';
      } else ui.els.decoy.style.display = 'none';

      // лидерборд
      const lb = [...state.orgs].filter(o => o.alive).sort((a, b) => b.mass - a.mass).slice(0, 8);
      ui.els.lb.innerHTML = lb.map((o, i) =>
        `<li class="${o.isPlayer ? 'me' : ''}"><span class="lbRank">${i + 1}.</span>${o.name} — ${U.fmt(o.mass)}${o.king ? ' 👑' : ''}${o.bounty ? ' 🎯' : ''}</li>`
      ).join('');

      // контракты
      ui.els.ct.innerHTML = G.contracts.active.map(c => {
        const done = c.done;
        const prog = c.def.id === 'survive' ? `${Math.floor(c.progress)}/${c.def.target}с`
          : `${Math.floor(Math.min(c.progress, c.def.target))}/${c.def.target}`;
        return `<li class="${done ? 'done' : ''}">${done ? '✅' : '▫'} ${c.def.name} <span class="ctProg">${done ? 'награда: ' + c.def.reward : prog}</span></li>`;
      }).join('');

      // король
      const z = G.king.zone;
      if (p.king) {
        ui.els.king.classList.remove('hidden');
        ui.els.kingText.textContent = '👑 ВЫ КОРОЛЬ! ' + Math.ceil(p.kingT) + 'с · +масса/с · −50% энергии';
        ui.els.kingFill.style.width = (p.kingT / C.KING_DURATION * 100) + '%';
      } else if (z) {
        ui.els.king.classList.remove('hidden');
        if (z.holder === p) {
          ui.els.kingText.textContent = '👑 Зона короля: удерживайте! ' + Math.ceil(C.KING_CAPTURE - z.capture) + 'с';
          ui.els.kingFill.style.width = (z.capture / C.KING_CAPTURE * 100) + '%';
        } else {
          const holder = z.holder;
          ui.els.kingText.textContent = '👑 Зона короля' + (holder ? ' — захватывает: ' + holder.name : ' (некто внутри)') + ' · ' + Math.ceil(z.life) + 'с';
          ui.els.kingFill.style.width = (z.capture / C.KING_CAPTURE * 100) + '%';
        }
      } else ui.els.king.classList.add('hidden');

      // событие
      if (state.event) {
        ui.els.banner.classList.remove('hidden');
        if (ui.bannerT <= 0) ui.els.banner.textContent = state.event.name + ' · ' + Math.ceil(state.event.t) + 'с';
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
