const ROWS = 8;
const COLS = 7;
const ROUND_SECONDS = 90;
const STAR_TARGET = 12;
const MAX_HEALTH_POINTS = 6;
const BASE_FALL_STEP_MS = 820;
const MIN_FALL_STEP_MS = 420;
const FALL_SPEEDUP_PER_LEVEL_MS = 55;
const SCORE_PER_LETTER = 10;
const LEVEL_SCORE_STEP = 250;
const DECK_PREFETCH_THRESHOLD = 5;
const LETTERS = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЫЬЭЮЯ';
const WORD_PRESET_COLLECTION = WORD_PRESETS;
const GAME_MODES = { STARS: 'stars', FALLING: 'falling' };
const runtimeQuery = new URLSearchParams(window.location.search);
const isLocalRuntime = window.location.protocol === 'file:'
  || ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isProductionBuild = runtimeQuery.has('production') || (!isLocalRuntime && !runtimeQuery.has('dev'));

const boardElement = document.querySelector('#board');
const form = document.querySelector('#word-form');
const input = document.querySelector('#word-input');
const message = document.querySelector('#message');
const timerElement = document.querySelector('#timer-value');
const timerBox = document.querySelector('.timer');
const progressFill = document.querySelector('#progress-fill');
const starsValue = document.querySelector('#stars-value');
let targetStars = document.querySelector('#target-stars');
const goalEyebrow = document.querySelector('#goal-eyebrow');
const goalTitle = document.querySelector('#goal-title');
const scoreIndicator = document.querySelector('#score-indicator');
const scoreValue = document.querySelector('#score-value');
const levelIndicator = document.querySelector('#level-indicator');
const levelValue = document.querySelector('#level-value');
const healthIndicator = document.querySelector('#health-indicator');
const healthValue = document.querySelector('#health-value');
const wordDensitySelect = document.querySelector('#word-density-select');
const wordDensitySetting = document.querySelector('#word-density-setting');
const gameModeSelect = document.querySelector('#game-mode-select');
const wordPresetSelect = document.querySelector('#word-preset-select');
const recoveryFrequencySelect = document.querySelector('#recovery-frequency-select');
const recoveryFrequencySetting = document.querySelector('#recovery-frequency-setting');
const developerWords = document.querySelector('#developer-words');
const debugLogElement = document.querySelector('#debug-log');
const completedSessionsElement = document.querySelector('#completed-sessions');
const completedSessionsCount = document.querySelector('#completed-sessions-count');
const hintText = document.querySelector('#hint-text');
const hintButton = document.querySelector('#hint-button');
const hintCard = document.querySelector('#hint-card');
const modifierButton = document.querySelector('#modifier-button');
const modifierCard = document.querySelector('#modifier-card');
const modifierTitle = document.querySelector('#modifier-title');
const modifierDescription = document.querySelector('#modifier-description');
const modifierBadge = document.querySelector('#modifier-badge');
const rulesText = document.querySelector('#rules-text');
const restartButton = document.querySelector('#restart-button');
const pauseButton = document.querySelector('#pause-button');
const soundButton = document.querySelector('#sound-button');
const levelUpNotice = document.querySelector('#level-up-notice');
const leaderboardCard = document.querySelector('#leaderboard-card');
const leaderboardBody = document.querySelector('#leaderboard-body');
const modal = document.querySelector('#result-modal');
const resultIcon = document.querySelector('#result-icon');
const resultTitle = document.querySelector('#result-title');
const resultCopy = document.querySelector('#result-copy');
const playAgainButton = document.querySelector('#play-again-button');
const leaderboardPrompt = document.querySelector('#leaderboard-prompt');
const nicknameInput = document.querySelector('#nickname-input');
const saveLeaderboardButton = document.querySelector('#save-leaderboard-button');
const leaderboardSaveMessage = document.querySelector('#leaderboard-save-message');
const yandexScorePrompt = document.querySelector('#yandex-score-prompt');
const saveYandexScoreButton = document.querySelector('#save-yandex-score-button');
const yandexScoreMessage = document.querySelector('#yandex-score-message');
const startScreen = document.querySelector('#start-screen');
const presetChoices = document.querySelector('#preset-choices');
const startGameButton = document.querySelector('#start-game-button');

let board = [];
let stars = 0;
let timeLeft = ROUND_SECONDS;
let timerId = null;
let fallingTimerId = null;
let levelUpTimerId = null;
let locked = false;
let finished = false;
let bannedLetter = null;
let lastHint = null;
let minimumWordCount = Number(wordDensitySelect.value);
let nextCellId = 0;
let debugLog = [];
const MAX_DEBUG_ENTRIES = 200;
const SESSION_STORAGE_KEY = 'letterfall.completed-sessions.v1';
const MAX_COMPLETED_SESSIONS = 20;
const LEADERBOARD_STORAGE_KEY = 'letterfall.falling-leaderboard.v1';
const MAX_LEADERBOARD_ENTRIES = 10;
let sessionId = '';
let sessionStartedAt = '';
let gameMode = gameModeSelect.value;
let activeWordPreset = wordPresetSelect.value;
let activeWordBank = WORD_PRESET_COLLECTION[activeWordPreset].words;
let selectedStartPreset = activeWordPreset;
let fallingWord = null;
let healthPoints = MAX_HEALTH_POINTS;
let fallingScore = 0;
let fallingWordsCaught = 0;
let fallingLevel = 1;
let recoveryFrequency = Number(recoveryFrequencySelect.value);
let fallingWordsSinceRecovery = 0;
let lastFallingWord = '';
let fallingWordDeck = [];
let nextFallingWordDeck = [];
let fallingDeckNumber = 0;
let leaderboardSaved = false;
let paused = false;

function playSound(name) {
  window.LetterfallSounds?.play(name);
}

function updateSoundButton() {
  const enabled = window.LetterfallSounds?.isEnabled?.() ?? false;
  soundButton.textContent = enabled ? '🔊' : '🔇';
  soundButton.classList.toggle('is-muted', !enabled);
  soundButton.setAttribute('aria-label', enabled ? 'Выключить звук' : 'Включить звук');
  soundButton.title = enabled ? 'Выключить звук' : 'Включить звук';
}

