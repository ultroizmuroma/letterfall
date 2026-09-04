const ROWS = 8;
const COLS = 7;
const ROUND_SECONDS = 90;
const STAR_TARGET = 12;
const MAX_LIVES = 3;
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
const incomingSharedScore = parseSharedScore(runtimeQuery.getAll('score'));
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
const modeButtons = [...document.querySelectorAll('.mode-button')];
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
const personalBestCard = document.querySelector('#personal-best-card');
const personalBestScore = document.querySelector('#personal-best-score');
const personalBestDetail = document.querySelector('#personal-best-detail');
const modal = document.querySelector('#result-modal');
const resultIcon = document.querySelector('#result-icon');
const resultEyebrow = document.querySelector('#result-eyebrow');
const resultTitle = document.querySelector('#result-title');
const resultCopy = document.querySelector('#result-copy');
const playAgainButton = document.querySelector('#play-again-button');
const personalBestResult = document.querySelector('#personal-best-result');
const personalBestResultLabel = document.querySelector('#personal-best-result-label');
const personalBestResultScore = document.querySelector('#personal-best-result-score');
const shareResultButton = document.querySelector('#share-result-button');
const shareResultMessage = document.querySelector('#share-result-message');
const gameRoot = document.querySelector('#game-root');
const presetChoices = document.querySelector('#preset-choices');
const shareScreen = document.querySelector('#share-screen');
const sharedScoreValue = document.querySelector('#shared-score-value');
const shareRematchButton = document.querySelector('#share-rematch-button');
const difficultyLabel = document.querySelector('#difficulty-label');
const quickTipText = document.querySelector('#quick-tip-text');
const controlHintText = document.querySelector('#control-hint-text');
const pauseLayer = document.querySelector('#pause-layer');
const resumeButton = document.querySelector('#resume-button');
const statsButton = document.querySelector('#stats-button');
const statsDialog = document.querySelector('#stats-dialog');
const statsPrimaryValue = document.querySelector('#stats-primary-value');
const statsPrimaryLabel = document.querySelector('#stats-primary-label');
const statsSecondaryValue = document.querySelector('#stats-secondary-value');
const statsSecondaryLabel = document.querySelector('#stats-secondary-label');
const statsThirdValue = document.querySelector('#stats-third-value');
const statsThirdLabel = document.querySelector('#stats-third-label');
const statsBestValue = document.querySelector('#stats-best-value');
const statsNote = document.querySelector('#stats-note');
const menuButton = document.querySelector('#menu-button');
const menuDialog = document.querySelector('#menu-dialog');
const menuResumeButton = document.querySelector('#menu-resume-button');
const menuSoundButton = document.querySelector('#menu-sound-button');
const menuSoundState = document.querySelector('#menu-sound-state');
const menuRestartButton = document.querySelector('#menu-restart-button');
const menuRulesText = document.querySelector('#menu-rules-text');

let board = [];
let stars = 0;
let timeLeft = ROUND_SECONDS;
let timerId = null;
let fallingTimerId = null;
let fallingFrameTimestamp = null;
let fallingStepElapsedMs = 0;
let fallingRowDistance = 0;
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
const PERSONAL_BEST_STORAGE_KEY = 'letterfall.personal-best.v1';
const LEGACY_LEADERBOARD_STORAGE_KEY = 'letterfall.falling-leaderboard.v1';
const PERSONAL_BEST_VERSION = 1;
let sessionId = '';
let sessionStartedAt = '';
let gameMode = gameModeSelect.value;
let activeWordPreset = wordPresetSelect.value;
let activeWordBank = WORD_PRESET_COLLECTION[activeWordPreset].words;
let selectedStartPreset = activeWordPreset;
let fallingWord = null;
let lives = MAX_LIVES;
let fallingScore = 0;
let fallingWordsCaught = 0;
let fallingLevel = 1;
let recoveryFrequency = Number(recoveryFrequencySelect.value);
let fallingWordsSinceRecovery = 0;
let lastFallingWord = '';
let fallingWordDeck = [];
let nextFallingWordDeck = [];
let fallingDeckNumber = 0;
let paused = false;

function parseSharedScore(values) {
  if (values.length !== 1 || !/^\d{1,9}$/.test(values[0])) return null;
  const score = Number(values[0]);
  return Number.isSafeInteger(score) ? score : null;
}

