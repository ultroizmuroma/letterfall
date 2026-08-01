(() => {
  const LEADERBOARD_NAME = 'letterfall_score';
  const SUPPORTED_LANGUAGES = new Set(['ru']);
  const query = new URLSearchParams(window.location.search);
  const isLocal = window.location.protocol === 'file:'
    || ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const isYandexHost = /(^|\.)yandex\.(ru|com|by|kz|uz)$/.test(window.location.hostname)
    || window.location.hostname.endsWith('.yandex.net');
  const shouldLoadSdk = query.has('yandex-sdk') || isYandexHost;
  let sdk = null;
  let readyRequested = false;
  let gameplayActive = false;
  let language = 'ru';
  let fullscreenAdRequest = null;

  function emit(type, detail = {}) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function gameReady() {
    readyRequested = true;
    sdk?.features?.LoadingAPI?.ready();
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
    if (!window.YaGames || sdk) return;
    try {
      sdk = await window.YaGames.init();
      const detectedLanguage = sdk.environment?.i18n?.lang;
      // Игра пока поддерживает русский, но язык всегда определяется через SDK.
      // Для неподдерживаемого языка используется явный русский fallback.
      language = SUPPORTED_LANGUAGES.has(detectedLanguage) ? detectedLanguage : 'ru';
      document.documentElement.lang = language;
      document.documentElement.dataset.gameLanguage = language;
      document.documentElement.dataset.yandexLanguage = detectedLanguage || 'ru';
      if (readyRequested) gameReady();
      sdk.on?.('game_api_pause', () => emit('letterfall:yandex-pause'));
      sdk.on?.('game_api_resume', () => emit('letterfall:yandex-resume'));
      emit('letterfall:yandex-ready', { sdk, language, detectedLanguage });
    } catch (error) {
      console.warn('[Словобой: скоростная печать] SDK Яндекс Игр не инициализирован.', error);
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
      return { saved: false, reason: 'Не удалось сохранить результат в рейтинге Яндекса.', error };
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
    if (!shouldLoadSdk || isLocal) return;
    const script = document.createElement('script');
    script.src = '/sdk.js';
    script.async = true;
    script.onload = initialize;
    script.onerror = () => console.warn('[Словобой: скоростная печать] Не удалось загрузить SDK Яндекс Игр.');
    document.head.append(script);
  }

  window.LetterfallYandex = {
    leaderboardName: LEADERBOARD_NAME,
    isPlatform: () => Boolean(sdk),
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
