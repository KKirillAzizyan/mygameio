// ============ ЛОКАЛИЗАЦИЯ (требование 2.14 — автоопределение языка через SDK) =
// Язык задаётся на старте из ysdk.environment.i18n.lang (см. js/ysdk.js).
// Резервный набор Яндекс Игр: ru для be/kk/uk/uz, en — для остальных.
// T(s)  — статические строки (ru → en). Если перевода нет, возвращается оригинал.
// Tf(id, vars) — шаблоны с подстановкой {var} для составных сообщений.
(function (G) {
  const STATIC = {
    // ---- способности ----
    'Рывок': 'Dash',
    'Щит': 'Shield',
    'Разделение': 'Split',
    'Поглощение': 'Absorb',
    'Телепорт': 'Teleport',
    'Заморозка': 'Freeze',
    'Призрак': 'Ghost',
    'Быстро перемещает клетку вперёд': 'Quickly dashes the cell forward',
    'Защищает от поглощения': 'Protects you from being eaten',
    'Несколько быстрых клеток': 'Spawns several fast cells',
    'Следующая цель даёт +40% массы': 'Next eaten target gives +40% mass',
    'Перенос в безопасную точку': 'Teleports to a safe spot',
    'Замедляет ближайших игроков': 'Slows nearby cells',
    'Нельзя съесть, проход сквозь стены': 'Cannot be eaten, passes through walls',

    // ---- ловушки ----
    'Шип': 'Spike',
    'Клей': 'Glue',
    'Мина': 'Mine',
    'Сеть': 'Net',
    'Липкая лужа': 'Sticky Puddle',
    'Фальшивая еда': 'Fake Food',
    'Отнимает 10% массы врага': 'Steals 10% of enemy mass',
    'Замедляет на 3 сек': 'Slows for 3 seconds',
    'Взрыв при приближении': 'Explodes when approached',
    'Сковывает движение': 'Roots movement',
    'Замедляет всех внутри': 'Slows everyone inside',
    'Выглядит как еда, но отнимает массу': 'Looks like food but steals mass',

    // ---- строительство ----
    'Стена': 'Wall',
    'Барьер': 'Barrier',
    'Турель': 'Turret',
    'Портал': 'Portal',
    'Блокирует путь врагам': 'Blocks enemy movement',
    'Узкий барьер, тормозит всех': 'Narrow barrier that slows everyone down',
    'Стреляет по врагам': 'Shoots at enemies',
    'Парные телепорты': 'Paired teleports',

    // ---- эволюция ----
    'Хищник': 'Predator',
    'Танк': 'Tank',
    'Охотник': 'Hunter',
    'Паразит': 'Parasite',
    'Мутант': 'Mutant',
    'Быстрее поглощает: +12% массы с еды и +8% радиус поглощения за уровень.':
      'Faster consumption: +12% food mass and +8% eat radius per level.',
    '−40% получаемого урона и −50% урона от ловушек, но −8% скорости.':
      '−40% damage taken and −50% trap damage, but −8% speed.',
    '+8% скорости и +20% радиус обнаружения на миникарте.':
      '+8% speed and +20% minimap detection range.',
    '35% шанс вместо съедения прикрепиться к врагу и качать его массу.':
      '35% chance to attach to an enemy instead of eating them and drain their mass.',
    '+25% максимума энергии и случайный бафф каждые 20 секунд.':
      '+25% max energy and a random buff every 20 seconds.',

    // ---- события ----
    '🌧 Массовый дождь': '🌧 Food Rain',
    'По карте сыплется огромное количество еды!': 'Huge amounts of food fall across the map!',
    '🦠 Большой вирус': '🦠 Giant Virus',
    'Появились гигантские вирусы!': 'Giant viruses have appeared!',
    '🎯 Охота': '🎯 Bounty Hunt',
    'За одним игроком назначена награда!': 'A bounty has been placed on one player!',
    '🕳 Чёрная дыра': '🕳 Black Hole',
    'Часть карты стала опасной!': 'Part of the map has become dangerous!',
    '✨ Золотая минута': '✨ Golden Minute',
    'Вся еда приносит втрое больше массы!': 'All food gives triple mass!',
    '👹 Нашествие NPC': '👹 NPC Invasion',
    'Агрессивные существа заполнили карту!': 'Aggressive creatures have filled the map!',

    // ---- контракты ----
    'Съешь 5 игроков меньше тебя': 'Eat 5 players smaller than you',
    'Собери 500 массы': 'Collect 500 mass',
    'Выживи 2 минуты без потери массы': 'Survive 2 minutes without losing mass',
    'Уничтожь 3 ловушки': 'Destroy 3 traps',
    'x2 масса на 30с': 'x2 mass for 30s',
    'ускорение на 30с': 'speed boost for 30s',
    'щит 10с + энергия': 'shield for 10s + energy',
    'x2 масса на 20с': 'x2 mass for 20s',

    // ---- еда ----
    'Обычная масса': 'Normal mass',
    'Энергия': 'Energy',
    'Золотая масса': 'Golden mass',
    'Мутационная': 'Mutagenic',
    'Взрывоопасная': 'Volatile',
    'Лечебная': 'Healing',

    // ---- вирусы ----
    'Обычный вирус': 'Normal virus',
    'Замораживающий': 'Freezing',
    'Массовый': 'Mass-draining',
    'Телепорт-вирус': 'Teleport virus',
    'Хаотичный': 'Chaotic',
    'Паразитический': 'Parasitic',
    'Делит большую клетку': 'Splits large cells',
    'Замедляет надолго': 'Long-lasting slowdown',
    'Отнимает массу': 'Steals mass',
    'Переносит в другое место': 'Teleports you elsewhere',
    'Случайно меняет размер': 'Randomly changes size',
    'Выпускает NPC-паразитов': 'Spawns NPC parasites',

    // ---- опасности ----
    'Метеорит': 'Meteor',
    'Движущийся шип': 'Moving Spike',
    'Электрическая зона': 'Electric Zone',
    'Кислотная область': 'Acid Pool',
    'Вулканическая зона': 'Volcanic Zone',
    'Движущаяся стена': 'Moving Wall',
    'Зона течения': 'Current Zone',
    'Закрытая зона': 'Closed Zone',

    // ---- NPC ----
    'Бактерия': 'Bacterium',
    'Босс': 'Boss',

    // ---- имена ботов ----
    'Амёба': 'Amoeba',
    'Пузырёк': 'Bubble',
    'Клетка': 'Cell',
    'Микроб': 'Microbe',
    'Вирус': 'Virus',
    'Плазма': 'Plasma',
    'Дракон': 'Dragon',
    'Тень': 'Shadow',
    'Космо': 'Cosmo',
    'Ластик': 'Eraser',
    'Гриб': 'Mushroom',
    'Слизень': 'Slime',
    'Ядро': 'Core',
    'Титан': 'Titan',
    'Комета': 'Comet',
    'Вихрь': 'Whirl',
    'Астероид': 'Asteroid',
    'Люмен': 'Lumen',
    'Зефир': 'Zephyr',
    'Кобра': 'Cobra',
    'Нимб': 'Halo',
    'Осколок': 'Shard',
    'Персик': 'Peach',

    // ---- HUD / статичные тексты интерфейса ----
    'массы': 'mass',
    '🏆 Лидеры': '🏆 Leaders',
    '🎯 Контракты': '🎯 Contracts',
    'H — управление · P — пауза': 'H — controls · P — pause',
    'Agar.io-подобная игра: ловушки, способности, эволюция, опасности и многое другое':
      'An Agar.io-like game: traps, abilities, evolution, hazards and much more',
    'Введите ник...': 'Enter nickname...',
    '▶ Играть': '▶ Play',
    'Управление:': 'Controls:',
    'мышь — движение · Space — разделение · Q/E/R/F/C/V — способности · X — призрак · 1–6 — ловушки · 7–0 — стройки · P — пауза · H — справка':
      'mouse — move · Space — split · Q/E/R/F/C/V — abilities · X — ghost · 1–6 — traps · 7–0 — buildings · P — pause · H — help',
    'v0.1 · план: 16/16 механик · этап 5 — мультиплеер':
      'v0.1 · plan: 16/16 mechanics · stage 5 — multiplayer',
    '🧬 Мутация! Выберите путь развития': '🧬 Mutation! Choose your development path',
    '⏸ Пауза': '⏸ Pause',
    'Продолжить (P)': 'Resume (P)',
    'Управление (H)': 'Controls (H)',
    'В меню': 'Menu',
    '🎮 Управление и механики': '🎮 Controls and mechanics',
    'Закрыть (H)': 'Close (H)',
    '💀 Вы поглощены': '💀 You have been consumed',
    '🔄 Играть снова (Enter)': '🔄 Play again (Enter)',

    // ---- справка ----
    '🖱 Движение и боёвка': '🖱 Movement and combat',
    'Мышь': 'Mouse',
    'Двигать клетку (курсор — цель)': 'Move your cell (the cursor is the target)',
    'Быстрое разделение — атака или побег': 'Quick split — attack or escape',
    'ЛКМ': 'LMB',
    'То же, что и движение (для тач-режима)': 'Same as movement (touch mode)',
    '⚡ Способности (тратят энергию, энергия растёт с массой)':
      '⚡ Abilities (cost energy; energy cap grows with mass)',
    '🧫 Ловушки (тратят массу, кулдаун)': '🧫 Traps (cost mass, have cooldowns)',
    '🧱 Строительство (тратит % массы)': '🧱 Building (costs a % of your mass)',
    '⚙ Прочее': '⚙ Other',
    'Пауза': 'Pause',
    'Эта справка': 'This help screen',
    'Респавн после смерти': 'Respawn after death',
    '🧠 Стратегия (п.16 — риск размера)': '🧠 Strategy (size = risk)',
    'Размер': 'Size', 'Плюс': 'Pro', 'Минус': 'Con',
    'Маленький': 'Small', 'Очень быстрый': 'Very fast', 'Мало массы': 'Little mass',
    'Средний': 'Medium', 'Сбалансирован': 'Balanced', 'Нет преимуществ': 'No advantage',
    'Большой': 'Big', 'Сильный': 'Strong', 'Медленный': 'Slow',
    'Огромный': 'Huge', 'Поглощает почти всех': 'Eats almost everyone',
    'Уязвим к ловушкам': 'Vulnerable to traps',
    'Гигантский': 'Giant', 'Особые способности': 'Special abilities',
    'Виден на всей карте': 'Visible across the whole map',

    // ---- разное ----
    'Игрок': 'Player',
    'энерг': 'energy',
    'масса': 'mass',
    'Разложение — ищи еду или двигайся!': 'Decaying — find food or keep moving!',
    'поставьте пару рядом': 'place the pair nearby',

    // ---- статические тосты/баннеры ----
    '🌀 Телепорт!': '🌀 Teleport!',
    '🌀 Телепорт-вирус!': '🌀 Teleport virus!',
    '🎲 Хаотичный вирус: размер изменён': '🎲 Chaotic virus: size changed',
    '⚡ Энергия восстановлена!': '⚡ Energy restored!',
    '🧬 Мутация проявилась!': '🧬 Mutation manifested!',
    '🌀 Первый портал поставлен — поставьте второй в радиусе 400 (списуется масса)':
      '🌀 First portal placed — place the second within 400 range (mass is charged)',
    '🌀 Второй портал слишком далеко — поставьте его рядом с первым':
      '🌀 The second portal is too far — place it next to the first one',
    '☄️ Метеоритный дождь!': '☄️ Meteor shower!',
    '👑 Правление окончено': '👑 Reign ended',
    '👑 ВЫ КОРОЛЬ! +масса/с, −50% стоимость способностей, отметка на карте!':
      '👑 YOU ARE KING! +mass/s, −50% ability cost, marked on the map!',
    '🦠 Паразит захватил врага — качаем массу!': '🦠 Parasite seized an enemy — draining mass!',
    '🦠 На вас цепляется паразит!': '🦠 A parasite is latching onto you!',
    '🧫 Выживи и стань большим! Мир меняется со временем...':
      '🧫 Survive and grow big! The world changes over time...',
    'Добро пожаловать! H — справка по управлению': 'Welcome! H — controls and mechanics help',
    '🦠 Фаза 2: по карте расползаются вирусы': '🦠 Phase 2: viruses spread across the map',
    '🧱 Фаза 3: часть карты закрывается!': '🧱 Phase 3: parts of the map are closing in!',
    '🌋 Фаза 4: опасные зоны и гигантские NPC!': '🌋 Phase 4: dangerous zones and giant NPCs!',
  };

  const TPL = {
    no_energy:      { ru: '⚡ Недостаточно энергии ({name}: {cost})', en: '⚡ Not enough energy ({name}: {cost})' },
    build_min_mass: { ru: 'Нужно минимум {mass} массы для: {name}', en: 'Need at least {mass} mass for: {name}' },
    portal_linked:  { ru: '🌀 Порталы соединены! (−{cost} массы)', en: '🌀 Portals linked! (−{cost} mass)' },
    build_done:     { ru: '{icon} {name} построена (−{cost} массы)', en: '{icon} {name} built (−{cost} mass)' },
    trap_low_mass:  { ru: 'Мало массы для ловушки ({cost})', en: 'Not enough mass for a trap ({cost})' },
    trap_placed:    { ru: '{icon} {name} установлена (−{cost} массы)', en: '{icon} {name} placed (−{cost} mass)' },
    trap_hit:       { ru: '🪤 Ловушка! −{lose} массы', en: '🪤 Trap! −{lose} mass' },
    trap_owner_hit: { ru: '🪤 {name} попался на фальшивую еду!', en: '🪤 {name} stepped on fake food!' },
    contract_done:  { ru: '🏆 Контракт выполнен: «{name}» → {reward}', en: '🏆 Contract completed: "{name}" → {reward}' },
    contract_reward:{ ru: 'награда: {r}', en: 'reward: {r}' },
    event_ended:    { ru: 'Событие «{name}» закончилось', en: 'Event "{name}" has ended' },
    event_timer:    { ru: '{name} · {t}с', en: '{name} · {t}s' },
    evo_mutation:   { ru: '🧬 Мутация: {name} ур.{lvl}', en: '🧬 Mutation: {name} lvl.{lvl}' },
    evo_level:      { ru: 'текущий уровень: {a} → {b}', en: 'current level: {a} → {b}' },
    king_zone:      { ru: '👑 Зона короля появилась! Удержи её {sec} сек', en: '👑 The king zone has appeared! Hold it for {sec}s' },
    king_banner:    { ru: '👑 {name} — Король клетки!', en: '👑 {name} — the Cell King!' },
    king_crowned:   { ru: '👑 {name} стал королём', en: '👑 {name} became king' },
    king_you:       { ru: '👑 ВЫ КОРОЛЬ! {t}с · +масса/с · −50% энергии', en: '👑 YOU ARE KING! {t}s · +mass/s · −50% energy cost' },
    king_hold:      { ru: '👑 Зона короля: удерживайте! {t}с', en: '👑 King zone: hold it! {t}s' },
    king_holding:   { ru: '👑 Зона короля — захватывает: {name} · {t}с', en: '👑 King zone — captured by: {name} · {t}s' },
    king_inside:    { ru: '👑 Зона короля (некто внутри) · {t}с', en: '👑 King zone (someone inside) · {t}s' },
    magnet_self:    { ru: '🧲 Магнит активен {sec} с — частицы притягиваются!', en: '🧲 Magnet active for {sec}s — food is pulled toward you!' },
    magnet_other:   { ru: '🧲 {name} активировал магнит', en: '🧲 {name} activated a magnet' },
    hunt_bonus:     { ru: '🎯 Награда за охоту: +{n} массы!', en: '🎯 Hunt bounty: +{n} mass!' },
    npc_eat_you:    { ru: '💀 {name} поглотил вашу клетку!', en: '💀 {name} devoured your cell!' },
    ate_cell:       { ru: 'Вы поглотили клетку {name} (+{n})', en: 'You consumed the cell of {name} (+{n})' },
    absorbed:       { ru: 'Поглощена {name} (+{n})', en: 'Consumed {name} (+{n})' },
    boss_killed:    { ru: '💥 {name} уничтожил босса!', en: '💥 {name} destroyed the boss!' },
    time_prog:      { ru: '{a}/{b}с', en: '{a}/{b}s' },
    ability_meta:   { ru: '{cost} энергии, кулдаун {cd}с', en: '{cost} energy, {cd}s cooldown' },
    trap_meta:      { ru: '{cost} массы', en: '{cost} mass' },
    best_line:      { ru: '⭐ Рекорд: {v}', en: '⭐ Best: {v}' },

    // справка (HTML)
    help_decay: {
      ru: '⚠️ Большие клетки <b>разлагаются</b>: без еды теряют массу быстрее. Двигайся и охотись!',
      en: '⚠️ Large cells <b>decay</b>: without food they lose mass faster. Keep moving and hunting!',
    },
    help_energy: {
      ru: '💡 <b>Энергия</b> растёт с массой: оставь массу себе — станешь сильнее; трать на ловушки — контролируй территорию; трать на способности — атакуй и убегай.',
      en: '💡 <b>Energy</b> grows with mass: keep mass to become stronger; spend it on traps to control the field; spend it on abilities to attack and escape.',
    },
    help_king: {
      ru: '👑 Каждые 5 минут появляется <b>зона короля</b>: удержи её {sec} сек и получи бонусы — но местоположение увидят все.',
      en: '👑 Every 5 minutes a <b>king zone</b> appears: hold it for {sec}s to earn bonuses — but everyone will see your location.',
    },
    help_phases: {
      ru: '🌍 Мир меняется: 0–3 мин спокойно → 3–6 мин вирусы → 6–10 мин часть карты закрывается → 10+ мин опасные зоны и гигантские NPC.',
      en: '🌍 The world changes: 0–3 min calm → 3–6 min viruses → 6–10 min parts of the map close → 10+ min dangerous zones and giant NPCs.',
    },

    // экран смерти (HTML)
    d_mass:   { ru: 'Масса: <b>{v}</b>', en: 'Mass: <b>{v}</b>' },
    d_time:   { ru: 'Время выживания: <b>{v}</b>', en: 'Survival time: <b>{v}</b>' },
    d_kills:  { ru: 'Убийств: <b>{v}</b>', en: 'Kills: <b>{v}</b>' },
    d_evo:    { ru: 'Мутаций: <b>{v}</b>', en: 'Mutations: <b>{v}</b>' },
    d_best:   { ru: 'Рекорд: <b>{v}</b>', en: 'Best: <b>{v}</b>' },
    d_killer: { ru: 'Убийца: <span style="color:{c}">{n}</span>', en: 'Killer: <span style="color:{c}">{n}</span>' },
  };

  const RU_FALLBACK = ['be', 'kk', 'uk', 'uz']; // резервный набор Яндекс Игр

  const i18n = {
    lang: 'ru',

    // нормализация кода языка: ru + резервные → ru, остальное → en
    normalize(code) {
      const l = String(code || '').toLowerCase().slice(0, 2);
      if (l === 'ru' || RU_FALLBACK.includes(l)) return 'ru';
      if (l) return 'en';
      return null; // код неизвестен — не меняем язык
    },

    setLang(code) {
      const l = i18n.normalize(code);
      if (!l) return;
      i18n.lang = l;
      document.documentElement.lang = l;
      i18n.applyDOM();
      if (G.ui && G.ui.relocalize) G.ui.relocalize();
    },

    // статическая строка → перевод (или оригинал)
    T(s) {
      if (i18n.lang !== 'en' || typeof s !== 'string') return s;
      return STATIC[s] !== undefined ? STATIC[s] : s;
    },

    // шаблон с {переменными}
    Tf(id, vars) {
      const t = TPL[id];
      if (!t) return id;
      const s = i18n.lang === 'en' ? t.en : t.ru;
      return s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m));
    },

    // перевод статичных DOM-элементов (data-i18n / data-i18n-ph)
    applyDOM() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', i18n.applyDOM, { once: true });
        return;
      }
      document.querySelectorAll('[data-i18n]').forEach(el => {
        if (el.dataset.i18nRu === undefined) el.dataset.i18nRu = el.textContent;
        el.textContent = i18n.T(el.dataset.i18nRu);
      });
      document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        if (el.dataset.i18nPhRu === undefined) el.dataset.i18nPhRu = el.getAttribute('placeholder') || '';
        el.setAttribute('placeholder', i18n.T(el.dataset.i18nPhRu));
      });
    },
  };

  // предустановка по браузеру до прихода языка из SDK (SDK имеет приоритет)
  i18n.lang = i18n.normalize((navigator.language || 'ru')) || 'ru';

  G.i18n = i18n;
  G.T = s => i18n.T(s);
  G.Tf = (id, vars) => i18n.Tf(id, vars);

  // стартовый перевод DOM (элементы уже разобраны — вызываем сразу)
  i18n.applyDOM();
})(window.G = window.G || {});