function playSound(name) {
  window.LetterfallSounds?.play(name);
}

function updateSoundButton() {
  const enabled = window.LetterfallSounds?.isEnabled?.() ?? false;
  soundButton.classList.toggle('is-muted', !enabled);
  soundButton.dataset.muted = String(!enabled);
  soundButton.setAttribute('aria-label', enabled ? 'Выключить звук' : 'Включить звук');
  soundButton.title = enabled ? 'Выключить звук' : 'Включить звук';
  menuSoundState.textContent = enabled ? 'Включён' : 'Выключен';
}

function toggleSound() {
  const enabled = !(window.LetterfallSounds?.isEnabled?.() ?? false);
  window.LetterfallSounds?.setEnabled(enabled);
  updateSoundButton();
  if (enabled) playSound('start');
}

function updatePauseButton() {
  const canTogglePause = !finished;
  pauseButton.disabled = !canTogglePause;
  pauseButton.querySelector('[data-action-label]').textContent = paused ? 'Продолжить' : 'Пауза';
  pauseButton.setAttribute('aria-label', paused ? 'Продолжить игру' : 'Поставить игру на паузу');
  pauseButton.title = paused ? 'Продолжить игру' : 'Поставить игру на паузу';
  pauseLayer.classList.toggle('is-visible', paused && !finished);
  pauseLayer.setAttribute('aria-hidden', String(!paused || finished));
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
    option.className = `preset-choice gse-variation-button${presetId === selectedStartPreset ? ' is-selected' : ''}`;
    option.setAttribute('role', 'radio');
    option.setAttribute('aria-checked', String(presetId === selectedStartPreset));
    option.innerHTML = `<strong>${preset.title}</strong>`;
    option.addEventListener('click', () => {
      if (presetId === activeWordPreset) return;
      setActiveWordPreset(presetId);
      renderPresetChoices();
      window.LetterfallSounds?.unlock();
      startGame({ playStartSound: true });
    });
    presetChoices.append(option);
  });
}

function openSharedResultScreen() {
  clearInterval(timerId);
  stopFallingTimer();
  finished = true;
  locked = true;
  input.disabled = true;
  updatePauseButton();
  modal.classList.add('is-hidden');
  sharedScoreValue.textContent = incomingSharedScore;
  shareScreen.classList.remove('is-hidden');
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
        cell.dataset.wordIndex = wordIndex;
        cell.textContent = letter;
        cell.setAttribute('aria-label', `${letter}${fallingWord.bonusIndex === wordIndex ? ', с сердечком' : ''}`);
        if (fallingWord.bonusIndex === wordIndex) {
          const heart = document.createElement('span');
          heart.className = 'word-heart';
          heart.textContent = '♥';
          cell.append(heart);
        }
      } else {
        cell.setAttribute('aria-label', 'Пустая клетка');
      }
      boardElement.append(cell);
    }
  }
  fallingRowDistance = boardElement.children[COLS]
    ? boardElement.children[COLS].offsetTop - boardElement.children[0].offsetTop
    : 0;
  updateFallingWordTypingFeedback();
  updateFallingWordPosition();
  renderDeveloperWords();
}

function typedLetters() {
  return [...input.value.toLocaleUpperCase('ru-RU')];
}

function updateFallingWordTypingFeedback() {
  if (gameMode !== GAME_MODES.FALLING || !fallingWord) return;
  const typed = typedLetters();
  const hasExtraLetter = typed.length > fallingWord.word.length;
  boardElement.querySelectorAll('.cell.is-active-word').forEach((cell) => {
    const wordIndex = Number(cell.dataset.wordIndex);
    const typedLetter = typed[wordIndex];
    const isLastLetterWithExtraInput = hasExtraLetter && wordIndex === fallingWord.word.length - 1;
    const isCorrect = Boolean(typedLetter)
      && typedLetter === fallingWord.word[wordIndex]
      && !isLastLetterWithExtraInput;
    const isWrong = Boolean(typedLetter) && !isCorrect;
    cell.classList.toggle('is-typed-correct', isCorrect);
    cell.classList.toggle('is-typed-wrong', isWrong);
  });
}

