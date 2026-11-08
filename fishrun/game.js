(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreElement = document.getElementById('score');
  const restartButton = document.getElementById('restartButton');
  const scene = new Image();
  const fishSprite = new Image();
  scene.src = 'minigame.png';
  fishSprite.src = 'fish.png';
  let fishSpriteCanvas = null;
  let fishSpriteBounds = null;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GROUND_Y = 505;
  const FISH_X = 115;
  const FISH_WIDTH = 52;
  const FISH_HEIGHT = 42;
  const OBSTACLE = { x: 286, y: 304, width: 112, height: 207 };
  const runner = { y: GROUND_Y - FISH_HEIGHT, velocityY: 0, onGround: true };

  let running = false;
  let gameOver = false;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let sceneryOffset = 0;
  let score = 0;
  let achievementSent = false;

  function drawScene() {
    if (scene.complete && scene.naturalWidth) {
      ctx.drawImage(scene, -sceneryOffset, 0, WIDTH, HEIGHT);
      ctx.drawImage(scene, WIDTH - sceneryOffset, 0, WIDTH, HEIGHT);
      return;
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#444';
    ctx.fillRect(0, GROUND_Y, WIDTH, 5);
  }

  function drawFish() {
    const bob = runner.onGround && !gameOver ? Math.floor(elapsed / 120) % 2 * 2 : 0;
    if (fishSpriteCanvas && fishSpriteBounds) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        fishSpriteCanvas,
        fishSpriteBounds.x,
        fishSpriteBounds.y,
        fishSpriteBounds.width,
        fishSpriteBounds.height,
        FISH_X,
        Math.round(runner.y + bob),
        FISH_WIDTH,
        FISH_HEIGHT
      );
    } else {
      ctx.fillStyle = '#444';
      ctx.fillRect(FISH_X + 8, runner.y + 8, 36, 25);
      ctx.fillRect(FISH_X, runner.y + 12, 12, 16);
      ctx.fillStyle = '#fff';
      ctx.fillRect(FISH_X + 34, runner.y + 12, 4, 4);
    }
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
    drawScene();
    drawFish();
    if (gameOver) drawOverlay('GAME OVER', 'PRESS RESTART');
    else if (!running) drawOverlay('PIXEL FISH RUN', 'PRESS SPACE / CLICK TO START');
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
    score = Math.floor(elapsed * (1507 / 40000));
    scoreElement.textContent = String(score).padStart(5, '0');

    if (score >= 1507 && !achievementSent) {
      achievementSent = true;
      window.parent.postMessage({ type: 'fish-game-achievement', achievement: '1507' }, '*');
    }

    const speed = 0.2 + Math.min(score * 0.0004, 0.12);
    sceneryOffset = (sceneryOffset + delta * speed) % WIDTH;

    runner.velocityY += 0.0014 * delta;
    runner.y += runner.velocityY * delta;
    if (runner.y + FISH_HEIGHT >= GROUND_Y) {
      runner.y = GROUND_Y - FISH_HEIGHT;
      runner.velocityY = 0;
      runner.onGround = true;
    }

    if (overlapsObstacle()) {
      gameOver = true;
      running = false;
    }
  }

  function loop(now) {
    if (!running) return;
    const delta = Math.min(now - (lastTime || now), 40);
    lastTime = now;
    update(delta);
    render();
    if (running) frame = requestAnimationFrame(loop);
  }

  function startGame() {
    cancelAnimationFrame(frame);
    runner.y = GROUND_Y - FISH_HEIGHT;
    runner.velocityY = 0;
    runner.onGround = true;
    elapsed = 0;
    // Start in a clear stretch of water; the first large coral approaches from the right.
    sceneryOffset = 450;
    score = 0;
    achievementSent = false;
    gameOver = false;
    running = true;
    lastTime = 0;
    scoreElement.textContent = '00000';
    render();
    frame = requestAnimationFrame(loop);
  }

  function jumpOrStart() {
    if (!running) {
      if (gameOver) return;
      startGame();
    }
    // Flappy-style control: every click adds a fresh upward flap, even mid-air.
    runner.velocityY = -0.58;
    runner.onGround = false;
  }

  document.addEventListener('pointerdown', (event) => {
    if (event.target === restartButton || event.target.closest('#restartButton')) return;
    jumpOrStart();
  });
  restartButton.addEventListener('click', startGame);
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      jumpOrStart();
    }
  });

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'fish-game-start') startGame();
    if (event.data?.type === 'fish-game-input') jumpOrStart();
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
