// ============ ЯАНДЕКС ИГРЫ SDK (требования 1.19, 1.12, 1.9, 2.14, 4.x) =
// Подключение: <script src="/sdk.js"></script> до этого файла (см. index.html).
// Локально SDK подменяет @yandex-games/sdk-dev-proxy (npm run dev).
// Отсутствие SDK (обычный статический сервер) не ломает игру — работаем без него.
(function (G) {
  const AD_COOLDOWN = 60 * 1000; // минимум между полноэкранной рекламой
  const BEST_KEY = 'mygameio_best';

  const platform = {
    sdk: null,
    started: false,
    initDone: false,
    readyRequested: false,
    readySent: false,
    gameplayOn: false,
    pausedByPlatform: false,
    adOpen: false,
    lastAd: 0,
    player: null,
    best: 0,

    /* ---------- инициализация (стартует сразу при загрузке скрипта) ---------- */
    start() {
      if (platform.started) return;
      platform.started = true;

      // локальный рекорд — читаем сразу, до SDK
      try {
        const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
        if (v > 0) platform.best = v;
      } catch (e) { /* localStorage недоступен */ }

      if (!window.YaGames) return; // SDK не подключён — игра работает без платформы

      YaGames.init()
        .then(sdk => {
          platform.sdk = sdk;
          platform.initDone = true;

          // 2.14: автоопределение языка строго на старте
          G.i18n.setLang(sdk.environment && sdk.environment.i18n && sdk.environment.i18n.lang);

          // 1.19.4: пауза/возобновление по событиям платформы
          if (typeof sdk.on === 'function') {
            sdk.on('game_api_pause', platform.onPlatformPause);
            sdk.on('game_api_resume', platform.onPlatformResume);
          }

          platform.sendReady();
          platform.showBanner(true);
          platform.loadPlayer();
        })
        .catch(() => {
          platform.sdk = null;
          platform.initDone = false;
        });
    },

    /* ---------- 1.19.2: LoadingAPI.ready() когда игрок может начать ---------- */
    notifyReady() {
      platform.readyRequested = true;
      platform.sendReady();
    },

    sendReady() {
      if (platform.readySent || !platform.readyRequested || !platform.initDone) return;
      platform.readySent = true;
      try { platform.sdk.features && platform.sdk.features.LoadingAPI && platform.sdk.features.LoadingAPI.ready(); }
      catch (e) { /* фича недоступна */ }
    },

    /* ---------- 1.19.3: GameplayAPI.start()/stop() ---------- */
    gameplayStart() {
      if (platform.gameplayOn || !platform.initDone) return;
      platform.gameplayOn = true;
      try { platform.sdk.features && platform.sdk.features.GameplayAPI && platform.sdk.features.GameplayAPI.start(); }
      catch (e) { /* ignore */ }
    },

    gameplayStop() {
      if (!platform.gameplayOn || !platform.initDone) return;
      platform.gameplayOn = false;
      try { platform.sdk.features && platform.sdk.features.GameplayAPI && platform.sdk.features.GameplayAPI.stop(); }
      catch (e) { /* ignore */ }
    },

    /* ---------- пауза по событиям платформы (и по скрытию вкладки локально) ---------- */
    onPlatformPause() {
      const st = G.state;
      if (G.game && G.game.mode === 'playing' && st && !st.paused) {
        st.paused = true;
        platform.pausedByPlatform = true;
        if (G.ui) G.ui.showPause();
      }
      platform.gameplayStop();
    },

    onPlatformResume() {
      const st = G.state;
      if (platform.pausedByPlatform && G.game && G.game.mode === 'playing' && st) {
        st.paused = false;
        platform.pausedByPlatform = false;
        if (G.ui) G.ui.hidePause();
        platform.gameplayStart();
      }
    },

    /* ---------- 1.12 / 4.4: полноэкранная реклама между сессиями ---------- */
    // cb вызывается всегда — и без SDK, и при кулдауне, и по onClose/onError.
    showAd(cb) {
      const sdk = platform.sdk;
      const now = Date.now();
      if (!sdk || platform.adOpen || now - platform.lastAd < AD_COOLDOWN) { cb(); return; }

      platform.lastAd = now;
      platform.adOpen = true;
      platform.gameplayStop(); // 4.7: на время рекламы геймплей остановлен (мы и так в состоянии смерти)
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        platform.adOpen = false;
        cb();
      };
      try {
        sdk.adv.showFullscreenAdv({
          callbacks: { onClose: finish, onError: finish },
        });
      } catch (e) { finish(); }
      // страховка, если callbacks не пришли
      setTimeout(finish, 120000);
    },

    /* ---------- липкий баннер: показываем только в меню (в игре мешал бы хотбару) ---------- */
    showBanner(show) {
      const sdk = platform.sdk;
      if (!sdk || !sdk.adv) return;
      try {
        const p = show ? sdk.adv.showBannerAdv && sdk.adv.showBannerAdv()
                       : sdk.adv.hideBannerAdv && sdk.adv.hideBannerAdv();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) { /* ignore */ }
    },

    /* ---------- 1.9: сохранение прогресса (рекорд) ---------- */
    loadPlayer() {
      const sdk = platform.sdk;
      if (!sdk || !sdk.getPlayer) return;
      sdk.getPlayer()
        .then(p => {
          platform.player = p;
          return p.getData(['best']);
        })
        .then(d => {
          if (d && typeof d.best === 'number' && d.best > platform.best) {
            platform.best = d.best;
            if (G.ui) G.ui.renderBest();
          }
        })
        .catch(() => { /* гость без данных */ });
    },

    saveBest(mass) {
      if (!(mass > 0)) return;
      if (mass > platform.best) {
        platform.best = Math.round(mass);
        try { localStorage.setItem(BEST_KEY, String(platform.best)); } catch (e) { /* ignore */ }
        if (G.ui) G.ui.renderBest();
      }
      if (platform.player && platform.player.setData) {
        platform.player.setData({ best: platform.best }).catch(() => {});
      }
    },
  };

  // скрытие вкладки локально = то же, что game_api_pause на платформе
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) platform.onPlatformPause();
    else platform.onPlatformResume();
  });

  G.ysdk = platform;
  platform.start();
})(window.G = window.G || {});
