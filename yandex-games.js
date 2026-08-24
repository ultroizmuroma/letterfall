(() => {
  const LEADERBOARD_NAME = 'letterfall';
  const SUPPORTED_LANGUAGES = new Set(['ru']);
  const query = new URLSearchParams(window.location.search);
  const isLocal = window.location.protocol === 'file:'
    || ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const isYandexHost = /(^|\.)yandex\.(ru|com|by|kz|uz)$/.test(window.location.hostname)
    || window.location.hostname.endsWith('.yandex.net');
  const shouldLoadSdk = query.has('yandex-sdk') || isYandexHost;
  let sdk = null;
  let gameReadySent = false;
  let gameplayActive = false;
  let language = 'ru';
  let fullscreenAdRequest = null;
  let resolveInitialization;
  const initialization = new Promise((resolve) => {
    resolveInitialization = resolve;
  });

  function emit(type, detail = {}) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function gameReady() {
    const ready = sdk?.features?.LoadingAPI?.ready;
    if (typeof ready !== 'function' || gameReadySent) return false;
    ready.call(sdk.features.LoadingAPI);
    gameReadySent = true;
    return true;
  }

  function applyLanguage(detectedLanguage) {
    // Игра заявлена только на русском. Код языка всё равно обязателен: SDK
    // определяет его на старте, а для неподдерживаемых языков выбирается ru.
    language = SUPPORTED_LANGUAGES.has(detectedLanguage) ? detectedLanguage : 'ru';
    document.documentElement.lang = language;
    document.documentElement.dataset.gameLanguage = language;
    document.documentElement.dataset.yandexLanguage = detectedLanguage || 'ru';
  }

  function finishInitialization(detail) {
    resolveInitialization(detail);
  }

  function gameplayStart() {
    if (!sdk || gameplayActive) return;
    sdk.features?.GameplayAPI?.start();
    gameplayActive = true;
  }

  function gameplayStop() {
    if (!sdk || !gameplayActive) return;
    sdk.features?.GameplayAPI?.stop();
    gameplayActive = false;
  }

  async function initialize() {
    if (sdk) return;
    if (!window.YaGames) {
      finishInitialization({ status: 'failed', isPlatform: true });
      return;
    }
    try {
      sdk = await window.YaGames.init();
      const detectedLanguage = sdk.environment?.i18n?.lang;
      applyLanguage(detectedLanguage);
      sdk.on?.('game_api_pause', () => emit('letterfall:yandex-pause'));
      sdk.on?.('game_api_resume', () => emit('letterfall:yandex-resume'));
      emit('letterfall:yandex-ready', { sdk, language, detectedLanguage });
      finishInitialization({ status: 'ready', isPlatform: true, language, detectedLanguage });
    } catch (error) {
      console.warn('[Словобой: скоростная печать] Платформенный SDK не инициализирован.', error);
      finishInitialization({ status: 'failed', isPlatform: true });
    }
  }

  async function authorize() {
    if (!sdk) return false;
    let player = await sdk.getPlayer();
    if (player.isAuthorized()) return true;
    await sdk.auth.openAuthDialog();
    player = await sdk.getPlayer();
    return player.isAuthorized();
  }

  async function saveScore(score, level) {
    if (!sdk) return { saved: false, reason: 'SDK пока не готов.' };
    try {
      const available = await sdk.isAvailableMethod('leaderboards.setScore');
      if (!available) return { saved: false, reason: 'Авторизация нужна для общего рейтинга.', needsAuth: true };
      await sdk.leaderboards.setScore(LEADERBOARD_NAME, score, String(level));
      return { saved: true };
    } catch (error) {
      return { saved: false, reason: 'Не удалось сохранить результат в общем рейтинге.', error };
    }
  }

  async function authorizeAndSaveScore(score, level) {
    try {
      const authorized = await authorize();
      if (!authorized) return { saved: false, reason: 'Авторизация не завершена.' };
      return await saveScore(score, level);
    } catch (error) {
      return { saved: false, reason: 'Авторизация не завершена.', error };
    }
  }

  async function getLeaderboard() {
    if (!sdk) return [];
    try {
      const response = await sdk.leaderboards.getEntries(LEADERBOARD_NAME, { quantityTop: 10 });
      return response.entries.map((entry) => ({
        nickname: entry.player.publicName || 'Игрок',
        score: entry.score,
        level: entry.extraData ? Number(entry.extraData) || '—' : '—',
      }));
    } catch {
      return [];
    }
  }

  function showFullscreenAdv() {
    if (!sdk?.adv?.showFullscreenAdv) return Promise.resolve(false);
    if (fullscreenAdRequest) return fullscreenAdRequest;
    fullscreenAdRequest = new Promise((resolve) => {
      let settled = false;
      const finish = (wasShown = false) => {
        if (settled) return;
        settled = true;
        fullscreenAdRequest = null;
        resolve(Boolean(wasShown));
      };
      try {
        sdk.adv.showFullscreenAdv({
          callbacks: {
            onOpen: () => emit('letterfall:yandex-ad-open'),
            onClose: (wasShown) => {
              emit('letterfall:yandex-ad-close', { wasShown: Boolean(wasShown) });
              finish(wasShown);
            },
            onError: (error) => {
              emit('letterfall:yandex-ad-error', { error });
              finish(false);
            },
          },
        });
      } catch (error) {
        emit('letterfall:yandex-ad-error', { error });
        finish(false);
      }
    });
    return fullscreenAdRequest;
  }

  function loadSdk() {
    if (!shouldLoadSdk || isLocal) {
      applyLanguage('ru');
      finishInitialization({ status: 'ready', isPlatform: false, language, detectedLanguage: 'ru' });
      return;
    }
    const script = document.createElement('script');
    script.src = '/sdk.js';
    script.async = true;
    script.onload = initialize;
    script.onerror = () => {
      console.warn('[Словобой: скоростная печать] Не удалось загрузить платформенный SDK.');
      finishInitialization({ status: 'failed', isPlatform: true });
    };
    document.head.append(script);
  }

  window.LetterfallYandex = {
    leaderboardName: LEADERBOARD_NAME,
    isPlatform: () => Boolean(sdk),
    whenInitialized: () => initialization,
    gameReady,
    gameplayStart,
    gameplayStop,
    getLanguage: () => language,
    showFullscreenAdv,
    authorizeAndSaveScore,
    getLeaderboard,
  };

  loadSdk();
})();
