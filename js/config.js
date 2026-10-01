// ============ КОНФИГУРАЦИЯ И БАЛАНС ============
window.G = window.G || {};

G.C = {
  // Мир
  WORLD_W: 7000,
  WORLD_H: 7000,
  FOOD_COUNT: 620,
  FOOD_MASS: 1,

  // Игрок
  START_MASS: 25,
  MIN_MASS: 10,           // ниже — смерть
  MAX_CELLS: 16,
  MERGE_TIME: 12,         // сек до слияния своих клеток
  SPLIT_BOOST: 620,       // импульс разделения
  BASE_SPEED: 210,        // px/с для клетки радиуса 40

  // Энергия (масса → энергия)
  ENERGY_BASE: 60,
  ENERGY_PER_MASS: 0.08,
  ENERGY_REGEN_BASE: 4,
  ENERGY_REGEN_PER_MASS: 0.004,

  // Поглощение
  EAT_RATIO: 1.15,        // масса должна быть в 1.15 раза больше
  EAT_OVERLAP: 0.3,       // доля радиуса меньшей клетки для съедения
  EAT_GAIN: 0.85,         // сколько массы жертвы получает поглотитель

  // Разложение (п.16)
  DECAY_MIN_MASS: 400,    // с этой массы есть разложение
  DECAY_RATE: 0.0004,     // доля массы/сек
  DECAY_IDLE_MULT: 3,     // множитель при бездействии (не ел и не двигался)
  DECAY_IDLE_TIME: 8,     // сек бездействия до усиленного разложения

  // Боты и NPC
  BOT_COUNT: 17,
  NPC_BACTERIA: 45,
  NPC_PREDATOR: 5,
  NPC_PARASITE: 6,
  NPC_BOSS: 1,
  VIRUS_COUNT: 12,

  // Порядок рендера/слоёв
  LAYER_GRID: 0,

  // Контракты
  CONTRACT_SLOTS: 3,
  CONTRACT_COOLDOWN: 8,   // сек до выдачи нового после выполнения

  // Комбо (п.15)
  COMBO_WINDOW: 5,
  COMBO_MAX: 5,

  // Король (п.7)
  KING_INTERVAL: 300,     // каждые 5 минут
  KING_FIRST: 90,         // первая зона раньше
  KING_CAPTURE: 10,       // сек удержания зоны
  KING_DURATION: 60,      // сек длительности статуса
  KING_ZONE_R: 340,
  KING_MASS_PER_SEC: 2,

  // События (п.13)
  EVENT_INTERVAL: 90,
  EVENT_DURATION: 30,

  // Фазы мира (п.8)
  PHASE_1: 180,           // 3 мин — появляются вирусы
  PHASE_2: 360,           // 6 мин — часть карты закрывается
  PHASE_3: 600,           // 10 мин — опасные зоны и гиганты

  // Магниты (п.9)
  MAGNET_COUNT: 5,
  MAGNET_DURATION: 6,
  MAGNET_RANGE: 420,

  // Прочее
  BOT_RESPAWN: 4,
  NPC_RESPAWN: 6,
  HUNT_BOUNTY: 0.25,      // доля массы цели как награда
};

// Пороги эволюции (п.3): 100 → 500 → 1500 → 5000
G.EVO_MILESTONES = [100, 500, 1500, 5000];