function updatePauseButton() {
  const canTogglePause = !finished;
  pauseButton.disabled = !canTogglePause;
  pauseButton.textContent = paused ? '▶' : '⏸';
  pauseButton.setAttribute('aria-label', paused ? 'Продолжить игру' : 'Поставить игру на паузу');
  pauseButton.title = paused ? 'Продолжить игру' : 'Поставить игру на паузу';
}

function requestGameplayFullscreen() {
  const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (!isTouchDevice || document.fullscreenElement || document.webkitFullscreenElement) return;
  const requestFullscreen = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
  try {
    requestFullscreen?.call(document.documentElement)?.catch?.(() => {});
  } catch {
    // Некоторые браузеры запрещают fullscreen: игра остаётся в адаптивной сцене.
  }
}

function randomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function newCell(letter = randomLetter()) {
  return { id: nextCellId += 1, letter, star: Math.random() < 0.16 };
}

function activePresetTitle() {
  return WORD_PRESET_COLLECTION[activeWordPreset].title;
}

function setActiveWordPreset(presetId) {
  const preset = WORD_PRESET_COLLECTION[presetId] || WORD_PRESET_COLLECTION.common;
  activeWordPreset = WORD_PRESET_COLLECTION[presetId] ? presetId : 'common';
  activeWordBank = preset.words;
  wordPresetSelect.value = activeWordPreset;
  selectedStartPreset = activeWordPreset;
}

function renderPresetChoices() {
  presetChoices.replaceChildren();
  Object.entries(WORD_PRESET_COLLECTION).forEach(([presetId, preset]) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = `preset-choice${presetId === selectedStartPreset ? ' is-selected' : ''}`;
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(presetId === selectedStartPreset));
    option.innerHTML = `<strong>${preset.title}</strong>`;
    option.addEventListener('click', () => {
      selectedStartPreset = presetId;
      renderPresetChoices();
    });
    presetChoices.append(option);
  });
}

function openStartScreen() {
  clearInterval(timerId);
  clearInterval(fallingTimerId);
  finished = true;
  locked = true;
  input.disabled = true;
  updatePauseButton();
  modal.classList.add('is-hidden');
  window.LetterfallYandex?.gameplayStop();
  renderPresetChoices();
  startScreen.classList.remove('is-hidden');
}

function startSelectedPreset() {
  setActiveWordPreset(selectedStartPreset);
  startScreen.classList.add('is-hidden');
  requestGameplayFullscreen();
  window.LetterfallSounds?.unlock();
  startGame({ playStartSound: true });
}

function createBoard() {
  board = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => newCell()));
  return addGuaranteedWords(minimumWordCount);
}

