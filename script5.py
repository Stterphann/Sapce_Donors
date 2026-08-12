html_code = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Desafio Space Donor</title>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
        }}
        body {{
            background-color: #050510;
            color: #fff;
            font-family: 'Courier New', Courier, monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
        }}
        #game-container {{
            position: relative;
            width: 100vw;
            max-width: 480px;
            height: 90vh;
            max-height: 640px;
            background: #000;
            border: 4px solid #00ffcc;
            box-shadow: 0 0 25px rgba(0, 255, 204, 0.4);
            overflow: hidden;
            border-radius: 8px;
        }}
        canvas {{
            display: block;
            width: 100%;
            height: 100%;
            image-rendering: pixelated;
        }}
        .overlay {{
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(5, 5, 16, 0.92);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
            z-index: 10;
        }}
        h1 {{
            font-size: 26px;
            color: #00ffcc;
            text-shadow: 3px 3px #ff0055;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
            line-height: 1.3;
        }}
        p {{
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 25px;
            color: #e0e0e0;
        }}
        button {{
            background: #ff0055;
            color: #fff;
            border: none;
            padding: 14px 28px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 5px #990033;
            border-radius: 6px;
            transition: transform 0.1s;
        }}
        button:active {{
            transform: translateY(4px);
            box-shadow: 0 1px #990033;
        }}
        #controls {{
            position: absolute;
            bottom: 15px;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: space-around;
            z-index: 5;
            padding: 0 15px;
        }}
        .btn-ctrl {{
            background: rgba(255, 255, 255, 0.15);
            border: 2px solid #00ffcc;
            color: #00ffcc;
            width: 65px;
            height: 55px;
            font-size: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            touch-action: manipulation;
            font-weight: bold;
            text-shadow: 0 0 5px #00ffcc;
        }}
        .btn-ctrl:active {{
            background: rgba(0, 255, 204, 0.4);
        }}
        #btn-fire {{
            width: 100px;
            background: rgba(255, 0, 85, 0.25);
            border-color: #ff0055;
            color: #ff0055;
            text-shadow: 0 0 5px #ff0055;
        }}
        #btn-fire:active {{
            background: rgba(255, 0, 85, 0.6);
        }}
        .hidden {{
            display: none !important;
        }}
        .audio-btn {{
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 20;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid #00ffcc;
            color: #00ffcc;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }}
    </style>
</head>
<body>

<div id="game-container">
    <button id="toggle-sound" class="audio-btn" title="Alternar Som">🔊</button>
    <canvas id="gameCanvas"></canvas>

    <!-- Tela Inicial -->
    <div id="screen-start" class="overlay">
        <h1>Desafio Space Donor</h1>
        <button id="btn-start">INICIAR JOGO</button>
    </div>

    <!-- Tela de Introdução -->
    <div id="screen-intro" class="overlay hidden">
        <p>Alcance a doação, vencendo os maiores obstacles do universo!</p>
        <button id="btn-begin">COMEÇAR</button>
    </div>

    <!-- Modal do Mito/Obstáculo Destruído -->
    <div id="screen-myth" class="overlay hidden">
        <h1 id="myth-title" style="font-size: 20px; color: #ff0055;"></h1>
        <p id="myth-text"></p>
        <button id="btn-continue">CONTINUAR</button>
    </div>

    <!-- Tela Final / Vitória -->
    <div id="screen-victory" class="overlay hidden">
        <h1 style="color: #00ffcc; font-size: 24px;">MISSÃO CUMPRIDA!</h1>
        <p style="font-size: 18px; font-weight: bold; color: #fff; margin-top: 10px;">
            A doação de órgãos salva vidas, avise a sua família.
        </p>
        <button onclick="location.reload()" style="margin-top: 15px;">JOGAR NOVAMENTE</button>
    </div>

    <!-- Controles na Tela para Mobile -->
    <div id="controls" class="hidden">
        <div class="btn-ctrl" id="btn-left">◄</div>
        <div class="btn-ctrl" id="btn-fire">FOGO</div>
        <div class="btn-ctrl" id="btn-right">►</div>
    </div>
</div>

<script>
    // Carregamento dos Assets em Base64
    const imgNaveSrc = "data:image/png;base64,{nave_b64}";
    const imgMeteoroSrc = "data:image/png;base64,{meteoro_b64}";
    const sndLaserSrc = "data:audio/mp3;base64,{laser_b64}";
    const sndMusicSrc = "data:audio/mp3;base64,{music_b64}";

    const imgNave = new Image();
    imgNave.src = imgNaveSrc;

    const imgMeteoro = new Image();
    imgMeteoro.src = imgMeteoroSrc;

    const bgMusic = new Audio(sndMusicSrc);
    bgMusic.loop = true;
    bgMusic.volume = 0.5;

    const laserSound = new Audio(sndLaserSrc);
    laserSound.volume = 0.6;

    let soundMuted = false;
    const toggleSoundBtn = document.getElementById('toggle-sound');
    toggleSoundBtn.addEventListener('click', () => {{
        soundMuted = !soundMuted;
        bgMusic.muted = soundMuted;
        laserSound.muted = soundMuted;
        toggleSoundBtn.innerText = soundMuted ? "🔇" : "🔊";
    }});

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Ajustar tamanho do canvas interno
    canvas.width = 400;
    canvas.height = 600;

    // Elementos de Interface
    const screenStart = document.getElementById('screen-start');
    const screenIntro = document.getElementById('screen-intro');
    const screenMyth = document.getElementById('screen-myth');
    const screenVictory = document.getElementById('screen-victory');
    const controls = document.getElementById('controls');
    
    const mythTitle = document.getElementById('myth-title');
    const mythText = document.getElementById('myth-text');

    // Botões
    document.getElementById('btn-start').addEventListener('click', () => {{
        screenStart.classList.add('hidden');
        screenIntro.classList.remove('hidden');
    }});

    document.getElementById('btn-begin').addEventListener('click', () => {{
        screenIntro.classList.add('hidden');
        controls.classList.remove('hidden');
        gameRunning = true;
        bgMusic.play().catch(e => console.log("Audio play blocked", e));
        requestAnimationFrame(update);
    }});

    document.getElementById('btn-continue').addEventListener('click', () => {{
        screenMyth.classList.add('hidden');
        gamePaused = false;
        requestAnimationFrame(update);
    }});

    function playLaserSound() {{
        if (soundMuted) return;
        const snd = laserSound.cloneNode();
        snd.volume = 0.5;
        snd.play().catch(e => {{}});
    }}

    // Lista de Obstáculos Nomeados (Aparecem apenas 1x cada)
    const namedObstacles = [
        {{ label: "Negativa Familiar", text: "A família é quem autoriza a doação. Informar seus parentes em vida é a chave para transformar essa decisão." }},
        {{ label: "Corpo Deformado", text: "Mito! A retirada dos órgãos é uma cirurgia respeitosa e o corpo não fica deformado para o sepultamento." }},
        {{ label: "Motivos Religiosos", text: "A maioria das grandes religiões apoia expressamente a doação de órgãos como um ato supremo de amor." }},
        {{ label: "Manutenção do Doador", text: "A manutenção hemodinâmica adequada é essencial na UTI para garantir a viabilidade dos órgãos a serem doados." }},
        {{ label: "Diagnóstico Tardio", text: "A agilidade na abertura do protocolo de Morte Encefálica viabiliza o processo e reduz a perda de doadores." }},
        {{ label: "Parada Cardíaca", text: "Complicações hemodinâmicas graves podem levar à perda do doador antes do processo de doação." }},
        {{ label: "Recusa de Protocolo", text: "Falta de conhecimento da equipe pode atrasar a identificação do potencial doador." }}
    ];

    let pendingObstacles = [...namedObstacles];
    let destroyedNamedCount = 0;
    const totalNamedCount = namedObstacles.length;

    // Estado do Jogo
    let gameRunning = false;
    let gamePaused = false;
    let victoryPhase = false;

    // Player (Nave)
    const player = {{
        x: canvas.width / 2 - 25,
        y: canvas.height - 65,
        width: 50,
        height: 50,
        speed: 5,
        dx: 0
    }};

    let bullets = [];
    let obstacles = [];
    let fallingOrgans = [];
    let spawnTimer = 0;

    // Estrelas de Fundo (Pixelated Starfield)
    const stars = Array.from({{ length: 50 }}, () => ({{
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() > 0.8 ? 2 : 1,
        speed: Math.random() * 0.8 + 0.3
    }}));

    // Entradas do Usuário
    const keys = {{}};

    window.addEventListener('keydown', (e) => {{
        keys[e.code] = true;
        if (e.code === 'Space' && gameRunning && !gamePaused && !victoryPhase) {{
            shoot();
        }}
    }});

    window.addEventListener('keyup', (e) => {{
        keys[e.code] = false;
    }});

    // Controles Touch
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnFire = document.getElementById('btn-fire');

    btnLeft.addEventListener('touchstart', (e) => {{ e.preventDefault(); keys['ArrowLeft'] = true; }});
    btnLeft.addEventListener('touchend', (e) => {{ e.preventDefault(); keys['ArrowLeft'] = false; }});
    btnRight.addEventListener('touchstart', (e) => {{ e.preventDefault(); keys['ArrowRight'] = true; }});
    btnRight.addEventListener('touchend', (e) => {{ e.preventDefault(); keys['ArrowRight'] = false; }});
    btnFire.addEventListener('touchstart', (e) => {{ 
        e.preventDefault(); 
        if (gameRunning && !gamePaused && !victoryPhase) shoot(); 
    }});

    function shoot() {{
        bullets.push({{
            x: player.x + player.width / 2 - 3,
            y: player.y,
            width: 6,
            height: 16,
            speed: 8
        }});
        playLaserSound();
    }}

    function spawnObstacle() {{
        let isNamed = false;
        let data = null;

        if (pendingObstacles.length > 0 && Math.random() < 0.65) {{
            isNamed = true;
            data = pendingObstacles.shift();
        }}

        obstacles.push({{
            x: Math.random() * (canvas.width - 100) + 10,
            y: -80,
            width: 80,
            height: 80,
            speed: 1.2,
            isNamed: isNamed,
            label: isNamed ? data.label : "Obstáculo",
            text: isNamed ? data.text : ""
        }});
    }}

    function triggerVictorySequence() {{
        victoryPhase = true;
        controls.classList.add('hidden');
        
        const organTypes = ['❤️', '🫁', '🫀', '🧠'];
        for (let i = 0; i < 16; i++) {{
            fallingOrgans.push({{
                x: (i % 4) * 90 + 35,
                y: -60 - Math.floor(i / 4) * 70,
                symbol: organTypes[i % organTypes.length],
                speed: 1.8
            }});
        }}
    }}

    // Loop de Atualização
    function update() {{
        if (!gameRunning || gamePaused) return;

        // Mover jogador
        if (keys['ArrowLeft'] || keys['KeyA']) player.dx = -player.speed;
        else if (keys['ArrowRight'] || keys['KeyD']) player.dx = player.speed;
        else player.dx = 0;

        player.x += player.dx;
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

        // Mover Projéteis
        bullets.forEach((b, index) => {{
            b.y -= b.speed;
            if (b.y < -20) bullets.splice(index, 1);
        }});

        // Spawn de Obstáculos
        if (!victoryPhase) {{
            spawnTimer++;
            if (spawnTimer > 110) {{
                spawnObstacle();
                spawnTimer = 0;
            }}

            // Mover Obstáculos
            obstacles.forEach((obs, oIndex) => {{
                obs.y += obs.speed;

                // Colisão Projétil x Obstáculo
                bullets.forEach((b, bIndex) => {{
                    if (b.x < obs.x + obs.width &&
                        b.x + b.width > obs.x &&
                        b.y < obs.y + obs.height &&
                        b.y + b.height > obs.y) {{
                        
                        bullets.splice(bIndex, 1);

                        if (obs.isNamed) {{
                            destroyedNamedCount++;
                            gamePaused = true;
                            mythTitle.innerText = obs.label;
                            mythText.innerText = obs.text;
                            screenMyth.classList.remove('hidden');
                        }}
                        
                        obstacles.splice(oIndex, 1);

                        if (destroyedNamedCount >= totalNamedCount) {{
                            triggerVictorySequence();
                        }}
                    }}
                }});

                // Se o obstáculo passar direto, coloca de volta na fila se for nomeado
                if (obs.y > canvas.height) {{
                    if (obs.isNamed) {{
                        pendingObstacles.push({{ label: obs.label, text: obs.text }});
                    }}
                    obstacles.splice(oIndex, 1);
                }}
            }});
        }} else {{
            fallingOrgans.forEach((organ) => {{
                organ.y += organ.speed;
            }});

            if (fallingOrgans.length > 0 && fallingOrgans[0].y >= player.y - 20) {{
                gameRunning = false;
                setTimeout(() => {{
                    screenVictory.classList.remove('hidden');
                }}, 600);
            }}
        }}

        // Mover Estrelas
        stars.forEach(star => {{
            star.y += star.speed;
            if (star.y > canvas.height) star.y = 0;
        }});

        draw();

        if (gameRunning && !gamePaused) {{
            requestAnimationFrame(update);
        }}
    }}

    // Renderização Visual
    function draw() {{
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Estrelas
        ctx.fillStyle = '#ffffff';
        stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

        // Desenhar Nave Pixelada (Imagem original)
        if (imgNave.complete && imgNave.naturalWidth !== 0) {{
            ctx.drawImage(imgNave, player.x, player.y, player.width, player.height);
        }} else {{
            // Fallback
            ctx.fillStyle = '#00ffcc';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }}

        // Desenhar Tiros / Lasers estilizados
        bullets.forEach(b => {{
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(b.x, b.y, b.width, b.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(b.x + 1, b.y + 2, b.width - 2, b.height - 4);
        }});

        // Desenhar Meteoros e Rótulos
        obstacles.forEach(obs => {{
            if (imgMeteoro.complete && imgMeteoro.naturalWidth !== 0) {{
                ctx.drawImage(imgMeteoro, obs.x, obs.y, obs.width, obs.height);
            }} else {{
                ctx.fillStyle = '#4a75a0';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            }}

            // Faixa de fundo para legibilidade perfeita do texto
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(obs.x - 10, obs.y + obs.height / 2 - 12, obs.width + 20, 24);
            
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 1;
            ctx.strokeRect(obs.x - 10, obs.y + obs.height / 2 - 12, obs.width + 20, 24);

            // Texto dentro do Meteoro
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(obs.label, obs.x + obs.width / 2, obs.y + obs.height / 2 + 4);
        }});

        // Desenhar Órgãos na animação de vitória
        if (victoryPhase) {{
            ctx.font = '32px serif';
            ctx.textAlign = 'center';
            fallingOrgans.forEach(o => {{
                ctx.fillText(o.symbol, o.x, o.y);
            }});
        }}
    }}
</script>
</body>
</html>
'''

with open("space_donor_game.html", "w", encoding="utf-8") as f:
    f.write(html_code)

print("File generated successfully: space_donor_game.html")
