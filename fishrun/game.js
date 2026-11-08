(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreElement = document.getElementById('score');
  const questStatus = document.getElementById('questStatus');
  const controlsHint = document.getElementById('controlsHint');
  const restartButton = document.getElementById('restartButton');
  const modeHelpButton = document.getElementById('modeHelpButton');
  const questModeButton = document.getElementById('questModeButton');
  const classicModeButton = document.getElementById('classicModeButton');
  const questDebugOutput = document.getElementById('questDebugOutput');
  const scene = new Image();
  const questScene = new Image();
  const fishSprite = new Image();
  scene.src = 'minigame.png';
  questScene.src = 'mini%20quest.png';
  fishSprite.src = 'fish.png';
  questScene.addEventListener('load', render);
  questScene.addEventListener('error', () => console.error('Unable to load Fishrun quest background: mini quest.png'));
  const questImages = {};
  const questImageStatus = {};
  const questDrawnLetters = new Set();
  const QUEST_IMAGE_PATHS = {
    letterA: 'quest/tr/letter%20A.png',
    letterB: 'quest/tr/letter%20B.png',
    letterC: 'quest/tr/letter%20C.png',
    letterD: 'quest/tr/letter%20D.png',
    letterE: 'quest/tr/letter%20E.png',
    letterF: 'quest/tr/letter%20F.png',
    letterG: 'quest/tr/letter%20G.png',
    letterI: 'quest/tr/letter%20I.png',
    letterK: 'quest/tr/letter%20K.png',
    letterM: 'quest/tr/letter%20M.png',
    letterN: 'quest/tr/letter%20N.png',
    letterO: 'quest/tr/letter%20O.png'
  };
  Object.entries(QUEST_IMAGE_PATHS).forEach(([key, path]) => {
    const image = new Image();
    questImageStatus[key.slice('letter'.length)] = 'waiting';
    image.addEventListener('load', () => {
      questImageStatus[key.slice('letter'.length)] = `loaded ${image.naturalWidth}x${image.naturalHeight}`;
      updateQuestDebug();
      render();
    });
    image.addEventListener('error', () => {
      questImageStatus[key.slice('letter'.length)] = `FAILED: ${path}`;
      console.error(`Unable to load Fishrun quest image: ${path}`);
      updateQuestDebug();
    });
    image.src = path;
    questImages[key] = image;
  });
  let fishSpriteCanvas = null;
  let fishSpriteBounds = null;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GROUND_Y = 505;
  const FISH_X = 115;
  const FISH_WIDTH = 52;
  const FISH_HEIGHT = 42;
  const QUEST_FISH_SCALE = 0.68;
  const OBSTACLE = { x: 286, y: 304, width: 112, height: 207 };
  const runner = { y: GROUND_Y - FISH_HEIGHT, velocityY: 0, onGround: true };
  const MIND_LETTERS = ['M', 'I', 'N', 'D'];
  const QUEST_BLOCK_WIDTH = 60;
  const QUEST_BLOCK_HEIGHT = 328;
  const QUEST_BLOCK_ROWS = 6;
  const QUEST_BLOCKS_PER_ROUND = 4;
  const QUEST_LETTER_POOL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'K', 'M', 'N', 'O'];
  const QUEST_SPECIAL_LETTERS = ['M', 'N', 'D', 'I'];
  const QUEST_LETTER_IMAGE_KEYS = new Set(Object.keys(QUEST_IMAGE_PATHS).map((key) => key.slice('letter'.length)));
  const QUEST_AVAILABLE_LETTERS = QUEST_LETTER_POOL.filter((letter) => QUEST_LETTER_IMAGE_KEYS.has(letter));
  const QUEST_DISTRACTOR_LETTERS = QUEST_AVAILABLE_LETTERS.filter((letter) => !QUEST_SPECIAL_LETTERS.includes(letter));
  const QUEST_BLOCK_GROUND_GAP = 2;
  const QUEST_OPENING_CLEARANCE = 12;
  const QUEST_AIM_TOLERANCE = 8;

  function updateQuestDebug() {
    const modeLabel = gameMode === 'quest' ? 'MIND QUEST' : 'CLASSIC';
    const lines = [
      `Mode: ${modeLabel}; page protocol: ${window.location.protocol}`,
      'PNG images are drawn directly; pixel reading and cropping are disabled.',
      `Letters currently drawn on blocks: ${[...questDrawnLetters].join(', ') || 'none this frame'}`,
      'PNG status:'
    ];
    Object.keys(QUEST_IMAGE_PATHS).forEach((key) => {
      const letter = key.slice('letter'.length);
      const status = questImageStatus[letter];
      const drawn = questDrawnLetters.has(letter) ? '; drawn' : '';
      lines.push(`${letter}: ${status}${drawn}`);
    });
    questDebugOutput.textContent = lines.join('\n');
  }

  let running = false;
  let gameOver = false;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let sceneryOffset = 0;
  let score = 0;
  let achievementSent = false;
  let gameMode = 'classic';
  let questBlocks = [];
  let questProjectiles = [];
  let letterBursts = [];
  let questSpawnTimer = 0;
  let questBlocksSpawned = 0;
  let questMindOrder = [...QUEST_SPECIAL_LETTERS];
  let questProgress = '';
  let lastShotAt = -Infinity;
  let questFishTargetY = GROUND_Y - FISH_HEIGHT;

  function setGameMode(mode) {
    gameMode = mode;
    const isQuest = mode === 'quest';
    canvas.setAttribute('aria-label', isQuest ? 'MIND Quest: shoot letter blocks' : 'Jump over obstacles');
    questStatus.hidden = !isQuest;
    controlsHint.textContent = isQuest
      ? 'MOVE CURSOR TO STEER / SPACE TO SHOOT'
      : 'SPACE / ↑ / CLICK TO JUMP';
    modeHelpButton.hidden = isQuest;
    questModeButton.hidden = true;
    classicModeButton.hidden = !isQuest;
    if (isQuest) {
      questStatus.textContent = 'WORD: ____';
    } else {
      modeHelpButton.setAttribute('aria-expanded', 'false');
    }
    render();
  }

  function drawScene() {
    const background = gameMode === 'quest' ? questScene : scene;
    if (background.complete && background.naturalWidth) {
      ctx.drawImage(background, -sceneryOffset, 0, WIDTH, HEIGHT);
      ctx.drawImage(background, WIDTH - sceneryOffset, 0, WIDTH, HEIGHT);
      return;
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#444';
    ctx.fillRect(0, GROUND_Y, WIDTH, 5);
  }

  function drawFish() {
    const bob = runner.onGround && !gameOver ? Math.floor(elapsed / 120) % 2 * 2 : 0;
    const scale = gameMode === 'quest' ? QUEST_FISH_SCALE : 1;
    const fishWidth = FISH_WIDTH * scale;
    const fishHeight = FISH_HEIGHT * scale;
    const fishX = FISH_X + (FISH_WIDTH - fishWidth) / 2;
    const fishY = runner.y + FISH_HEIGHT - fishHeight + bob;
    if (fishSpriteCanvas && fishSpriteBounds) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        fishSpriteCanvas,
        fishSpriteBounds.x,
        fishSpriteBounds.y,
        fishSpriteBounds.width,
        fishSpriteBounds.height,
        fishX,
        Math.round(fishY),
        fishWidth,
        fishHeight
      );
    } else {
      ctx.save();
      ctx.translate(fishX, fishY);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#444';
      ctx.fillRect(8, 8, 36, 25);
      ctx.fillRect(0, 12, 12, 16);
      ctx.fillStyle = '#fff';
      ctx.fillRect(34, 12, 4, 4);
      ctx.restore();
    }
  }

  function getFishCollisionBounds() {
    const scale = gameMode === 'quest' ? QUEST_FISH_SCALE : 1;
    const width = FISH_WIDTH * scale;
    const height = FISH_HEIGHT * scale;
    const x = FISH_X + (FISH_WIDTH - width) / 2;
    const y = runner.y + FISH_HEIGHT - height;
    return {
      left: x + 8 * scale,
      right: x + width - 5 * scale,
      top: y + 5 * scale,
      bottom: y + height - 4 * scale
    };
  }

  function drawQuestLetter(block, row, rowIndex) {
    const image = questImages[`letter${row.letter}`];
    const rowHeight = block.height / block.letters.length;
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;
    const availableHeight = Math.max(0, rowHeight - 7);
    const scale = Math.min(block.width / image.naturalWidth, availableHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = block.x + (block.width - width) / 2;
    const y = block.y + rowIndex * rowHeight + (rowHeight - height) / 2;
    ctx.imageSmoothingEnabled = false;
    try {
      ctx.drawImage(image, x, y, width, height);
      questDrawnLetters.add(row.letter);
    } catch (error) {
      questImageStatus[row.letter] = `DRAW FAILED: ${error.message}`;
      console.error(`Unable to draw Fishrun quest letter ${row.letter}.`, error);
    }
  }

  function getQuestPassage(block, rowIndex) {
    const rowHeight = block.height / block.letters.length;
    const fish = getFishCollisionBounds();
    const minimumHeight = fish.bottom - fish.top + QUEST_OPENING_CLEARANCE * 2;
    const passageHeight = Math.max(rowHeight, minimumHeight);
    const center = block.y + (rowIndex + 0.5) * rowHeight;
    const top = Math.max(block.y, center - passageHeight / 2);
    const bottom = Math.min(block.y + block.height, center + passageHeight / 2);
    return { top, bottom };
  }

  function drawQuestBlocks() {
    questBlocks.forEach((block) => {
      block.letters.forEach((row, index) => {
        if (!row.removed) drawQuestLetter(block, row, index);
      });
    });

    ctx.fillStyle = '#242424';
    questProjectiles.forEach((projectile) => {
      ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
    });
    letterBursts.forEach((particle) => {
      const image = questImages[particle.image];
      if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - particle.age / particle.life);
      ctx.translate(particle.x + particle.width / 2, particle.y + particle.height / 2);
      ctx.rotate(particle.rotation);
      const scale = Math.min(particle.width / image.naturalWidth, particle.height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    });
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 5);
    ctx.font = 'bold 13px monospace';
    ctx.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 23);
  }

  function render() {
    questDrawnLetters.clear();
    drawScene();
    if (gameMode === 'quest') drawQuestBlocks();
    drawFish();
    if (gameOver) drawOverlay('GAME OVER', 'PRESS RESTART');
    else if (!running) {
      drawOverlay(
        gameMode === 'quest' ? 'MIND QUEST' : 'PIXEL FISH RUN',
        gameMode === 'quest' ? 'SPACE TO SHOOT / CLICK TO START' : 'PRESS SPACE / CLICK TO START'
      );
    }
    updateQuestDebug();
  }

  function overlapsObstacle() {
    // The obstacle in minigame.png scrolls with the reference scene and repeats seamlessly.
    const obstacleScreenX = ((OBSTACLE.x - sceneryOffset) % WIDTH + WIDTH) % WIDTH;
    const fishLeft = FISH_X + 8;
    const fishRight = FISH_X + FISH_WIDTH - 5;
    const fishTop = runner.y + 5;
    const fishBottom = runner.y + FISH_HEIGHT - 4;
    return fishRight > obstacleScreenX &&
      fishLeft < obstacleScreenX + OBSTACLE.width &&
      fishBottom > OBSTACLE.y + 4 &&
      fishTop < GROUND_Y;
  }

  function update(delta) {
    elapsed += delta;
    if (gameMode === 'classic') score = Math.floor(elapsed * (1507 / 40000));
    scoreElement.textContent = String(score).padStart(5, '0');

    if (gameMode === 'classic' && score >= 1507 && !achievementSent) {
      achievementSent = true;
      window.parent.postMessage({ type: 'fish-game-achievement', achievement: '1507' }, '*');
    }

    const speed = gameMode === 'quest' ? 0.12 : 0.2 + Math.min(score * 0.0004, 0.12);
    sceneryOffset = (sceneryOffset + delta * speed) % WIDTH;

    if (gameMode === 'quest') {
      const maxStep = delta * 0.7;
      runner.y += Math.max(-maxStep, Math.min(maxStep, questFishTargetY - runner.y));
      runner.velocityY = 0;
      runner.onGround = false;
    } else {
      runner.velocityY += 0.0014 * delta;
      runner.y += runner.velocityY * delta;
      if (runner.y + FISH_HEIGHT >= GROUND_Y) {
        runner.y = GROUND_Y - FISH_HEIGHT;
        runner.velocityY = 0;
        runner.onGround = true;
      }
    }

    if (gameMode === 'classic' && overlapsObstacle()) {
      gameOver = true;
      running = false;
    }
    if (gameMode === 'quest') updateQuest(delta, speed);
  }

  function loop(now) {
    if (!running) return;
    const delta = Math.min(now - (lastTime || now), 40);
    lastTime = now;
    update(delta);
    render();
    if (running) frame = requestAnimationFrame(loop);
  }

  function resetGame() {
    cancelAnimationFrame(frame);
    runner.y = GROUND_Y - FISH_HEIGHT;
    questFishTargetY = runner.y;
    runner.velocityY = 0;
    runner.onGround = true;
    elapsed = 0;
    sceneryOffset = 450;
    score = 0;
    achievementSent = false;
    gameOver = false;
    running = true;
    lastTime = 0;
    scoreElement.textContent = '00000';
  }

  function startGame() {
    setGameMode('classic');
    resetGame();
    render();
    frame = requestAnimationFrame(loop);
  }

  function startQuestGame() {
    setGameMode('quest');
    resetGame();
    questBlocks = [];
    questProjectiles = [];
    letterBursts = [];
    questSpawnTimer = 0;
    questBlocksSpawned = 0;
    questMindOrder = [...QUEST_SPECIAL_LETTERS];
    for (let index = questMindOrder.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [questMindOrder[index], questMindOrder[swapIndex]] = [questMindOrder[swapIndex], questMindOrder[index]];
    }
    questProgress = '';
    lastShotAt = -Infinity;
    spawnQuestBlock();
    updateQuestStatus();
    render();
    frame = requestAnimationFrame(loop);
  }

  function jumpOrStart() {
    if (gameMode === 'quest') return;
    if (!running) {
      if (gameOver) return;
      startGame();
    }
    runner.velocityY = -0.58;
    runner.onGround = false;
  }

  function spawnQuestBlock() {
    const letters = [questMindOrder[questBlocksSpawned]];
    while (letters.length < QUEST_BLOCK_ROWS) {
      const distractor = QUEST_DISTRACTOR_LETTERS[
        Math.floor(Math.random() * QUEST_DISTRACTOR_LETTERS.length)
      ];
      if (distractor) letters.push(distractor);
    }
    for (let index = letters.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [letters[index], letters[swapIndex]] = [letters[swapIndex], letters[index]];
    }

    questBlocks.push({
      letters: letters.map((letter) => ({ letter, removed: false })),
      x: WIDTH + 35,
      y: GROUND_Y - QUEST_BLOCK_HEIGHT - QUEST_BLOCK_GROUND_GAP,
      width: QUEST_BLOCK_WIDTH,
      height: QUEST_BLOCK_HEIGHT
    });
    questBlocksSpawned += 1;
    questSpawnTimer = 3900;
  }

  function updateQuestStatus() {
    const collected = MIND_LETTERS.map((letter) => questProgress.includes(letter) ? letter : '_').join('');
    questStatus.textContent = `WORD: ${collected}`;
  }

  function createLetterBurst(block, rowIndex, letter) {
    const rowHeight = block.height / block.letters.length;
    letterBursts.push({
      image: `letter${letter}`,
      x: block.x,
      y: block.y + rowIndex * rowHeight,
      width: block.width,
      height: rowHeight,
      velocityX: 0.08 + Math.random() * 0.12,
      velocityY: -0.18 - Math.random() * 0.18,
      rotation: (Math.random() - 0.5) * 0.3,
      age: 0,
      life: 1300
    });
  }

  function shoot() {
    if (!running) {
      if (gameOver) return;
      startQuestGame();
    }
    const now = performance.now();
    if (now - lastShotAt < 220) return;
    lastShotAt = now;
    const scale = QUEST_FISH_SCALE;
    const fishWidth = FISH_WIDTH * scale;
    const fishHeight = FISH_HEIGHT * scale;
    questProjectiles.push({
      x: FISH_X + (FISH_WIDTH - fishWidth) / 2 + fishWidth - 2,
      y: runner.y + FISH_HEIGHT - fishHeight + fishHeight / 2 - 2,
      width: 12,
      height: 4
    });
  }

  function updateQuest(delta, speed) {
    questSpawnTimer -= delta;
    if (
      questSpawnTimer <= 0 &&
      questBlocks.length < 2 &&
      questBlocksSpawned < QUEST_BLOCKS_PER_ROUND
    ) spawnQuestBlock();

    questBlocks.forEach((block) => {
      block.x -= delta * speed;
    });
    questProjectiles.forEach((projectile) => {
      projectile.x += delta * 0.72;
    });

    questProjectiles = questProjectiles.filter((projectile) => {
      if (projectile.x > WIDTH) return false;
      let hitBlock = null;
      let hitRowIndex = -1;
      for (const block of questBlocks) {
        if (
          projectile.x + projectile.width <= block.x ||
          projectile.x >= block.x + block.width
        ) continue;

        const rowHeight = block.height / block.letters.length;
        const rowIndex = block.letters.findIndex((row, index) => {
          if (row.removed || !QUEST_SPECIAL_LETTERS.includes(row.letter)) return false;
          const rowTop = block.y + index * rowHeight - QUEST_AIM_TOLERANCE;
          const rowBottom = rowTop + rowHeight + QUEST_AIM_TOLERANCE * 2;
          return projectile.y + projectile.height > rowTop && projectile.y < rowBottom;
        });
        if (rowIndex < 0) continue;
        hitBlock = block;
        hitRowIndex = rowIndex;
        break;
      }
      if (!hitBlock) return true;

      const hitRow = hitBlock.letters[hitRowIndex];
      hitRow.removed = true;
      createLetterBurst(hitBlock, hitRowIndex, hitRow.letter);
      if (!questProgress.includes(hitRow.letter)) {
        questProgress += hitRow.letter;
        updateQuestStatus();
      }
      score += 100;
      scoreElement.textContent = String(score).padStart(5, '0');
      return false;
    });

    letterBursts.forEach((particle) => {
      particle.age += delta;
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;
      particle.velocityY += 0.00055 * delta;
    });
    letterBursts = letterBursts.filter((particle) => particle.age < particle.life);
    questBlocks = questBlocks.filter((block) => block.x + block.width > 0);

    const fishBounds = getFishCollisionBounds();
    const { left: fishLeft, right: fishRight, top: fishTop, bottom: fishBottom } = fishBounds;
    if (questBlocks.some((block) => {
      if (fishRight <= block.x || fishLeft >= block.x + block.width) return false;
      const rowHeight = block.height / block.letters.length;
      const isInsideOpenedPassage = block.letters.some((row, index) => {
        if (!row.removed) return false;
        const passage = getQuestPassage(block, index);
        return fishTop >= passage.top && fishBottom <= passage.bottom;
      });
      if (isInsideOpenedPassage) return false;

      return block.letters.some((row, index) => {
        if (row.removed) return false;
        const rowTop = block.y + index * rowHeight;
        const rowBottom = rowTop + rowHeight;
        return fishBottom > rowTop && fishTop < rowBottom;
      });
    })) {
      gameOver = true;
      running = false;
    }
  }

  function primaryInput() {
    if (gameMode === 'quest') shoot();
    else jumpOrStart();
  }

  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    if (gameMode === 'quest') {
      if (!running && !gameOver) startQuestGame();
      return;
    }
    jumpOrStart();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (gameMode !== 'quest') return;
    const bounds = canvas.getBoundingClientRect();
    const scaleY = canvas.height / bounds.height;
    const pointerY = (event.clientY - bounds.top) * scaleY;
    const scaledFishHeight = FISH_HEIGHT * QUEST_FISH_SCALE;
    questFishTargetY = Math.max(
      0,
      Math.min(GROUND_Y - FISH_HEIGHT, pointerY - FISH_HEIGHT + scaledFishHeight / 2)
    );
  });
  restartButton.addEventListener('click', () => {
    if (gameMode === 'quest') startQuestGame();
    else startGame();
  });
  modeHelpButton.addEventListener('click', () => {
    const isExpanded = modeHelpButton.getAttribute('aria-expanded') === 'true';
    modeHelpButton.setAttribute('aria-expanded', String(!isExpanded));
    questModeButton.hidden = isExpanded;
  });
  questModeButton.addEventListener('click', startQuestGame);
  classicModeButton.addEventListener('click', startGame);
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      if (gameMode === 'quest' && event.code === 'ArrowUp') jumpOrStart();
      else primaryInput();
    }
  });

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'fish-game-start') startGame();
    if (event.data?.type === 'fish-game-input') {
      if (gameMode === 'quest' && event.data.code === 'ArrowUp') jumpOrStart();
      else primaryInput();
    }
    if (event.data?.type === 'fish-game-pause') {
      running = false;
      cancelAnimationFrame(frame);
    }
  });

  function prepareFishSprite() {
    if (!fishSprite.naturalWidth || !fishSprite.naturalHeight) return;
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = fishSprite.naturalWidth;
    spriteCanvas.height = fishSprite.naturalHeight;
    const spriteContext = spriteCanvas.getContext('2d', { willReadFrequently: true });
    spriteContext.drawImage(fishSprite, 0, 0);

    const imageData = spriteContext.getImageData(0, 0, spriteCanvas.width, spriteCanvas.height);
    const { data, width, height } = imageData;
    const queue = new Int32Array(width * height);
    let readIndex = 0;
    let writeIndex = 0;
    const enqueueIfBackground = (index) => {
      const pixel = index * 4;
      if (data[pixel + 3] && data[pixel] >= 235 && data[pixel + 1] >= 235 && data[pixel + 2] >= 235) {
        data[pixel + 3] = 0;
        queue[writeIndex++] = index;
      }
    };

    // Remove only white pixels connected to the outside, preserving white details inside the fish.
    for (let x = 0; x < width; x += 1) {
      enqueueIfBackground(x);
      enqueueIfBackground((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueueIfBackground(y * width);
      enqueueIfBackground(y * width + width - 1);
    }
    while (readIndex < writeIndex) {
      const index = queue[readIndex++];
      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0) enqueueIfBackground(index - 1);
      if (x + 1 < width) enqueueIfBackground(index + 1);
      if (y > 0) enqueueIfBackground(index - width);
      if (y + 1 < height) enqueueIfBackground(index + width);
    }

    spriteContext.putImageData(imageData, 0, 0);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    fishSpriteCanvas = spriteCanvas;
    fishSpriteBounds = maxX >= minX && maxY >= minY
      ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : { x: 0, y: 0, width, height };
    render();
  }

  scene.addEventListener('load', render);
  fishSprite.addEventListener('load', prepareFishSprite);
  render();
})();