function placeWord(word, row, col, direction) {
  for (let i = 0; i < word.length; i += 1) {
    const currentRow = row + (direction === 'vertical' ? i : 0);
    const currentCol = col + (direction === 'horizontal' ? i : 0);
    board[currentRow][currentCol] = newCell(word[i]);
  }
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function wordPlacementOptions(word, reservedCells) {
  const options = [];
  for (const direction of ['horizontal', 'vertical']) {
    const maxRow = direction === 'vertical' ? ROWS - word.length : ROWS - 1;
    const maxCol = direction === 'horizontal' ? COLS - word.length : COLS - 1;
    for (let row = 0; row <= maxRow; row += 1) {
      for (let col = 0; col <= maxCol; col += 1) {
        const cells = Array.from({ length: word.length }, (_, index) => {
          const currentRow = row + (direction === 'vertical' ? index : 0);
          const currentCol = col + (direction === 'horizontal' ? index : 0);
          return currentRow * COLS + currentCol;
        });
        if (cells.every((cell) => !reservedCells.has(cell))) options.push({ row, col, direction, cells });
      }
    }
  }
  return options;
}

function countSeedWords() {
  return activeWordBank.filter((word) => findWord(word).length > 0).length;
}

function addGuaranteedWords(targetCount) {
  const reservedCells = new Set();
  const existingWords = new Set(activeWordBank.filter((word) => findWord(word).length > 0));
  existingWords.forEach((word) => findWord(word).forEach((cell) => reservedCells.add(cell)));
  const missingWords = shuffle(activeWordBank.filter((word) => !existingWords.has(word)));
  const placements = [];

  for (const word of missingWords) {
    if (countSeedWords() >= targetCount) break;
    const options = wordPlacementOptions(word, reservedCells);
    if (!options.length) continue;
    const placement = options[Math.floor(Math.random() * options.length)];
    placeWord(word, placement.row, placement.col, placement.direction);
    placement.cells.forEach((cell) => reservedCells.add(cell));
    placements.push({ word, ...placement });
  }
  return placements;
}

function renderBoard(extraClasses = {}) {
  if (gameMode === GAME_MODES.FALLING) {
    renderFallingBoard();
    return;
  }
  boardElement.classList.remove('is-falling-mode');
  boardElement.innerHTML = '';
  board.flat().forEach((cell, index) => {
    const button = document.createElement('div');
    button.className = `cell${cell.star ? ' has-star' : ''}${extraClasses[index] ? ` ${extraClasses[index]}` : ''}`;
    button.dataset.cellId = cell.id;
    button.dataset.column = index % COLS;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${cell.letter}${cell.star ? ', со звездой' : ''}`);
    button.textContent = cell.letter;
    if (cell.star) {
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = '★';
      button.append(star);
    }
    boardElement.append(button);
  });
  renderDeveloperWords();
}

function renderFallingBoard() {
  boardElement.classList.add('is-falling-mode');
  boardElement.innerHTML = '';
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement('div');
      const wordIndex = fallingWord && row === fallingWord.row ? col - fallingWord.col : -1;
      const isWordCell = wordIndex >= 0 && wordIndex < fallingWord.word.length;
      cell.className = `cell${isWordCell ? ' is-active-word' : ' is-empty'}`;
      cell.setAttribute('role', 'gridcell');
      if (isWordCell) {
        const letter = fallingWord.word[wordIndex];
        cell.textContent = letter;
        cell.setAttribute('aria-label', `${letter}${fallingWord.bonusIndex === wordIndex ? ', с сердечком' : ''}`);
        if (fallingWord.bonusIndex === wordIndex) {
          const heart = document.createElement('span');
          heart.className = `word-heart${fallingWord.bonusType === 'half' ? ' is-half' : ''}`;
          heart.textContent = fallingWord.bonusType === 'half' ? '◐' : '♥';
          cell.append(heart);
        }
      } else {
        cell.setAttribute('aria-label', 'Пустая клетка');
      }
      boardElement.append(cell);
    }
  }
  renderDeveloperWords();
}

function createShuffledFallingDeck(avoidFirstWord = lastFallingWord) {
  const deck = shuffle(activeWordBank.filter((word) => word.length <= COLS));
  if (avoidFirstWord && deck[0] === avoidFirstWord && deck.length > 1) {
    const swapIndex = deck.findIndex((word) => word !== avoidFirstWord);
    [deck[0], deck[swapIndex]] = [deck[swapIndex], deck[0]];
  }
  return deck;
}

function prepareNextFallingDeck() {
  if (nextFallingWordDeck.length) return;
  const previousDeckLastWord = fallingWordDeck[fallingWordDeck.length - 1] || lastFallingWord;
  nextFallingWordDeck = createShuffledFallingDeck(previousDeckLastWord);
  logDebug('deck_shuffle', {
    deck: fallingDeckNumber + 1,
    size: nextFallingWordDeck.length,
    remaining: fallingWordDeck.length,
  });
}

function activateNextFallingDeck() {
  prepareNextFallingDeck();
  fallingWordDeck = nextFallingWordDeck;
  nextFallingWordDeck = [];
  fallingDeckNumber += 1;
  logDebug('deck_start', { deck: fallingDeckNumber, size: fallingWordDeck.length });
}

function resetFallingDecks() {
  fallingWordDeck = [];
  nextFallingWordDeck = [];
  fallingDeckNumber = 0;
  prepareNextFallingDeck();
  activateNextFallingDeck();
}

function takeWordFromFallingDeck() {
  if (!fallingWordDeck.length) activateNextFallingDeck();
  const word = fallingWordDeck.shift();
  if (fallingWordDeck.length <= DECK_PREFETCH_THRESHOLD) prepareNextFallingDeck();
  return word;
}

function createFallingWord() {
  const word = takeWordFromFallingDeck();
  const canRecover = fallingWordsSinceRecovery >= recoveryFrequency - 1;
  const bonusType = canRecover && Math.random() < .45
    ? Math.random() < .5 ? 'full' : 'half'
    : null;
  if (bonusType) fallingWordsSinceRecovery = 0;
  else fallingWordsSinceRecovery += 1;
  lastFallingWord = word;
  return {
    word,
    row: 0,
    col: Math.floor(Math.random() * (COLS - word.length + 1)),
    bonusType,
    bonusIndex: bonusType ? Math.floor(Math.random() * word.length) : null,
  };
}

function spawnFallingWord() {
  if (finished || gameMode !== GAME_MODES.FALLING) return;
  fallingWord = createFallingWord();
  logDebug('falling_spawn', {
    word: fallingWord.word,
    column: fallingWord.col,
    bonus: fallingWord.bonusType,
    level: fallingLevel,
    stepMs: currentFallStepMs(),
    deck: fallingDeckNumber,
    deckRemaining: fallingWordDeck.length,
  });
  renderFallingBoard();
}

function normalizeWord(value) {
  return value.toLocaleUpperCase('ru-RU').replace(/[^А-ЯЁ]/g, '');
}

function findWordMatches(word) {
  const directions = [
    [0, 1], [1, 0],
  ];
  const matches = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      for (const [rowStep, colStep] of directions) {
        const endRow = row + rowStep * (word.length - 1);
        const endCol = col + colStep * (word.length - 1);
        if (endRow < 0 || endRow >= ROWS || endCol < 0 || endCol >= COLS) continue;

        let isMatch = true;
        const cells = [];
        for (let i = 0; i < word.length; i += 1) {
          const currentRow = row + rowStep * i;
          const currentCol = col + colStep * i;
          if (board[currentRow][currentCol].letter !== word[i]) {
            isMatch = false;
            break;
          }
          cells.push(currentRow * COLS + currentCol);
        }
        if (isMatch) matches.push(cells);
      }
    }
  }
  return matches;
}

function findWord(word) {
  return [...new Set(findWordMatches(word).flat())];
}

function wordsOnBoard() {
  if (gameMode === GAME_MODES.FALLING) return fallingWord ? [fallingWord.word] : [];
  return activeWordBank.filter((word) => findWordMatches(word).length > 0);
}

function captureCellPositions() {
  return new Map([...boardElement.querySelectorAll('.cell')].map((cell) => [
    Number(cell.dataset.cellId),
    cell.getBoundingClientRect(),
  ]));
}

function captureBoardState() {
  return board.map((row) => row.map((cell) => ({ id: cell.id, letter: cell.letter })));
}

function changedColumns(before, after) {
  return Array.from({ length: COLS }, (_, column) => column)
    .filter((column) => before.some((row, rowIndex) => row[column].id !== after[rowIndex][column].id));
}

function boardRows(snapshot) {
  return snapshot.map((row) => row.map((cell) => cell.letter).join(''));
}

function activeBoardRows() {
  if (gameMode !== GAME_MODES.FALLING) return boardRows(captureBoardState());
  const rows = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => '·'));
  if (fallingWord) {
    [...fallingWord.word].forEach((letter, index) => {
      rows[fallingWord.row][fallingWord.col + index] = letter;
    });
  }
  return rows.map((row) => row.join(''));
}

function animateGravity(previousPositions, fallingColumns) {
  const cells = [...boardElement.querySelectorAll('.cell')];
  cells.forEach((cell) => {
    const oldPosition = previousPositions.get(Number(cell.dataset.cellId));
    const newPosition = cell.getBoundingClientRect();
    const column = Number(cell.dataset.column);
    if (!fallingColumns.has(column)) return;
    const horizontalShift = oldPosition ? oldPosition.left - newPosition.left : 0;
    const verticalShift = oldPosition ? oldPosition.top - newPosition.top : -(newPosition.height + 8) * 1.5;
    cell.classList.add('is-falling');
    cell.style.transition = 'none';
    cell.style.opacity = oldPosition ? '1' : '.25';
    cell.style.transform = `translate(${horizontalShift}px, ${verticalShift}px)`;
  });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    cells.forEach((cell) => {
      cell.style.transition = 'transform 460ms cubic-bezier(.16, 1, .3, 1), opacity 320ms ease-out';
      cell.style.opacity = '1';
      cell.style.transform = 'translate(0, 0)';
    });
  }));

  setTimeout(() => {
    cells.forEach((cell) => {
      cell.classList.remove('is-falling');
      cell.style.removeProperty('transition');
      cell.style.removeProperty('transform');
      cell.style.removeProperty('opacity');
    });
  }, 480);
}

function renderDeveloperWords() {
  const words = wordsOnBoard();
  developerWords.replaceChildren();
  if (!words.length) {
    const empty = document.createElement('span');
    empty.className = 'developer-words-empty';
    empty.textContent = 'Гарантированные слова появятся после генерации поля.';
    developerWords.append(empty);
    return;
  }
  words.forEach((word) => {
    const tag = document.createElement('span');
    tag.className = 'developer-word';
    tag.textContent = word;
    developerWords.append(tag);
  });
}

function formatColumns(columns) {
  return columns.length ? columns.map((column) => column + 1).join(', ') : '—';
}

function debugEntryText(entry) {
  switch (entry.type) {
    case 'round':
      if (entry.mode === GAME_MODES.FALLING) return `Словобой: скоростная печать, колода «${entry.presetTitle}»: ${entry.health} ♥ на старте; бонус не чаще 1 из ${entry.recoveryFrequency} слов.`;
      return `Старт, колода «${entry.presetTitle}»: минимум ${entry.minimum} слов; на поле — ${entry.words.join(', ')}.`;
    case 'input':
      return `Ввод: «${entry.raw || '∅'}» → «${entry.word || '∅'}».`;
    case 'match':
      return `Совпало «${entry.word}»: ${entry.cells} блоков, колонки ${formatColumns(entry.columns)}${entry.stars ? `, +${entry.stars} ★` : ''}.`;
    case 'gravity':
      return `Падение после «${entry.word}»: ожидаемо ${formatColumns(entry.columns)}, изменены ${formatColumns(entry.changedColumns)}; новых блоков ${entry.newBlocks}.`;
    case 'word_goal':
      return `Цель — ${entry.target} слов, сейчас ${entry.actual}. Существующие клетки не менялись.`;
    case 'board_rebuild':
      return `На поле не осталось слов — поле пересобрано (${entry.words.length} слов).`;
    case 'rejected':
      return `Не засчитано: ${entry.reason}.`;
    case 'hint':
      return `Лампочка подсветила начало слова «${entry.word}».`;
    case 'modifier':
      return entry.letter ? `Включён запрет буквы «${entry.letter}».` : 'Запрет буквы отключён.';
    case 'finish':
      if (entry.mode === GAME_MODES.FALLING) return entry.won ? `Словобой: скоростная печать пройден: ${entry.score} очков.` : `Словобой: скоростная печать завершён: ${entry.score} очков, уровень ${entry.level}.`;
      return entry.won ? `Раунд выигран: ${entry.stars} ★.` : `Время вышло: ${entry.stars} ★.`;
    case 'session_saved':
      return `Сессия сохранена: ${entry.events} событий.`;
    case 'falling_spawn':
      return `Появилось «${entry.word}» в колонке ${entry.column + 1}${entry.bonus ? `, бонус: ${entry.bonus === 'full' ? '♥' : '◐'}` : ''}; колода ${entry.deck}, осталось ${entry.deckRemaining}, ур. ${entry.level}, шаг ${entry.stepMs} мс.`;
    case 'deck_shuffle':
      return `Перемешана следующая колода ${entry.deck}: ${entry.size} слов. В текущей осталось ${entry.remaining}.`;
    case 'deck_start':
      return `Началась колода ${entry.deck}: ${entry.size} слов.`;
    case 'falling_match':
      return `Поймано «${entry.word}»: +${entry.points} очков${entry.bonus ? `, восстановлено ${entry.bonus === 'full' ? '1' : '½'} ♥` : ''}. Всего ${entry.score}.`;
    case 'life_lost':
      return `«${entry.word}» достигло низа: −1 ♥, осталось ${entry.health / 2}.`;
    case 'level_up':
      return `Новый уровень ${entry.level}: скорость падения ${entry.stepMs} мс.`;
    case 'leaderboard_saved':
      return `Рекорд сохранён: ${entry.nickname}, ${entry.score} очков, уровень ${entry.level}.`;
    default:
      return entry.type;
  }
}

function renderDebugLog() {
  debugLogElement.replaceChildren();
  if (!debugLog.length) {
    const empty = document.createElement('li');
    empty.className = 'debug-log-empty';
    empty.textContent = 'Журнал появится после старта раунда.';
    debugLogElement.append(empty);
    return;
  }
  debugLog.slice(-12).reverse().forEach((entry) => {
    const item = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = entry.time;
    item.append(time, document.createTextNode(debugEntryText(entry)));
    debugLogElement.append(item);
  });
}

function logDebug(type, data = {}) {
  if (isProductionBuild) return;
  const elapsed = gameMode === GAME_MODES.FALLING && sessionStartedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000))
    : ROUND_SECONDS - timeLeft;
  const entry = {
    type,
    time: `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`,
    ...data,
  };
  debugLog.push(entry);
  if (debugLog.length > MAX_DEBUG_ENTRIES) debugLog.shift();
  window.__letterfallDebugLog = debugLog;
  console.info('[Словобой: скоростная печать]', entry);
  renderDebugLog();
}

function resetDebugLog() {
  debugLog = [];
  if (isProductionBuild) return;
  window.__letterfallDebugLog = debugLog;
  renderDebugLog();
}

function readCompletedSessions() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function renderCompletedSessions(sessions = readCompletedSessions()) {
  if (isProductionBuild) return;
  window.__letterfallCompletedSessions = sessions;
  completedSessionsCount.textContent = sessions.length;
  completedSessionsElement.replaceChildren();
  if (!sessions.length) {
    const empty = document.createElement('li');
    empty.className = 'debug-log-empty';
    empty.textContent = 'Завершённых сессий пока нет.';
    completedSessionsElement.append(empty);
    return;
  }
  sessions.slice(0, 5).forEach((session) => {
    const item = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = session.won ? '✓' : '⌛';
    const fallingSummary = typeof session.fallingWordsCaught === 'number'
      ? `${session.fallingScore || 0} очков · ${session.fallingWordsCaught} слов`
      : `${session.fallingScore || 0} слов`;
    const summary = session.mode === GAME_MODES.FALLING
      ? `${session.won ? 'Словобой: скоростная печать пройден' : 'Словобой: скоростная печать'} · ${fallingSummary} · ${session.events.length} событий.`
      : `${session.won ? 'Победа' : 'Время'} · ${session.stars}/${STAR_TARGET} ★ · ${session.events.length} событий.`;
    item.append(time, summary);
    completedSessionsElement.append(item);
  });
}

function createSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function saveCompletedSession(won) {
  if (isProductionBuild) return;
  logDebug('session_saved', { events: debugLog.length + 1 });
  const session = {
    id: sessionId,
    startedAt: sessionStartedAt,
    finishedAt: new Date().toISOString(),
    won,
    mode: gameMode,
    stars,
    fallingScore,
    fallingWordsCaught,
    fallingLevel,
    healthPoints,
    target: STAR_TARGET,
    timeLeft,
    minimumWordCount,
    recoveryFrequency,
    wordPreset: activeWordPreset,
    wordPresetTitle: activePresetTitle(),
    finalBoard: activeBoardRows(),
    wordsOnBoard: wordsOnBoard(),
    events: debugLog.map((entry) => ({ ...entry })),
  };
  const sessions = readCompletedSessions();
  sessions.unshift(session);
  const updatedSessions = sessions.slice(0, MAX_COMPLETED_SESSIONS);
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessions));
  } catch {
    // Игра остаётся рабочей, даже если браузер запретил локальное хранилище.
  }
  renderCompletedSessions(updatedSessions);
}

function readLeaderboard() {
  try {
    const stored = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    const entries = stored ? JSON.parse(stored) : [];
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

function renderLeaderboard(entries = readLeaderboard()) {
  leaderboardBody.replaceChildren();
  if (!entries.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'leaderboard-empty';
    cell.textContent = 'Пока нет рекордов.';
    row.append(cell);
    leaderboardBody.append(row);
    return;
  }
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    const cells = [index + 1, entry.nickname, entry.score, entry.level];
    cells.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    });
    leaderboardBody.append(row);
  });
}

async function loadYandexLeaderboard() {
  const entries = await window.LetterfallYandex?.getLeaderboard?.();
  if (entries?.length) renderLeaderboard(entries);
}

function updateCurrentSessionLeaderboard(entry) {
  const sessions = readCompletedSessions();
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return;
  session.leaderboard = { nickname: entry.nickname, score: entry.score, level: entry.level };
  session.events = debugLog.map((debugEntry) => ({ ...debugEntry }));
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Сохранение рекорда не должно мешать завершённой игре.
  }
  renderCompletedSessions(sessions);
}

function saveLeaderboardScore() {
  if (leaderboardSaved || gameMode !== GAME_MODES.FALLING || !finished || healthPoints > 0) return;
  const nickname = nicknameInput.value.trim().replace(/\s+/g, ' ').slice(0, 16);
  if (!nickname) {
    leaderboardSaveMessage.textContent = 'Введите никнейм, чтобы попасть в таблицу.';
    nicknameInput.focus();
    return;
  }
  const entry = {
    id: `${sessionId}-score`,
    nickname,
    score: fallingScore,
    level: fallingLevel,
    words: fallingWordsCaught,
    createdAt: new Date().toISOString(),
  };
  const entries = [...readLeaderboard(), entry]
    .sort((left, right) => right.score - left.score || right.level - left.level || left.createdAt.localeCompare(right.createdAt))
    .slice(0, MAX_LEADERBOARD_ENTRIES);
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    leaderboardSaveMessage.textContent = 'Не удалось сохранить рекорд в этом браузере.';
    return;
  }
  leaderboardSaved = true;
  nicknameInput.disabled = true;
  saveLeaderboardButton.disabled = true;
  leaderboardSaveMessage.textContent = 'Рекорд сохранён в таблице лидеров.';
  logDebug('leaderboard_saved', { nickname, score: fallingScore, level: fallingLevel });
  updateCurrentSessionLeaderboard(entry);
  renderLeaderboard(entries);
}

async function saveYandexLeaderboardScore() {
  if (gameMode !== GAME_MODES.FALLING || !finished || healthPoints > 0) return;
  saveYandexScoreButton.disabled = true;
  yandexScoreMessage.textContent = 'Сохраняем результат…';
  const result = await window.LetterfallYandex?.authorizeAndSaveScore?.(fallingScore, fallingLevel);
  if (!result?.saved) {
    yandexScoreMessage.textContent = result?.reason || 'Рейтинг Яндекса пока недоступен.';
    saveYandexScoreButton.disabled = false;
    return;
  }
  yandexScoreMessage.textContent = 'Результат сохранён в общем рейтинге.';
  logDebug('leaderboard_saved', { nickname: 'Яндекс ID', score: fallingScore, level: fallingLevel });
  loadYandexLeaderboard();
}

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `message${type ? ` is-${type}` : ''}`;
}

function setPaused(value) {
  if (paused === value || finished) return;
  paused = value;
  input.disabled = paused || locked;
  if (paused) {
    window.LetterfallYandex?.gameplayStop();
    window.LetterfallSounds?.pause();
    setMessage('Игра на паузе.', 'error');
    updatePauseButton();
    return;
  }
  window.LetterfallYandex?.gameplayStart();
  window.LetterfallSounds?.resume();
  setMessage('Игра продолжена.');
  updatePauseButton();
  if (!locked) input.focus();
}

function updateHud() {
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  timerElement.textContent = `${minutes}:${seconds}`;
  timerBox.classList.toggle('is-low', timeLeft <= 15);
  if (gameMode === GAME_MODES.FALLING) {
    const fullHearts = Math.floor(healthPoints / 2);
    const halfHeart = healthPoints % 2;
    healthValue.textContent = `${'♥'.repeat(fullHearts)}${halfHeart ? '◐' : ''}${'♡'.repeat(3 - fullHearts - halfHeart)}`;
    healthIndicator.setAttribute('aria-label', `Осталось жизней: ${healthPoints / 2}`);
    scoreValue.textContent = fallingScore;
    levelValue.textContent = fallingLevel;
    return;
  }
  starsValue.textContent = `${stars} / ${STAR_TARGET}`;
  targetStars.textContent = STAR_TARGET;
  progressFill.style.width = `${Math.min(100, (stars / STAR_TARGET) * 100)}%`;
}

function currentFallStepMs() {
  return Math.max(MIN_FALL_STEP_MS, BASE_FALL_STEP_MS - (fallingLevel - 1) * FALL_SPEEDUP_PER_LEVEL_MS);
}

function levelForScore(score) {
  return Math.floor(score / LEVEL_SCORE_STEP) + 1;
}

function showLevelUp(level) {
  clearTimeout(levelUpTimerId);
  levelUpNotice.classList.add('is-hidden');
  void levelUpNotice.offsetWidth;
  levelUpNotice.textContent = `Новый уровень! ${level}`;
  levelUpNotice.classList.remove('is-hidden');
  levelUpTimerId = setTimeout(() => levelUpNotice.classList.add('is-hidden'), 1800);
  playSound('level');
}

function updateModeUi() {
  const isFallingMode = gameMode === GAME_MODES.FALLING;
  scoreIndicator.classList.toggle('is-hidden', !isFallingMode);
  levelIndicator.classList.toggle('is-hidden', !isFallingMode);
  healthIndicator.classList.toggle('is-hidden', !isFallingMode);
  timerBox.classList.toggle('is-hidden', isFallingMode);
  document.querySelector('.progress-wrap').classList.toggle('is-hidden', isFallingMode);
  modifierCard.classList.toggle('is-hidden', isFallingMode);
  hintCard.classList.toggle('is-hidden', isFallingMode);
  wordDensitySetting.classList.toggle('is-hidden', isFallingMode);
  recoveryFrequencySetting.classList.toggle('is-hidden', !isFallingMode);
  leaderboardCard.classList.toggle('is-hidden', !isFallingMode);
  if (isFallingMode) {
    goalEyebrow.textContent = `Словобой: скоростная печать · ${activePresetTitle()}`;
    goalTitle.textContent = 'Не дайте словам упасть';
    rulesText.textContent = 'Введите падающее слово до нижней границы. За каждую букву — 10 очков; с уровнем скорость растёт.';
    document.querySelector('.word-label').textContent = 'Напечатайте падающее слово';
    input.placeholder = 'Слово на поле';
  } else {
    goalEyebrow.textContent = 'Задание уровня';
    goalTitle.innerHTML = 'Соберите <span id="target-stars">12</span> звёзд';
    targetStars = document.querySelector('#target-stars');
    rulesText.textContent = 'Введите слово, которое видите в блоках. Подходящие буквы исчезнут, а блоки сверху упадут вниз.';
    document.querySelector('.word-label').textContent = 'Найдите слово на поле';
    input.placeholder = 'Например, ПЛЕЕР';
  }
}

function showHint() {
  if (locked || finished || paused) return;
  const words = wordsOnBoard();
  const candidates = words.filter((word) => word !== lastHint);
  const word = (candidates.length ? candidates : words)[Math.floor(Math.random() * (candidates.length ? candidates.length : words.length))];
  if (!word) return;
  const matches = findWordMatches(word);
  const match = matches[Math.floor(Math.random() * matches.length)];
  const firstLetterCell = match[0];
  const classes = { [firstLetterCell]: 'is-hinted' };
  renderBoard(classes);
  lastHint = word;
  logDebug('hint', { word });
  hintText.textContent = 'Первая буква одного слова подсвечена.';
  hintButton.disabled = true;
  setTimeout(() => {
    renderBoard();
    hintButton.disabled = false;
  }, 1800);
}

function toggleModifier() {
  if (locked || finished || paused) return;
  if (bannedLetter) {
    bannedLetter = null;
    modifierTitle.textContent = 'Свободная игра';
    modifierDescription.textContent = 'Можно использовать любые буквы.';
    modifierBadge.textContent = 'ВКЛ';
    modifierBadge.classList.remove('is-danger');
    modifierButton.textContent = 'Добавить запрет';
    logDebug('modifier');
    setMessage('Модификатор отключён. Вводите любое слово.');
  } else {
    const lettersOnBoard = [...new Set(board.flat().map((cell) => cell.letter))];
    bannedLetter = lettersOnBoard[Math.floor(Math.random() * lettersOnBoard.length)];
    modifierTitle.textContent = `Нельзя букву «${bannedLetter}»`;
    modifierDescription.textContent = `Слова с буквой «${bannedLetter}» в этом раунде не засчитываются.`;
    modifierBadge.textContent = 'ЗАПРЕТ';
    modifierBadge.classList.add('is-danger');
    modifierButton.textContent = 'Убрать запрет';
    logDebug('modifier', { letter: bannedLetter });
    setMessage(`Активен запрет: не используйте «${bannedLetter}».`);
  }
}

function collapseBoard(indices, word) {
  const previousPositions = captureCellPositions();
  const beforeMove = captureBoardState();
  const destroyed = new Set(indices);
  const fallingColumns = [...new Set(indices.map((index) => index % COLS))].sort((left, right) => left - right);
  const starsFound = indices.filter((index) => board[Math.floor(index / COLS)][index % COLS].star).length;
  stars += starsFound;
  updateHud();

  const animationClasses = Object.fromEntries(indices.map((index) => [index, 'is-destroying']));
  renderBoard(animationClasses);
  setTimeout(() => {
    for (let col = 0; col < COLS; col += 1) {
      const survivors = [];
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        const index = row * COLS + col;
        if (!destroyed.has(index)) survivors.push(board[row][col]);
      }
      while (survivors.length < ROWS) survivors.push(newCell());
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        board[row][col] = survivors[ROWS - 1 - row];
      }
    }
    const afterGravity = captureBoardState();
    logDebug('gravity', {
      word,
      columns: fallingColumns,
      changedColumns: changedColumns(beforeMove, afterGravity),
      newBlocks: indices.length,
      beforeRows: boardRows(beforeMove),
      afterRows: boardRows(afterGravity),
    });
    const wordsAfterGravity = wordsOnBoard();
    let boardWasRebuilt = false;
    if (stars < STAR_TARGET && !wordsAfterGravity.length) {
      const rebuildPlacements = createBoard();
      const afterRebuild = captureBoardState();
      boardWasRebuilt = true;
      logDebug('board_rebuild', {
        words: wordsOnBoard(),
        placements: rebuildPlacements.map((placement) => placement.word),
        changedColumns: changedColumns(afterGravity, afterRebuild),
        beforeRows: boardRows(afterGravity),
        afterRows: boardRows(afterRebuild),
      });
      setMessage('На поле не осталось слов — собрали новое поле.', 'success');
    } else if (wordsAfterGravity.length < minimumWordCount) {
      logDebug('word_goal', {
        target: minimumWordCount,
        actual: wordsAfterGravity.length,
        words: wordsAfterGravity,
      });
    }
    renderBoard();
    if (!boardWasRebuilt) animateGravity(previousPositions, new Set(fallingColumns));
    if (stars >= STAR_TARGET) {
      setTimeout(() => finish(true), 480);
      return;
    }
    setTimeout(() => {
      locked = false;
      input.disabled = false;
      input.focus();
    }, 480);
  }, 260);
}

function advanceFallingWord() {
  if (finished || locked || paused || gameMode !== GAME_MODES.FALLING || !fallingWord) return;
  if (fallingWord.row < ROWS - 1) {
    fallingWord.row += 1;
    renderFallingBoard();
    return;
  }
  const missedWord = fallingWord.word;
  fallingWord = null;
  healthPoints = Math.max(0, healthPoints - 2);
  playSound('lost');
  updateHud();
  logDebug('life_lost', { word: missedWord, health: healthPoints });
  if (healthPoints === 0) {
    finish(false);
    return;
  }
  setMessage(`«${missedWord}» достигло низа. Потеряна 1 жизнь.`, 'error');
  spawnFallingWord();
}

function submitFallingWord(rawWord, word) {
  if (!fallingWord) return;
  if (word !== fallingWord.word) {
    logDebug('rejected', { reason: `«${word}» не совпадает с падающим словом` });
    setMessage('Это не текущее падающее слово.', 'error');
    return;
  }
  const caughtWord = fallingWord;
  fallingWord = null;
  const points = caughtWord.word.length * SCORE_PER_LETTER;
  const previousLevel = fallingLevel;
  fallingScore += points;
  fallingWordsCaught += 1;
  fallingLevel = levelForScore(fallingScore);
  if (caughtWord.bonusType === 'full') healthPoints = Math.min(MAX_HEALTH_POINTS, healthPoints + 2);
  if (caughtWord.bonusType === 'half') healthPoints = Math.min(MAX_HEALTH_POINTS, healthPoints + 1);
  playSound(caughtWord.bonusType ? 'heal' : 'correct');
  input.value = '';
  updateHud();
  logDebug('falling_match', {
    word,
    raw: rawWord,
    bonus: caughtWord.bonusType,
    health: healthPoints,
    points,
    score: fallingScore,
    level: fallingLevel,
  });
  if (fallingLevel > previousLevel) {
    startFallingTimer();
    showLevelUp(fallingLevel);
    logDebug('level_up', { level: fallingLevel, stepMs: currentFallStepMs() });
  }
  setMessage(
    caughtWord.bonusType === 'full'
      ? `«${word}» поймано! +${points} очков и 1 жизнь ♥`
      : caughtWord.bonusType === 'half'
        ? `«${word}» поймано! +${points} очков и ½ жизни ◐`
        : `«${word}» поймано! +${points} очков`,
    'success',
  );
  spawnFallingWord();
  input.focus();
}

function submitWord(event) {
  event.preventDefault();
  window.LetterfallSounds?.unlock();
  if (locked || finished || paused) return;
  const rawWord = input.value;
  const word = normalizeWord(rawWord);
  input.value = word;
  logDebug('input', { raw: rawWord, word });
  if (gameMode === GAME_MODES.FALLING) {
    submitFallingWord(rawWord, word);
    return;
  }
  if (word.length < 2) {
    logDebug('rejected', { reason: 'нужно минимум две буквы' });
    setMessage('Введите хотя бы две буквы.', 'error');
    return;
  }
  if (bannedLetter && word.includes(bannedLetter)) {
    logDebug('rejected', { reason: `использована запрещённая буква «${bannedLetter}»` });
    setMessage(`Букву «${bannedLetter}» сейчас использовать нельзя.`, 'error');
    return;
  }
  const cells = findWord(word);
  if (!cells.length) {
    logDebug('rejected', { reason: `«${word}» не найдено в разрешённом направлении` });
    setMessage(`Слово «${word}» не найдено слева направо или сверху вниз.`, 'error');
    return;
  }
  locked = true;
  input.disabled = true;
  input.value = '';
  const starsInside = cells.filter((index) => board[Math.floor(index / COLS)][index % COLS].star).length;
  logDebug('match', {
    word,
    cells: cells.length,
    columns: [...new Set(cells.map((index) => index % COLS))].sort((left, right) => left - right),
    stars: starsInside,
  });
  setMessage(starsInside ? `Слово «${word}» найдено! +${starsInside} ★` : `Слово «${word}» найдено!`, 'success');
  const foundClasses = Object.fromEntries(cells.map((index) => [index, 'is-found']));
  renderBoard(foundClasses);
  setTimeout(() => collapseBoard(cells, word), 220);
}

function finish(won) {
  if (finished) return;
  finished = true;
  locked = true;
  clearInterval(timerId);
  clearInterval(fallingTimerId);
  input.disabled = true;
  window.LetterfallYandex?.gameplayStop();
  updatePauseButton();
  playSound(won ? 'level' : 'finish');
  logDebug('finish', { won, stars, score: fallingScore, health: healthPoints, level: fallingLevel, mode: gameMode });
  saveCompletedSession(won);
  resultIcon.textContent = won ? '★' : gameMode === GAME_MODES.FALLING ? '♥' : '⌛';
  resultTitle.textContent = won
    ? gameMode === GAME_MODES.FALLING ? 'Слова не прорвались!' : 'Звёзды собраны!'
    : gameMode === GAME_MODES.FALLING && healthPoints === 0 ? 'Жизни закончились' : 'Время вышло';
  resultCopy.textContent = gameMode === GAME_MODES.FALLING
    ? won
      ? `Вы поймали ${fallingWordsCaught} слов и набрали ${fallingScore} очков.`
      : `Поймано ${fallingWordsCaught} слов, набрано ${fallingScore} очков. Ваш уровень: ${fallingLevel}.`
    : won
      ? `Вы собрали ${stars} из ${STAR_TARGET} звёзд и успели до конца раунда.`
      : `Собрано ${stars} из ${STAR_TARGET} звёзд. Попробуйте находить слова подлиннее — так проще поймать звёзды.`;
  const shouldOfferLeaderboard = gameMode === GAME_MODES.FALLING && healthPoints === 0;
  leaderboardPrompt.classList.toggle('is-hidden', !shouldOfferLeaderboard);
  const shouldOfferYandexLeaderboard = shouldOfferLeaderboard && Boolean(window.LetterfallYandex?.isPlatform?.());
  yandexScorePrompt.classList.toggle('is-hidden', !shouldOfferYandexLeaderboard);
  if (shouldOfferLeaderboard) {
    nicknameInput.value = '';
    nicknameInput.disabled = false;
    saveLeaderboardButton.disabled = false;
    leaderboardSaveMessage.textContent = '';
    yandexScoreMessage.textContent = '';
    saveYandexScoreButton.disabled = false;
  }
  modal.classList.remove('is-hidden');
  if (shouldOfferLeaderboard) setTimeout(() => nicknameInput.focus(), 0);
}

function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    if (finished || locked || paused) return;
    timeLeft -= 1;
    updateHud();
    if (timeLeft <= 0) finish(false);
  }, 1000);
}

function startFallingTimer() {
  clearInterval(fallingTimerId);
  fallingTimerId = setInterval(advanceFallingWord, currentFallStepMs());
}

function startGame({ playStartSound = false } = {}) {
  clearInterval(timerId);
  clearInterval(fallingTimerId);
  clearTimeout(levelUpTimerId);
  stars = 0;
  timeLeft = ROUND_SECONDS;
  locked = false;
  finished = false;
  bannedLetter = null;
  lastHint = null;
  nextCellId = 0;
  fallingWord = null;
  healthPoints = MAX_HEALTH_POINTS;
  fallingScore = 0;
  fallingWordsCaught = 0;
  fallingLevel = 1;
  recoveryFrequency = Number(recoveryFrequencySelect.value);
  fallingWordsSinceRecovery = 0;
  lastFallingWord = '';
  fallingWordDeck = [];
  nextFallingWordDeck = [];
  fallingDeckNumber = 0;
  leaderboardSaved = false;
  paused = false;
  sessionId = createSessionId();
  sessionStartedAt = new Date().toISOString();
  resetDebugLog();
  renderCompletedSessions();
  renderLeaderboard();
  loadYandexLeaderboard();
  input.value = '';
  input.disabled = false;
  updatePauseButton();
  hintText.textContent = 'Лампочка покажет первую букву одного слова.';
  hintButton.disabled = false;
  modifierTitle.textContent = 'Свободная игра';
  modifierDescription.textContent = 'Можно использовать любые буквы.';
  modifierBadge.textContent = 'ВКЛ';
  modifierBadge.classList.remove('is-danger');
  modifierButton.textContent = 'Добавить запрет';
  modal.classList.add('is-hidden');
  leaderboardPrompt.classList.add('is-hidden');
  yandexScorePrompt.classList.add('is-hidden');
  levelUpNotice.classList.add('is-hidden');
  updateModeUi();
  if (gameMode === GAME_MODES.FALLING) {
    board = [];
    setMessage('Напечатайте слово до того, как оно достигнет нижней границы.');
    updateHud();
    resetFallingDecks();
    spawnFallingWord();
    logDebug('round', {
      mode: GAME_MODES.FALLING,
      health: healthPoints / 2,
      recoveryFrequency,
      preset: activeWordPreset,
      presetTitle: activePresetTitle(),
    });
    startFallingTimer();
    window.LetterfallYandex?.gameplayStart();
    if (playStartSound) playSound('start');
    input.focus();
    return;
  }
  setMessage('Слова читаются слева направо или сверху вниз.');
  const initialPlacements = createBoard();
  renderBoard();
  updateHud();
  logDebug('round', {
    minimum: minimumWordCount,
    words: wordsOnBoard(),
    placements: initialPlacements.map((placement) => placement.word),
    preset: activeWordPreset,
    presetTitle: activePresetTitle(),
  });
  startTimer();
  window.LetterfallYandex?.gameplayStart();
  if (playStartSound) playSound('start');
  input.focus();
}

form.addEventListener('submit', submitWord);
hintButton.addEventListener('click', showHint);
modifierButton.addEventListener('click', toggleModifier);
pauseButton.addEventListener('click', () => setPaused(!paused));
wordDensitySelect.addEventListener('change', () => {
  minimumWordCount = Number(wordDensitySelect.value);
  startGame();
  setMessage(`Новое поле: минимум ${minimumWordCount} слов.`);
});
gameModeSelect.addEventListener('change', () => {
  gameMode = gameModeSelect.value;
  startGame();
});
wordPresetSelect.addEventListener('change', () => {
  setActiveWordPreset(wordPresetSelect.value);
  startGame();
  setMessage(`Выбрана колода «${activePresetTitle()}».`);
});
recoveryFrequencySelect.addEventListener('change', () => {
  recoveryFrequency = Number(recoveryFrequencySelect.value);
  startGame();
  setMessage(`Бонус жизни будет появляться не чаще 1 раза на ${recoveryFrequency} слов.`);
});
saveLeaderboardButton.addEventListener('click', saveLeaderboardScore);
saveYandexScoreButton.addEventListener('click', saveYandexLeaderboardScore);
soundButton.addEventListener('click', () => {
  const enabled = !(window.LetterfallSounds?.isEnabled?.() ?? false);
  window.LetterfallSounds?.setEnabled(enabled);
  updateSoundButton();
  if (enabled) playSound('start');
});
nicknameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveLeaderboardScore();
  }
});
restartButton.addEventListener('click', () => {
  window.LetterfallSounds?.unlock();
  startGame({ playStartSound: true });
});
playAgainButton.addEventListener('click', async () => {
  if (playAgainButton.disabled) return;
  playAgainButton.disabled = true;
  requestGameplayFullscreen();
  await window.LetterfallYandex?.showFullscreenAdv?.();
  playAgainButton.disabled = false;
  window.LetterfallSounds?.unlock();
  startGame({ playStartSound: true });
});
startGameButton.addEventListener('click', startSelectedPreset);
boardElement.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('letterfall:yandex-ready', loadYandexLeaderboard);
window.addEventListener('letterfall:yandex-pause', () => setPaused(true));
window.addEventListener('letterfall:yandex-resume', () => setPaused(false));
document.querySelector('.topbar .brand').addEventListener('click', (event) => {
  event.preventDefault();
  openStartScreen();
});

document.body.classList.toggle('is-production', isProductionBuild);
updateSoundButton();
openStartScreen();
window.LetterfallYandex?.gameReady();