function handleWordInput(event) {
  updateFallingWordTypingFeedback();
  if (event.isComposing || finished || locked || paused || gameMode !== GAME_MODES.FALLING || !fallingWord) return;
  const typed = typedLetters();
  const isCompleteMatch = typed.length === fallingWord.word.length
    && typed.every((letter, index) => letter === fallingWord.word[index]);
  if (!isCompleteMatch) return;
  const rawWord = input.value;
  const word = normalizeWord(rawWord);
  logDebug('input', { raw: rawWord, word, automatic: true });
  submitFallingWord(rawWord, word);
}

function updateFallingWordPosition() {
  if (gameMode !== GAME_MODES.FALLING || !fallingWord) return;
  const canMoveToNextRow = fallingWord.row < ROWS - 1;
  const progress = canMoveToNextRow
    ? Math.min(1, fallingStepElapsedMs / currentFallStepMs())
    : 0;
  const offset = progress * fallingRowDistance;
  boardElement.querySelectorAll('.cell.is-active-word').forEach((cell) => {
    cell.style.transform = `translate3d(0, ${offset}px, 0)`;
  });
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
  const canRecover = word.length >= 6 && fallingWordsSinceRecovery >= recoveryFrequency - 1;
  const bonusType = canRecover && Math.random() < .45 ? 'full' : null;
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
  fallingStepElapsedMs = 0;
  input.value = '';
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
      if (entry.mode === GAME_MODES.FALLING) return `Словопад, колода «${entry.presetTitle}»: ${entry.health} ♥ на старте; бонус не чаще 1 из ${entry.recoveryFrequency} слов.`;
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
      if (entry.mode === GAME_MODES.FALLING) return entry.won ? `Словопад пройден: ${entry.score} очков.` : `Словопад завершён: ${entry.score} очков, уровень ${entry.level}.`;
      return entry.won ? `Раунд выигран: ${entry.stars} ★.` : `Время вышло: ${entry.stars} ★.`;
    case 'session_saved':
      return `Сессия сохранена: ${entry.events} событий.`;
    case 'falling_spawn':
      return `Появилось «${entry.word}» в колонке ${entry.column + 1}${entry.bonus ? ', бонус: ♥' : ''}; колода ${entry.deck}, осталось ${entry.deckRemaining}, ур. ${entry.level}, шаг ${entry.stepMs} мс.`;
    case 'deck_shuffle':
      return `Перемешана следующая колода ${entry.deck}: ${entry.size} слов. В текущей осталось ${entry.remaining}.`;
    case 'deck_start':
      return `Началась колода ${entry.deck}: ${entry.size} слов.`;
    case 'falling_match':
      return `Поймано «${entry.word}»: +${entry.points} очков${entry.bonus ? ', восстановлена 1 жизнь ♥' : ''}. Всего ${entry.score}.`;
    case 'life_lost':
      return `«${entry.word}» достигло низа: −1 ♥, осталось ${entry.lives}.`;
    case 'level_up':
      return `Новый уровень ${entry.level}: скорость падения ${entry.stepMs} мс.`;
    case 'personal_best':
      return `Новый личный рекорд: ${entry.score} очков, уровень ${entry.level}.`;
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
  console.info('[Словопад]', entry);
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
      ? `${session.won ? 'Словопад пройден' : 'Словопад'} · ${fallingSummary} · ${session.events.length} событий.`
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
    lives,
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

function normalizePersonalBest(value) {
  if (!value || value.version !== PERSONAL_BEST_VERSION ||
      !Number.isSafeInteger(value.score) || value.score < 0 ||
      !Number.isSafeInteger(value.level) || value.level < 1 ||
      !Number.isSafeInteger(value.words) || value.words < 0 ||
      typeof value.achievedAt !== 'string') return null;
  return value;
}

function readLegacyPersonalBest() {
  try {
    const stored = localStorage.getItem(LEGACY_LEADERBOARD_STORAGE_KEY);
    const entries = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(entries)) return null;
    const best = entries
      .filter((entry) => Number.isSafeInteger(entry?.score) && entry.score >= 0)
      .sort((left, right) => right.score - left.score)[0];
    if (!best) return null;
    return {
      version: PERSONAL_BEST_VERSION,
      score: best.score,
      level: Number.isSafeInteger(best.level) && best.level >= 1 ? best.level : levelForScore(best.score),
      words: Number.isSafeInteger(best.words) && best.words >= 0 ? best.words : 0,
      achievedAt: typeof best.createdAt === 'string' ? best.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function readPersonalBest() {
  try {
    const stored = localStorage.getItem(PERSONAL_BEST_STORAGE_KEY);
    const record = stored ? normalizePersonalBest(JSON.parse(stored)) : null;
    if (record) return record;
    const legacyRecord = readLegacyPersonalBest();
    if (!legacyRecord) return null;
    localStorage.setItem(PERSONAL_BEST_STORAGE_KEY, JSON.stringify(legacyRecord));
    return legacyRecord;
  } catch {
    return null;
  }
}

function savePersonalBest(score, level, words) {
  const previous = readPersonalBest();
  if (previous && score <= previous.score) {
    return { record: previous, isNew: false, saved: true };
  }
  const record = {
    version: PERSONAL_BEST_VERSION,
    score,
    level,
    words,
    achievedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(PERSONAL_BEST_STORAGE_KEY, JSON.stringify(record));
    return { record, isNew: true, saved: true };
  } catch {
    return { record: previous ?? record, isNew: false, saved: false };
  }
}

function renderPersonalBest(record = readPersonalBest()) {
  personalBestScore.textContent = record?.score ?? 0;
  personalBestDetail.textContent = record
    ? `Уровень ${record.level} · поймано ${record.words} слов`
    : 'Сыграйте первый раунд — лучший результат сохранится в этом браузере.';
}

function renderStatsDialog() {
  const record = readPersonalBest();
  const isFallingMode = gameMode === GAME_MODES.FALLING;
  statsPrimaryValue.textContent = isFallingMode ? fallingScore : stars;
  statsPrimaryLabel.textContent = isFallingMode ? 'Очки' : 'Собрано звёзд';
  statsSecondaryValue.textContent = isFallingMode ? fallingLevel : `${timeLeft}с`;
  statsSecondaryLabel.textContent = isFallingMode ? 'Уровень' : 'Осталось времени';
  statsThirdValue.textContent = isFallingMode ? fallingWordsCaught : STAR_TARGET;
  statsThirdLabel.textContent = isFallingMode ? 'Поймано слов' : 'Цель раунда';
  statsBestValue.textContent = record?.score ?? 0;
  statsNote.textContent = isFallingMode
    ? 'Личный рекорд хранится только в этом браузере.'
    : 'Личный рекорд относится к режиму «Словопад» и хранится только в этом браузере.';
}

function openGameDialog(dialog) {
  const shouldResume = !paused && !finished;
  dialog.dataset.resumeOnClose = String(shouldResume);
  if (shouldResume) setPaused(true);
  if (dialog === statsDialog) renderStatsDialog();
  dialog.showModal();
}

function closeGameDialog(dialog, resume = dialog.dataset.resumeOnClose === 'true') {
  dialog.dataset.resumeOnClose = String(resume);
  dialog.close();
}

function createShareUrl(score) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('score', String(score));
  return url.href;
}

async function copyShareText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const temporary = document.createElement('textarea');
  temporary.value = text;
  temporary.setAttribute('readonly', '');
  temporary.style.position = 'fixed';
  temporary.style.opacity = '0';
  document.body.append(temporary);
  temporary.select();
  const copied = document.execCommand('copy');
  temporary.remove();
  if (!copied) throw new Error('Clipboard is unavailable.');
}

async function shareCurrentResult() {
  if (gameMode !== GAME_MODES.FALLING || !finished) return;
  const url = createShareUrl(fallingScore);
  const text = `В «Словопаде» набрано ${fallingScore} очков. Сможете лучше?`;
  shareResultButton.disabled = true;
  shareResultMessage.textContent = '';
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'Словопад', text, url });
      shareResultMessage.textContent = 'Результат отправлен.';
    } else {
      await copyShareText(`${text} ${url}`);
      shareResultMessage.textContent = 'Ссылка на результат скопирована.';
    }
  } catch (error) {
    if (error?.name !== 'AbortError') {
      shareResultMessage.textContent = 'Не удалось поделиться. Попробуйте ещё раз.';
    }
  } finally {
    shareResultButton.disabled = false;
  }
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
    window.LetterfallSounds?.pause();
    setMessage('Игра на паузе.', 'error');
    updatePauseButton();
    return;
  }
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
    healthValue.textContent = `${'♥'.repeat(lives)}${'♡'.repeat(MAX_LIVES - lives)}`;
    healthIndicator.setAttribute('aria-label', `Осталось жизней: ${lives}`);
    scoreValue.textContent = fallingScore;
    levelValue.textContent = fallingLevel;
    if (statsDialog.open) renderStatsDialog();
    return;
  }
  starsValue.textContent = `${stars} / ${STAR_TARGET}`;
  targetStars.textContent = STAR_TARGET;
  progressFill.style.width = `${Math.min(100, (stars / STAR_TARGET) * 100)}%`;
  if (statsDialog.open) renderStatsDialog();
}

