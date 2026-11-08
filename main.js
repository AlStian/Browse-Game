/* --- СКРИПТ УПРАВЛЕНИЯ КОМНАТОЙ И ТЕРМИНАЛОМ --- */

/* --- MINIMAL AUDIO ENGINE --- */
class MinimalAudio {
    constructor() {
        this.ctx = null;
        this.enabled = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.init();
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playKeyClick() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800 + Math.random() * 200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.015);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.015);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.015);
    }

    playError() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playSuccess() {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const audio = new MinimalAudio();
    const TARGET_USERNAME = 'KYLE';
    const TARGET_PASSWORD = '1507';

    // Элементы комнаты
    const pcTable = document.getElementById('pc-table');
    const terminalOverlay = document.getElementById('terminal-overlay');
    const closeTerminalBtn = document.getElementById('closeTerminalBtn');
    const windowLeft = document.getElementById('window-left');
    const viewOverlay = document.getElementById('view-overlay');
    const closeViewBtn = document.getElementById('closeViewBtn');
    const bodyLeft = document.getElementById('body-left');
    const letterOverlay = document.getElementById('letter-overlay');
    const closeLetterBtn = document.getElementById('closeLetterBtn');
    const letterImage = letterOverlay.querySelector('.letter-image');
    const flipLetterBtn = document.getElementById('flipLetterBtn');
    const ticTacToeLauncher = document.getElementById('ticTacToeLauncher');
    const ticTacToeWindow = document.getElementById('ticTacToeWindow');
    const closeTicTacToeBtn = document.getElementById('closeTicTacToeBtn');
    const ticTacToeStatus = document.getElementById('ticTacToeStatus');
    const ticTacToeBoard = document.getElementById('ticTacToeBoard');
    const ticTacToeCells = [...ticTacToeBoard.querySelectorAll('.tic-tac-toe-cell')];
    const restartTicTacToeBtn = document.getElementById('restartTicTacToeBtn');
    const desktopFileLauncher = document.getElementById('desktopFileLauncher');
    const fileTextWindow = document.getElementById('fileTextWindow');
    const fileTextEditor = document.getElementById('fileTextEditor');
    const closeFileTextBtn = document.getElementById('closeFileTextBtn');
    const fileMessageOverlay = document.getElementById('file-message-overlay');
    const closeFileMessageBtn = document.getElementById('closeFileMessageBtn');
    const paintLauncher = document.getElementById('paintLauncher');
    const paintWindow = document.getElementById('paintWindow');
    const closePaintBtn = document.getElementById('closePaintBtn');
    const paintCanvas = document.getElementById('paintCanvas');
    const paintContext = paintCanvas.getContext('2d');
    const paintToolBtn = document.getElementById('paintToolBtn');
    const paintSize = document.getElementById('paintSize');
    const clearPaintBtn = document.getElementById('clearPaintBtn');
    const fishGameLauncher = document.getElementById('fishGameLauncher');
    const fishGameWindow = document.getElementById('fishGameWindow');
    const closeFishGameBtn = document.getElementById('closeFishGameBtn');
    const fishGameFrame = document.getElementById('fishGameFrame');
    const achievementToast = document.getElementById('achievementToast');
    const thoughtOverlay = document.getElementById('thought-overlay');
    const closeThoughtBtn = document.getElementById('closeThoughtBtn');
    const mirrorOverlay = document.getElementById('mirror-overlay');
    const closeMirrorBtn = document.getElementById('closeMirrorBtn');
    let hasSeenCorpseThought = false;
    let hasTurnedLetterOver = false;
    let ticTacToeState = Array(9).fill('');
    let ticTacToeFinished = false;
    let isDrawing = false;
    let isPaintEraser = false;
    let lastPaintPoint = null;
    let fishGameFrameLoaded = false;
    let achievementToastTimer = 0;
    let fileTextOpener = null;
    let fileMessageTimer = 0;

    // Элементы терминала
    const passwordInput = document.getElementById('passwordInput');
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const statusMsg = document.getElementById('statusMsg');
    const desktopScreen = document.getElementById('desktopScreen');
    const desktopArt = desktopScreen.querySelector('.desktop-art');
    const desktopLogoutBtn = document.getElementById('desktopLogoutBtn');
    const loginUserArt = document.getElementById('loginUserArt');
    const loginImageEditBtn = document.getElementById('loginImageEditBtn');
    const loginImageInput = document.getElementById('loginImageInput');
    const loginImageEditStatus = document.getElementById('loginImageEditStatus');
    let isAuthenticated = false;

    try {
        localStorage.removeItem('webgame-login-screen-image');
    } catch (error) {
        console.error('Could not clear the previously saved lock screen image.', error);
    }

    function setScreenImage(image, input, status) {
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            status.textContent = 'Please select an image file.';
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('error', () => {
            status.textContent = 'Could not read the selected image.';
        }, { once: true });
        reader.addEventListener('load', () => {
            if (typeof reader.result !== 'string') {
                status.textContent = 'Could not read the selected image.';
                return;
            }

            const preview = new Image();
            preview.addEventListener('error', () => {
                status.textContent = 'The selected file is not a valid image.';
            }, { once: true });
            preview.addEventListener('load', () => {
                image.src = reader.result;
                image.classList.remove('hidden');
                status.textContent = '';
            }, { once: true });
            preview.src = reader.result;
        }, { once: true });
        reader.readAsDataURL(file);
    }

    function setLoginEditVisible(visible) {
        loginImageEditBtn.hidden = !visible;
        loginImageEditStatus.hidden = !visible;
        loginUserArt.classList.toggle('hidden', !visible || !loginUserArt.src);
    }

    loginImageEditBtn.addEventListener('click', () => loginImageInput.click());
    loginImageInput.addEventListener('change', () => {
        setScreenImage(loginUserArt, loginImageInput, loginImageEditStatus);
    });

    // Открытие терминала по клику на компьютер
    pcTable.addEventListener('click', () => {
        terminalOverlay.classList.remove('hidden');
        if (isAuthenticated) {
            desktopScreen.classList.remove('hidden');
        } else {
            document.getElementById('usernameInput').focus();
        }
    });

    // Закрытие терминала по кнопке EXIT
    closeTerminalBtn.addEventListener('click', () => {
        fishGameFrame.contentWindow.postMessage({ type: 'fish-game-pause' }, '*');
        terminalOverlay.classList.add('hidden');
    });

    bodyLeft.addEventListener('click', () => {
        if (!hasSeenCorpseThought) {
            hasSeenCorpseThought = true;
            thoughtOverlay.classList.remove('hidden');
            return;
        }
        letterImage.src = 'letter.png';
        letterImage.alt = 'Передняя сторона письма';
        flipLetterBtn.textContent = 'TURN OVER';
        letterOverlay.classList.remove('hidden');
    });

    function openView() {
        viewOverlay.classList.remove('hidden');
        closeViewBtn.focus();
    }

    function closeView() {
        viewOverlay.classList.add('hidden');
        windowLeft.focus();
    }

    windowLeft.addEventListener('click', openView);
    windowLeft.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openView();
        }
    });
    closeViewBtn.addEventListener('click', closeView);
    viewOverlay.addEventListener('click', (event) => {
        if (event.target === viewOverlay) closeView();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !viewOverlay.classList.contains('hidden')) {
            closeView();
        }
    });

    document.getElementById('window-right').addEventListener('click', () => {
        mirrorOverlay.classList.remove('hidden');
    });

    closeMirrorBtn.addEventListener('click', () => {
        mirrorOverlay.classList.add('hidden');
    });

    mirrorOverlay.addEventListener('click', (event) => {
        if (event.target === mirrorOverlay) {
            mirrorOverlay.classList.add('hidden');
        }
    });

    closeThoughtBtn.addEventListener('click', () => {
        thoughtOverlay.classList.add('hidden');
    });

    thoughtOverlay.addEventListener('click', (event) => {
        if (event.target === thoughtOverlay) {
            thoughtOverlay.classList.add('hidden');
        }
    });

    closeLetterBtn.addEventListener('click', () => {
        letterOverlay.classList.add('hidden');
    });

    flipLetterBtn.addEventListener('click', () => {
        const isFront = letterImage.src.endsWith('/letter.png') || letterImage.src.endsWith('letter.png');
        letterImage.src = isFront ? 'letter2.png' : 'letter.png';
        letterImage.alt = isFront ? 'Обратная сторона письма' : 'Передняя сторона письма';
        flipLetterBtn.textContent = isFront ? 'TURN BACK' : 'TURN OVER';
        if (isFront) hasTurnedLetterOver = true;
    });

    letterOverlay.addEventListener('click', (event) => {
        if (event.target === letterOverlay) {
            letterOverlay.classList.add('hidden');
        }
    });

    const winningLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    function getWinner(board) {
        for (const [a, b, c] of winningLines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        return '';
    }

    function minimax(board, player, depth) {
        const winner = getWinner(board);
        if (winner === 'O') return { score: 10 - depth };
        if (winner === 'X') return { score: depth - 10 };
        if (board.every(Boolean)) return { score: 0 };

        const moves = [];
        for (let index = 0; index < board.length; index += 1) {
            if (board[index]) continue;
            board[index] = player;
            const result = minimax(board, player === 'O' ? 'X' : 'O', depth + 1);
            moves.push({ index, score: result.score });
            board[index] = '';
        }

        if (moves.length === 0) return { score: 0 };
        const bestScore = player === 'O'
            ? Math.max(...moves.map((move) => move.score))
            : Math.min(...moves.map((move) => move.score));
        return { score: bestScore, moves: moves.filter((move) => move.score === bestScore) };
    }

    function finishTicTacToeIfNeeded() {
        const noteSolvedDiagonally = hasTurnedLetterOver
            && [[0, 4, 8], [2, 4, 6]].some((line) => (
                ticTacToeState[line[0]] === 'X'
                && ticTacToeState[line[1]] === 'O'
                && ticTacToeState[line[2]] === 'X'
            ));
        if (noteSolvedDiagonally) {
            desktopArt.src = 'fullDeskBig.png';
            desktopScreen.classList.add('secret-unlocked');
        }

        const winner = getWinner(ticTacToeState);
        if (winner) {
            ticTacToeFinished = true;
            ticTacToeStatus.textContent = winner === 'X' ? 'You win!' : 'Computer wins!';
            return true;
        }
        if (ticTacToeState.every(Boolean)) {
            ticTacToeFinished = true;
            ticTacToeStatus.textContent = 'Draw!';
            return true;
        }
        return false;
    }

    function renderTicTacToe() {
        ticTacToeCells.forEach((cell, index) => {
            cell.textContent = ticTacToeState[index];
            cell.disabled = ticTacToeFinished || Boolean(ticTacToeState[index]);
            cell.setAttribute('aria-label', `Клетка ${index + 1}${ticTacToeState[index] ? `: ${ticTacToeState[index]}` : ''}`);
        });
    }

    function computerTicTacToeMove() {
        const legalMoves = ticTacToeState
            .map((cell, index) => (!cell ? index : -1))
            .filter((index) => index !== -1);

        if (!legalMoves.length) {
            ticTacToeFinished = true;
            ticTacToeStatus.textContent = 'Draw! Computer has no legal move.';
            renderTicTacToe();
            return;
        }

        const isFirstComputerMove = !ticTacToeState.includes('O');
        let moveIndex;

        // После изучения обратной стороны записки бот стремится занять центр первым ходом.
        if (hasTurnedLetterOver && isFirstComputerMove && !ticTacToeState[4]) {
            moveIndex = 4;
        } else {
            const availableMoves = legalMoves.filter((index) => (
                (hasTurnedLetterOver || index !== 4)
                && (!isFirstComputerMove || index !== 8 || hasTurnedLetterOver)
            ));

            if (!availableMoves.length) {
                ticTacToeFinished = true;
                ticTacToeStatus.textContent = 'Draw! Computer has no legal move.';
                renderTicTacToe();
                return;
            }

            // Иногда бот выбирает случайный допустимый ход, чтобы у игрока был шанс победить.
            const mistakeChance = hasTurnedLetterOver ? 0.35 : 0.15;
            const makesMistake = Math.random() < mistakeChance;
            if (makesMistake) {
                moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            } else {
                const result = minimax(ticTacToeState, 'O', 0);
                const bestChoices = (result.moves || [])
                    .map((move) => move.index)
                    .filter((index) => availableMoves.includes(index));
                const choices = bestChoices.length ? bestChoices : availableMoves;
                moveIndex = choices[Math.floor(Math.random() * choices.length)];
            }
        }

        ticTacToeState[moveIndex] = 'O';
        if (!finishTicTacToeIfNeeded()) ticTacToeStatus.textContent = 'Your turn — X';
        renderTicTacToe();
    }

    function resetTicTacToe() {
        ticTacToeState = Array(9).fill('');
        ticTacToeFinished = false;
        ticTacToeStatus.textContent = 'Your turn — X';
        renderTicTacToe();
    }

    ticTacToeLauncher.addEventListener('click', () => {
        ticTacToeWindow.classList.remove('hidden');
        resetTicTacToe();
    });

    desktopFileLauncher.addEventListener('click', () => {
        window.clearTimeout(fileMessageTimer);
        fileMessageOverlay.classList.add('hidden');
        fileTextOpener = desktopFileLauncher;
        fileTextWindow.classList.remove('hidden');
        fileTextEditor.setSelectionRange(fileTextEditor.value.length, fileTextEditor.value.length);
        fileTextEditor.focus();
        fileMessageTimer = window.setTimeout(() => {
            if (!fileTextWindow.classList.contains('hidden')) {
                fileMessageOverlay.classList.remove('hidden');
                closeFileMessageBtn.focus();
            }
        }, 3000);
    });

    function closeFileTextWindow() {
        window.clearTimeout(fileMessageTimer);
        fileTextWindow.classList.add('hidden');
        fileMessageOverlay.classList.add('hidden');
        if (fileTextOpener) fileTextOpener.focus();
    }

    closeFileTextBtn.addEventListener('click', closeFileTextWindow);
    closeFileMessageBtn.addEventListener('click', () => {
        fileMessageOverlay.classList.add('hidden');
        if (!fileTextWindow.classList.contains('hidden')) fileTextEditor.focus();
    });
    fileMessageOverlay.addEventListener('click', (event) => {
        if (event.target === fileMessageOverlay) {
            fileMessageOverlay.classList.add('hidden');
            if (!fileTextWindow.classList.contains('hidden')) fileTextEditor.focus();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!fileMessageOverlay.classList.contains('hidden')) {
            fileMessageOverlay.classList.add('hidden');
            if (!fileTextWindow.classList.contains('hidden')) fileTextEditor.focus();
        } else if (!fileTextWindow.classList.contains('hidden')) {
            closeFileTextWindow();
        }
    });

    closeTicTacToeBtn.addEventListener('click', () => ticTacToeWindow.classList.add('hidden'));
    ticTacToeWindow.addEventListener('click', (event) => {
        if (event.target === ticTacToeWindow) ticTacToeWindow.classList.add('hidden');
    });
    restartTicTacToeBtn.addEventListener('click', resetTicTacToe);
    ticTacToeCells.forEach((cell, index) => {
        cell.addEventListener('click', () => {
            if (ticTacToeFinished || ticTacToeState[index]) return;
            ticTacToeState[index] = 'X';
            if (finishTicTacToeIfNeeded()) {
                renderTicTacToe();
                return;
            }
            ticTacToeStatus.textContent = 'Computer is thinking…';
            renderTicTacToe();
            computerTicTacToeMove();
        });
    });

    paintContext.fillStyle = '#ffffff';
    paintContext.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
    paintContext.lineCap = 'round';
    paintContext.lineJoin = 'round';

    function getPaintPoint(event) {
        const bounds = paintCanvas.getBoundingClientRect();
        return {
            x: (event.clientX - bounds.left) * (paintCanvas.width / bounds.width),
            y: (event.clientY - bounds.top) * (paintCanvas.height / bounds.height)
        };
    }

    function drawPixelStroke(point) {
        const pixelSize = 3;
        const snappedX = Math.round(point.x / pixelSize) * pixelSize;
        const snappedY = Math.round(point.y / pixelSize) * pixelSize;
        const brushSize = Math.max(pixelSize, Math.round(Number(paintSize.value) * (paintCanvas.width / paintCanvas.clientWidth) / pixelSize) * pixelSize);
        paintContext.fillStyle = isPaintEraser ? '#ffffff' : '#000000';

        if (!lastPaintPoint) {
            paintContext.fillRect(snappedX - brushSize / 2, snappedY - brushSize / 2, brushSize, brushSize);
        } else {
            const dx = snappedX - lastPaintPoint.x;
            const dy = snappedY - lastPaintPoint.y;
            const distance = Math.hypot(dx, dy);
            const steps = Math.max(1, Math.ceil(distance / pixelSize));
            for (let step = 1; step <= steps; step += 1) {
                const x = Math.round((lastPaintPoint.x + dx * (step / steps)) / pixelSize) * pixelSize;
                const y = Math.round((lastPaintPoint.y + dy * (step / steps)) / pixelSize) * pixelSize;
                paintContext.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
            }
        }

        lastPaintPoint = { x: snappedX, y: snappedY };
    }

    paintCanvas.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        isDrawing = true;
        paintCanvas.setPointerCapture(event.pointerId);
        lastPaintPoint = null;
        drawPixelStroke(getPaintPoint(event));
    });

    paintCanvas.addEventListener('pointermove', (event) => {
        if (!isDrawing) return;
        drawPixelStroke(getPaintPoint(event));
    });

    function stopPaintStroke() {
        isDrawing = false;
        lastPaintPoint = null;
    }

    paintCanvas.addEventListener('pointerup', stopPaintStroke);
    paintCanvas.addEventListener('pointercancel', stopPaintStroke);
    paintCanvas.addEventListener('lostpointercapture', stopPaintStroke);

    paintLauncher.addEventListener('click', () => paintWindow.classList.remove('hidden'));
    closePaintBtn.addEventListener('click', () => paintWindow.classList.add('hidden'));
    paintToolBtn.addEventListener('click', () => {
        isPaintEraser = !isPaintEraser;
        paintToolBtn.textContent = `ERASER: ${isPaintEraser ? 'ON' : 'OFF'}`;
        paintToolBtn.setAttribute('aria-pressed', String(isPaintEraser));
    });
    clearPaintBtn.addEventListener('click', () => {
        paintContext.fillStyle = '#ffffff';
        paintContext.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
    });

    fishGameLauncher.addEventListener('click', () => {
        fishGameWindow.classList.remove('hidden');
        if (fishGameFrameLoaded) {
            fishGameFrame.contentWindow.postMessage({ type: 'fish-game-start' }, '*');
        }
        fishGameFrame.focus();
    });
    fishGameFrame.addEventListener('load', () => {
        fishGameFrameLoaded = true;
        if (!fishGameWindow.classList.contains('hidden')) {
            fishGameFrame.contentWindow.postMessage({ type: 'fish-game-start' }, '*');
        }
    });
    window.addEventListener('message', (event) => {
        if (event.source !== fishGameFrame.contentWindow || event.data?.type !== 'fish-game-achievement') return;

        const achievementKey = 'webgame-achievement-1507';
        try {
            if (localStorage.getItem(achievementKey)) return;
            localStorage.setItem(achievementKey, 'unlocked');
        } catch {
            // Still show the achievement if browser storage is unavailable.
        }

        achievementToast.classList.add('is-visible');
        achievementToast.setAttribute('aria-hidden', 'false');
        window.clearTimeout(achievementToastTimer);
        achievementToastTimer = window.setTimeout(() => {
            achievementToast.classList.remove('is-visible');
            achievementToast.setAttribute('aria-hidden', 'true');
        }, 4000);
    });
    closeFishGameBtn.addEventListener('click', () => {
        fishGameFrame.contentWindow.postMessage({ type: 'fish-game-pause' }, '*');
        fishGameWindow.classList.add('hidden');
    });
    document.addEventListener('keydown', (event) => {
        if (fishGameWindow.classList.contains('hidden')) return;
        if (event.code === 'Space' || event.code === 'ArrowUp') {
            event.preventDefault();
            fishGameFrame.contentWindow.postMessage({ type: 'fish-game-input' }, '*');
        }
    });

    // Проверка пароля
    function checkPassword() {
        const username = document.getElementById('usernameInput').value.trim().toUpperCase();
        const password = passwordInput.value.trim();

        if (username === TARGET_USERNAME && password === TARGET_PASSWORD) {
            audio.playSuccess();
            isAuthenticated = true;
            setLoginEditVisible(false);
            loginForm.style.display = 'none';
            desktopScreen.classList.remove('hidden');
        } else {
            audio.playError();
            statusMsg.textContent = '';
            loginBtn.classList.remove('shake');
            void loginBtn.offsetWidth;
            loginBtn.classList.add('shake');
        }
    }

    loginBtn.addEventListener('animationend', () => {
        loginBtn.classList.remove('shake');
    });

    passwordInput.addEventListener('input', () => {
        statusMsg.textContent = '';
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        checkPassword();
    });

    desktopLogoutBtn.addEventListener('click', () => {
        fishGameFrame.contentWindow.postMessage({ type: 'fish-game-pause' }, '*');
        isAuthenticated = false;
        desktopScreen.classList.add('hidden');
        loginForm.style.display = 'block';
        setLoginEditVisible(true);
        passwordInput.value = '';
        document.getElementById('usernameInput').focus();
    });

});