function currentFallStepMs() {
  return Math.max(MIN_FALL_STEP_MS, BASE_FALL_STEP_MS - (fallingLevel - 1) * FALL_SPEEDUP_PER_LEVEL_MS);
}

function levelForScore(score) {
  return Math.floor(score / LEVEL_SCORE_STEP) + 1;
}

function updateModeUi() {
  const isFallingMode = gameMode === GAME_MODES.FALLING;
  document.body.classList.toggle('is-falling-mode', isFallingMode);
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === gameMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });
  scoreIndicator.classList.toggle('is-hidden', !isFallingMode);
  levelIndicator.classList.toggle('is-hidden', !isFallingMode);
  healthIndicator.classList.toggle('is-hidden', !isFallingMode);
  timerBox.classList.toggle('is-hidden', isFallingMode);
  document.querySelector('.progress-wrap').classList.toggle('is-hidden', isFallingMode);
  modifierCard.classList.toggle('is-hidden', isFallingMode);
  hintCard.classList.toggle('is-hidden', isFallingMode);
  wordDensitySetting.classList.toggle('is-hidden', isFallingMode);
  recoveryFrequencySetting.classList.toggle('is-hidden', !isFallingMode);
  personalBestCard.classList.toggle('is-hidden', !isFallingMode);
  difficultyLabel.textContent = `${isFallingMode ? 'Словопад' : 'Звездопад'} · ${activePresetTitle()}`;
  if (isFallingMode) {
    goalEyebrow.textContent = activePresetTitle();
    goalTitle.textContent = 'Ловите слова';
    rulesText.textContent = 'Введите падающее слово до нижней границы. За каждую букву — 10 очков; с уровнем скорость растёт.';
    quickTipText.textContent = 'Смотрите на слово целиком и печатайте ритмично — ошибку можно исправить Backspace.';
    controlHintText.textContent = 'печатать · Backspace исправить';
    menuRulesText.textContent = 'Напечатайте падающее слово целиком, прежде чем оно достигнет нижней границы. За каждую букву начисляется 10 очков.';
    document.querySelector('.word-label').textContent = 'Напечатайте падающее слово';
    input.placeholder = 'Слово на поле';
  } else {
    goalEyebrow.textContent = activePresetTitle();
    goalTitle.innerHTML = 'Соберите <span id="target-stars">12</span> звёзд';
    targetStars = document.querySelector('#target-stars');
    rulesText.textContent = 'Введите слово, которое видите в блоках. Подходящие буквы исчезнут, а блоки сверху упадут вниз.';
    quickTipText.textContent = 'Ищите длинные слова: так выше шанс убрать сразу несколько клеток со звёздами.';
    controlHintText.textContent = 'ввести слово · Enter проверить';
    menuRulesText.textContent = 'Найдите слово слева направо или сверху вниз, введите его и нажмите Enter. Клетки исчезнут, а блоки сверху упадут.';
    document.querySelector('.word-label').textContent = 'Найдите слово на поле';
    input.placeholder = 'Например, ПЛЕЕР';
  }
  renderStatsDialog();
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
  if (fallingWord.row < ROWS - 2) {
    fallingWord.row += 1;
    renderFallingBoard();
    return;
  }
  const missedWord = fallingWord.word;
  fallingWord = null;
  input.value = '';
  renderFallingBoard();
  lives = Math.max(0, lives - 1);
  playSound('lost');
  updateHud();
  logDebug('life_lost', { word: missedWord, lives });
  if (lives === 0) {
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
  if (caughtWord.bonusType) lives = Math.min(MAX_LIVES, lives + 1);
  playSound(caughtWord.bonusType ? 'heal' : 'correct');
  input.value = '';
  updateHud();
  logDebug('falling_match', {
    word,
    raw: rawWord,
    bonus: caughtWord.bonusType,
    lives,
    points,
    score: fallingScore,
    level: fallingLevel,
  });
  if (fallingLevel > previousLevel) {
    startFallingTimer();
    logDebug('level_up', { level: fallingLevel, stepMs: currentFallStepMs() });
  }
  setMessage(
    caughtWord.bonusType
      ? `«${word}» поймано! +${points} очков и 1 жизнь ♥`
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
  stopFallingTimer();
  input.disabled = true;
  updatePauseButton();
  playSound(won ? 'level' : 'finish');
  logDebug('finish', { won, stars, score: fallingScore, lives, level: fallingLevel, mode: gameMode });
  const isFallingRound = gameMode === GAME_MODES.FALLING;
  const bestOutcome = isFallingRound
    ? savePersonalBest(fallingScore, fallingLevel, fallingWordsCaught)
    : null;
  if (bestOutcome?.isNew) {
    logDebug('personal_best', { score: fallingScore, level: fallingLevel });
  }
  saveCompletedSession(won);
  renderPersonalBest(bestOutcome?.record);
  resultEyebrow.textContent = `${isFallingRound ? 'Словопад' : 'Звездопад'} · раунд завершён`;
  resultIcon.textContent = won ? '★' : gameMode === GAME_MODES.FALLING ? '♥' : '⌛';
  resultTitle.textContent = won
    ? gameMode === GAME_MODES.FALLING ? 'Слова не прорвались!' : 'Звёзды собраны!'
    : gameMode === GAME_MODES.FALLING && lives === 0 ? 'Жизни закончились' : 'Время вышло';
  resultCopy.textContent = gameMode === GAME_MODES.FALLING
    ? won
      ? `Вы поймали ${fallingWordsCaught} слов и набрали ${fallingScore} очков.`
      : `Поймано ${fallingWordsCaught} слов, набрано ${fallingScore} очков. Ваш уровень: ${fallingLevel}.`
    : won
      ? `Вы собрали ${stars} из ${STAR_TARGET} звёзд и успели до конца раунда.`
      : `Собрано ${stars} из ${STAR_TARGET} звёзд. Попробуйте находить слова подлиннее — так проще поймать звёзды.`;
  personalBestResult.classList.toggle('is-hidden', !isFallingRound);
  shareResultButton.classList.toggle('is-hidden', !isFallingRound);
  shareResultMessage.textContent = '';
  playAgainButton.textContent = isFallingRound ? 'Я сделаю лучше' : 'Сыграть ещё раз';
  if (bestOutcome) {
    personalBestResultLabel.textContent = !bestOutcome.saved
      ? 'Не удалось сохранить в браузере'
      : bestOutcome.isNew ? 'Новый личный рекорд' : 'Личный рекорд';
    personalBestResultScore.textContent = `${bestOutcome.saved ? bestOutcome.record.score : fallingScore} очков`;
  }
  modal.classList.remove('is-hidden');
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
  stopFallingTimer();
  fallingFrameTimestamp = null;
  fallingTimerId = requestAnimationFrame(animateFallingWord);
}

function stopFallingTimer() {
  if (fallingTimerId !== null) cancelAnimationFrame(fallingTimerId);
  fallingTimerId = null;
  fallingFrameTimestamp = null;
}

function animateFallingWord(timestamp) {
  const previousTimestamp = fallingFrameTimestamp ?? timestamp;
  const frameDuration = Math.min(100, Math.max(0, timestamp - previousTimestamp));
  fallingFrameTimestamp = timestamp;

  if (!finished && !locked && !paused && gameMode === GAME_MODES.FALLING && fallingWord) {
    fallingStepElapsedMs += frameDuration;
    const stepDuration = currentFallStepMs();
    if (fallingStepElapsedMs >= stepDuration) {
      fallingStepElapsedMs -= stepDuration;
      advanceFallingWord();
    }
    updateFallingWordPosition();
  }

  if (fallingTimerId !== null) {
    fallingTimerId = requestAnimationFrame(animateFallingWord);
  }
}

function startGame({ playStartSound = false } = {}) {
  clearInterval(timerId);
  stopFallingTimer();
  stars = 0;
  timeLeft = ROUND_SECONDS;
  locked = false;
  finished = false;
  bannedLetter = null;
  lastHint = null;
  nextCellId = 0;
  fallingWord = null;
  fallingStepElapsedMs = 0;
  fallingRowDistance = 0;
  lives = MAX_LIVES;
  fallingScore = 0;
  fallingWordsCaught = 0;
  fallingLevel = 1;
  recoveryFrequency = Number(recoveryFrequencySelect.value);
  fallingWordsSinceRecovery = 0;
  lastFallingWord = '';
  fallingWordDeck = [];
  nextFallingWordDeck = [];
  fallingDeckNumber = 0;
  paused = false;
  sessionId = createSessionId();
  sessionStartedAt = new Date().toISOString();
  resetDebugLog();
  renderCompletedSessions();
  renderPersonalBest();
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
  shareScreen.classList.add('is-hidden');
  personalBestResult.classList.add('is-hidden');
  shareResultButton.classList.add('is-hidden');
  shareResultMessage.textContent = '';
  renderPresetChoices();
  updateModeUi();
  if (gameMode === GAME_MODES.FALLING) {
    board = [];
    setMessage('Напечатайте слово до того, как оно достигнет нижней границы.');
    updateHud();
    resetFallingDecks();
    spawnFallingWord();
    logDebug('round', {
      mode: GAME_MODES.FALLING,
      lives,
      recoveryFrequency,
      preset: activeWordPreset,
      presetTitle: activePresetTitle(),
    });
    startFallingTimer();
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
  if (playStartSound) playSound('start');
  input.focus();
}

form.addEventListener('submit', submitWord);
input.addEventListener('input', handleWordInput);
boardElement.addEventListener('click', () => {
  if (gameMode === GAME_MODES.FALLING && !finished && !locked && !paused) input.focus();
});
hintButton.addEventListener('click', showHint);
modifierButton.addEventListener('click', toggleModifier);
pauseButton.addEventListener('click', () => setPaused(!paused));
resumeButton.addEventListener('click', () => {
  requestGameplayFullscreen();
  window.LetterfallSounds?.unlock();
  setPaused(false);
});
modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.mode === gameMode) return;
    gameMode = button.dataset.mode;
    gameModeSelect.value = gameMode;
    window.LetterfallSounds?.unlock();
    startGame({ playStartSound: true });
  });
});
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
shareResultButton.addEventListener('click', shareCurrentResult);
soundButton.addEventListener('click', toggleSound);
menuSoundButton.addEventListener('click', toggleSound);
statsButton.addEventListener('click', () => openGameDialog(statsDialog));
menuButton.addEventListener('click', () => openGameDialog(menuDialog));
menuResumeButton.addEventListener('click', () => closeGameDialog(menuDialog, true));
menuRestartButton.addEventListener('click', () => {
  menuDialog.dataset.resumeOnClose = 'false';
  menuDialog.close();
  window.LetterfallSounds?.unlock();
  startGame({ playStartSound: true });
});
document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => closeGameDialog(button.closest('dialog')));
});
[statsDialog, menuDialog].forEach((dialog) => {
  dialog.addEventListener('close', () => {
    const shouldResume = dialog.dataset.resumeOnClose === 'true';
    dialog.dataset.resumeOnClose = 'false';
    if (shouldResume && !finished) setPaused(false);
  });
});
restartButton.addEventListener('click', () => {
  window.LetterfallSounds?.unlock();
  startGame({ playStartSound: true });
});
playAgainButton.addEventListener('click', () => {
  if (playAgainButton.disabled) return;
  playAgainButton.disabled = true;
  requestGameplayFullscreen();
  window.LetterfallSounds?.unlock();
  startGame({ playStartSound: true });
  playAgainButton.disabled = false;
});
shareRematchButton.addEventListener('click', () => {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('score');
  window.history.replaceState(null, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  shareScreen.classList.add('is-hidden');
  startGame();
  setPaused(true);
});
document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('selectstart', (event) => {
  if (event.target.matches('input, textarea')) return;
  event.preventDefault();
});
document.querySelector('.topbar .brand').addEventListener('click', (event) => {
  event.preventDefault();
  if (paused) setPaused(false);
});

function bootGame() {
  document.body.classList.toggle('is-production', isProductionBuild);
  updateSoundButton();
  renderPersonalBest();
  renderPresetChoices();
  if (incomingSharedScore === null) {
    startGame();
    setPaused(true);
  } else {
    openSharedResultScreen();
  }
  gameRoot.inert = false;
  document.body.classList.remove('is-booting');
}

bootGame();
