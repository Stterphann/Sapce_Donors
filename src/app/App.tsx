import { useState, useEffect, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const CW = 272;
const CH = 352;
const SHIP_Y = 314;
const SHIP_SPEED = 3.5;
const BULLET_SPEED = 7;
const SHOOT_CD = 14;

const HARD_DATA = [
  {
    keyword: "Negativa\nFamiliar",
    label: "Negativa Familiar",
    message:
      "A família é quem autoriza a doação. Informar seus parentes em vida é a chave para transformar essa decisão.",
  },
  {
    keyword: "Corpo\nDeformado",
    label: "Corpo Deformado",
    message:
      "Mito! A retirada dos órgãos é uma cirurgia respeitosa e o corpo não fica deformado para o sepultamento.",
  },
  {
    keyword: "Religião",
    label: "Religião",
    message:
      "A maioria das grandes religiões apoia expressamente a doação de órgãos como um ato supremo de amor.",
  },
  {
    keyword: "Manutenção\ndo Doador",
    label: "Manutenção do Doador",
    message:
      "A manutenção hemodinâmica adequada é essencial na UTI para garantir a viabilidade dos órgãos a serem doados.",
  },
  {
    keyword: "Diagnóstico\nTardio",
    label: "Diagnóstico Tardio",
    message:
      "A agilidade na abertura do protocolo de Morte Encefálica viabiliza o processo e reduz a perda de doadores.",
  },
  {
    keyword: "Parada\nCardíaca",
    label: "Parada Cardíaca",
    message:
      "Complicações hemodinâmicas graves podem levar à perda do doador antes do processo de doação.",
  },
];

// pixel art organ bitmaps [row][col] – ps = pixel size
const ORGANS = [
  {
    g: [[0,1,1,0,1,1,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0]],
    c: "#ff3355", ps: 3,
  },
  {
    g: [[0,1,1,1,1,0],[1,1,1,1,1,1],[1,1,0,1,1,1],[1,1,1,1,1,1],[0,1,1,1,1,0]],
    c: "#ff88aa", ps: 4,
  },
  {
    g: [[0,1,1,1,1,0],[1,1,1,1,1,1],[1,1,1,1,1,0],[0,1,1,1,0,0]],
    c: "#cc7722", ps: 4,
  },
  {
    g: [[1,0,0,0,1],[1,1,0,1,1],[1,1,1,1,1],[0,1,1,1,0]],
    c: "#ffbbdd", ps: 4,
  },
  {
    g: [[0,1,1,1,0],[1,1,1,1,1],[1,0,1,0,1],[1,1,1,1,1],[0,1,1,1,0]],
    c: "#44aaff", ps: 3,
  },
  {
    g: [[0,1,1,1,0],[1,0,1,0,1],[0,1,1,1,0],[1,0,1,0,1],[0,1,1,1,0]],
    c: "#cc88ff", ps: 3,
  },
];

// ── Types ──────────────────────────────────────────────────────────────────
type Phase = "title" | "intro" | "playing" | "message" | "victory";

interface Star   { x: number; y: number; r: number; speed: number; bright: number }
interface Bullet { id: number; x: number; y: number }
interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}
interface Meteor {
  id: number; x: number; y: number; vx: number; vy: number;
  r: number; hp: number; maxHp: number; type: "easy" | "medium" | "hard";
  keyword?: string; message?: string; label?: string;
  hitFlash: number; angle: number; angleSpeed: number; shape: number[];
}
interface OrganDrop { id: number; x: number; y: number; vy: number; oi: number }
interface GS {
  frame: number;
  ship: { x: number; y: number };
  bullets: Bullet[];
  meteors: Meteor[];
  stars: Star[];
  particles: Particle[];
  organs: OrganDrop[];
  idCtr: number;
  easyTimer: number; mediumTimer: number; hardTimer: number;
  hardActive: boolean; hardQueue: number; hardDestroyed: number;
  shootCd: number; paused: boolean; victoryOrganTimer: number;
}

function makeGS(): GS {
  return {
    frame: 0, ship: { x: CW / 2, y: SHIP_Y },
    bullets: [], meteors: [], stars: [], particles: [], organs: [],
    idCtr: 0,
    easyTimer: 90, mediumTimer: 420, hardTimer: 960,
    hardActive: false, hardQueue: 0, hardDestroyed: 0,
    shootCd: 0, paused: false, victoryOrganTimer: 20,
  };
}

function makeStars(): Star[] {
  return Array.from({ length: 70 }, () => ({
    x: Math.random() * CW, y: Math.random() * CH,
    r: Math.random() < 0.65 ? 0.6 : 1.2,
    speed: 0.25 + Math.random() * 0.65,
    bright: 0.35 + Math.random() * 0.65,
  }));
}

function makeShape(n: number): number[] {
  return Array.from({ length: n }, () => 0.6 + Math.random() * 0.4);
}

// ── Audio ──────────────────────────────────────────────────────────────────
class SFX {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  bgmId: ReturnType<typeof setInterval> | null = null;

  init() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
    } catch { /* silent */ }
  }

  private tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.2, t0 = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + t0;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.01);
  }

  private noise(dur: number, vol = 0.15, t0 = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + t0;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.ceil(sr * dur), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(g); g.connect(this.master);
    src.start(t);
  }

  shoot()       { this.tone(700, 0.06, "square", 0.2); this.tone(400, 0.04, "square", 0.08, 0.05); }
  hitLight()    { this.tone(220, 0.05, "square", 0.12); }
  hitMed()      { this.tone(170, 0.07, "square", 0.16); }
  hitHard()     { this.tone(130, 0.09, "square", 0.2); }
  blastSmall()  { this.noise(0.14, 0.18); this.tone(110, 0.12, "sawtooth", 0.12); }
  blastMed()    { this.noise(0.25, 0.25); this.tone(85, 0.2, "sawtooth", 0.15); this.noise(0.14, 0.14, 0.1); }
  blastHard()   { for (let i = 0; i < 5; i++) { this.noise(0.3, 0.28, i * 0.07); this.tone(55 + Math.random() * 55, 0.22, "sawtooth", 0.18, i * 0.07); } }
  victory()     { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, "square", 0.18, i * 0.22)); }

  startBGM() {
    if (!this.ctx) return;
    const mel = [330, 294, 262, 247, 220, 247, 262, 294];
    const bas = [110, 110,  98,  98,  82,  98,  98, 110];
    let i = 0;
    const step = () => { this.tone(mel[i % mel.length], 0.18, "square", 0.055); this.tone(bas[i % bas.length], 0.22, "square", 0.04); i++; };
    this.bgmId = setInterval(step, 240); step();
  }

  stopBGM() { if (this.bgmId) { clearInterval(this.bgmId); this.bgmId = null; } }
  destroy() { this.stopBGM(); this.ctx?.close().catch(() => {}); this.ctx = null; }
}

// ── Drawing helpers ────────────────────────────────────────────────────────
function drawStars(ctx: CanvasRenderingContext2D, stars: Star[]) {
  for (const s of stars) {
    ctx.globalAlpha = s.bright;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const fl = Math.sin(frame * 0.35);
  // flames
  ctx.fillStyle = `rgba(255,${100 + fl * 80},0,0.9)`;
  ctx.beginPath(); ctx.moveTo(x - 9, y + 13); ctx.lineTo(x - 4, y + 19 + fl * 4); ctx.lineTo(x, y + 13); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 9, y + 13); ctx.lineTo(x + 4, y + 19 + fl * 4); ctx.lineTo(x, y + 13); ctx.closePath(); ctx.fill();
  // wings
  ctx.fillStyle = "#008855";
  ctx.beginPath(); ctx.moveTo(x - 11, y + 8); ctx.lineTo(x - 20, y + 15); ctx.lineTo(x - 8, y + 13); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 11, y + 8); ctx.lineTo(x + 20, y + 15); ctx.lineTo(x + 8, y + 13); ctx.closePath(); ctx.fill();
  // body
  ctx.fillStyle = "#00cc77";
  ctx.beginPath(); ctx.moveTo(x, y - 17); ctx.lineTo(x - 11, y + 13); ctx.lineTo(x + 11, y + 13); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#00ff99"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y - 17); ctx.lineTo(x - 11, y + 13); ctx.lineTo(x + 11, y + 13); ctx.closePath(); ctx.stroke();
  // cockpit
  ctx.fillStyle = "#aaffdd";
  ctx.beginPath(); ctx.ellipse(x, y - 3, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, m: Meteor) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.angle);

  const flash = m.hitFlash > 0;
  const n = m.shape.length;

  if (m.type === "easy") {
    ctx.fillStyle = flash ? "#fff" : "#7a7a68";
    ctx.strokeStyle = "#504e42"; ctx.lineWidth = 1.5;
  } else if (m.type === "medium") {
    ctx.fillStyle = flash ? "#fff" : "#c85400";
    ctx.strokeStyle = "#883200"; ctx.lineWidth = 2;
  } else {
    ctx.fillStyle = flash ? "#ff8899" : "#5c0018";
    ctx.strokeStyle = "#ff2244"; ctx.lineWidth = 2.5;
  }

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = m.r * m.shape[i];
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // HP bar for medium / hard
  if (m.type !== "easy") {
    const bw = m.r * 1.8;
    ctx.fillStyle = "#220000"; ctx.fillRect(-bw / 2, m.r + 4, bw, 4);
    ctx.fillStyle = m.type === "hard" ? "#ff3355" : "#ff8822";
    ctx.fillRect(-bw / 2, m.r + 4, bw * (m.hp / m.maxHp), 4);
  }

  // Keyword on hard meteors – counter-rotate so text is upright
  if (m.type === "hard" && m.keyword) {
    ctx.rotate(-m.angle);
    ctx.fillStyle = flash ? "#fff" : "#ffe533";
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = m.keyword.split("\n");
    lines.forEach((ln, li) => {
      ctx.fillText(ln, 0, (li - (lines.length - 1) / 2) * 9);
    });
  }

  ctx.restore();
}

function drawOrgan(ctx: CanvasRenderingContext2D, x: number, y: number, oi: number) {
  const { g, c, ps } = ORGANS[oi % ORGANS.length];
  const cols = g[0].length;
  const rows = g.length;
  ctx.fillStyle = c;
  g.forEach((row, ry) => {
    row.forEach((cell, rx) => {
      if (cell) ctx.fillRect(x - (cols * ps) / 2 + rx * ps, y - (rows * ps) / 2 + ry * ps, ps - 1, ps - 1);
    });
  });
}

// ── Component ──────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState<Phase>("title");
  const [msgData, setMsgData] = useState<{ label: string; text: string } | null>(null);

  const phaseRef = useRef<Phase>("title");
  const gsRef    = useRef<GS>(makeGS());
  const keysRef  = useRef({ left: false, right: false, shoot: false });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sfxRef    = useRef(new SFX());
  const sfxReady  = useRef(false);
  const rafRef    = useRef(0);

  const syncPhase = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const initAudio = () => {
    if (!sfxReady.current) { sfxRef.current.init(); sfxReady.current = true; }
  };

  // ── Initialize stars on mount ──
  useEffect(() => {
    gsRef.current.stars = makeStars();
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function spawnMeteor(type: "easy" | "medium" | "hard", hi?: number) {
      const gs = gsRef.current;
      const id = gs.idCtr++;
      if (type === "easy") {
        const r = 9 + Math.random() * 5;
        gs.meteors.push({ id, type, x: r + Math.random() * (CW - r * 2), y: -r - 8, vx: (Math.random() - 0.5) * 1.4, vy: 0.85 + Math.random() * 0.65, r, hp: 1, maxHp: 1, hitFlash: 0, angle: Math.random() * Math.PI * 2, angleSpeed: (Math.random() - 0.5) * 0.045, shape: makeShape(7) });
      } else if (type === "medium") {
        const r = 17 + Math.random() * 7;
        gs.meteors.push({ id, type, x: r + Math.random() * (CW - r * 2), y: -r - 8, vx: (Math.random() - 0.5) * 1.1, vy: 0.6 + Math.random() * 0.4, r, hp: 3, maxHp: 3, hitFlash: 0, angle: Math.random() * Math.PI * 2, angleSpeed: (Math.random() - 0.5) * 0.025, shape: makeShape(8) });
      } else if (hi !== undefined) {
        const d = HARD_DATA[hi];
        const r = 30;
        gs.meteors.push({ id, type: "hard", x: r + Math.random() * (CW - r * 2), y: -r - 15, vx: (Math.random() > 0.5 ? 0.75 : -0.75) + (Math.random() - 0.5) * 0.3, vy: 0.38 + Math.random() * 0.18, r, hp: 6, maxHp: 6, hitFlash: 0, angle: 0, angleSpeed: 0.008, shape: makeShape(10), keyword: d.keyword, label: d.label, message: d.message });
      }
    }

    const loop = () => {
      const gs = gsRef.current;
      const p  = phaseRef.current;
      gs.frame++;

      // stars always scroll
      for (const s of gs.stars) { s.y += s.speed; if (s.y > CH + 2) s.y = -2; }

      if (p === "playing" && !gs.paused) {
        // ship movement
        if (keysRef.current.left)  gs.ship.x = Math.max(18, gs.ship.x - SHIP_SPEED);
        if (keysRef.current.right) gs.ship.x = Math.min(CW - 18, gs.ship.x + SHIP_SPEED);

        // shooting
        gs.shootCd = Math.max(0, gs.shootCd - 1);
        if (keysRef.current.shoot && gs.shootCd === 0) {
          gs.shootCd = SHOOT_CD;
          gs.bullets.push({ id: gs.idCtr++, x: gs.ship.x, y: gs.ship.y - 20 });
          sfxRef.current.shoot();
        }

        // move bullets
        gs.bullets = gs.bullets.filter(b => b.y > -5);
        for (const b of gs.bullets) b.y -= BULLET_SPEED;

        // timers
        gs.easyTimer--; gs.mediumTimer--; gs.hardTimer--;
        if (gs.easyTimer <= 0)   { gs.easyTimer   = 80 + Math.floor(Math.random() * 60);  spawnMeteor("easy"); }
        if (gs.mediumTimer <= 0) { gs.mediumTimer  = 440 + Math.floor(Math.random() * 280); spawnMeteor("medium"); }
        if (!gs.hardActive && gs.hardQueue < HARD_DATA.length && gs.hardTimer <= 0) {
          spawnMeteor("hard", gs.hardQueue);
          gs.hardActive = true; gs.hardTimer = 9999;
        }

        // move meteors; hard ones loop back to top
        for (const m of gs.meteors) {
          m.y += m.vy; m.x += m.vx; m.angle += m.angleSpeed;
          if (m.hitFlash > 0) m.hitFlash--;
          if (m.type === "hard") {
            if (m.x - m.r < 4)      { m.x = m.r + 4;      m.vx =  Math.abs(m.vx); }
            if (m.x + m.r > CW - 4) { m.x = CW - m.r - 4; m.vx = -Math.abs(m.vx); }
            if (m.y > CH + m.r)     m.y = -m.r - 10; // loop hard meteors
          }
        }
        gs.meteors = gs.meteors.filter(m => m.type === "hard" || m.y < CH + m.r * 2);

        // collision
        const hitBullets = new Set<number>();
        const toRemove: Meteor[] = [];
        for (const m of gs.meteors) {
          for (const b of gs.bullets) {
            if (hitBullets.has(b.id)) continue;
            const dx = b.x - m.x, dy = b.y - m.y;
            if (Math.sqrt(dx * dx + dy * dy) < m.r + 3) {
              hitBullets.add(b.id); m.hp--; m.hitFlash = 6;
              if (m.type === "easy")   sfxRef.current.hitLight();
              else if (m.type === "medium") sfxRef.current.hitMed();
              else sfxRef.current.hitHard();
              if (m.hp <= 0 && !toRemove.includes(m)) toRemove.push(m);
            }
          }
        }
        gs.bullets = gs.bullets.filter(b => !hitBullets.has(b.id));

        for (const m of toRemove) {
          gs.meteors = gs.meteors.filter(x => x.id !== m.id);
          // particles
          const cnt = m.type === "hard" ? 28 : m.type === "medium" ? 14 : 7;
          const col = m.type === "hard" ? "#ff4466" : m.type === "medium" ? "#ff8822" : "#aaaaaa";
          for (let i = 0; i < cnt; i++) {
            const a = Math.random() * Math.PI * 2, spd = 1.5 + Math.random() * 4;
            gs.particles.push({ id: gs.idCtr++, x: m.x, y: m.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 1, life: 25 + Math.random() * 35, maxLife: 60, color: col, size: 1.5 + Math.random() * (m.type === "hard" ? 3.5 : 2.5) });
          }
          if (m.type === "easy")   sfxRef.current.blastSmall();
          else if (m.type === "medium") sfxRef.current.blastMed();
          else sfxRef.current.blastHard();

          if (m.type === "hard") {
            gs.hardActive = false; gs.hardQueue++; gs.hardDestroyed++;
            gs.paused = true;
            phaseRef.current = "message";
            setPhase("message");
            setMsgData({ label: m.label!, text: m.message! });
          }
        }

        // update particles
        gs.particles = gs.particles.filter(p => p.life > 0);
        for (const p of gs.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.life--; }
      }

      // victory organs
      if (p === "victory") {
        gs.victoryOrganTimer--;
        if (gs.victoryOrganTimer <= 0 && gs.organs.length < 35) {
          gs.victoryOrganTimer = 22;
          gs.organs.push({ id: gs.idCtr++, x: 14 + Math.random() * (CW - 28), y: -20, vy: 1.1 + Math.random() * 1.4, oi: Math.floor(Math.random() * ORGANS.length) });
        }
        for (const o of gs.organs) o.y += o.vy;
        gs.organs = gs.organs.filter(o => o.y < CH + 20);
      }

      // ── DRAW ──
      ctx.fillStyle = "#060612";
      ctx.fillRect(0, 0, CW, CH);

      drawStars(ctx, gs.stars);

      // subtle scanlines
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      for (let y = 0; y < CH; y += 4) ctx.fillRect(0, y, CW, 1);

      if (p === "playing" || p === "message") {
        // bullets
        ctx.fillStyle = "#ffe533";
        for (const b of gs.bullets) ctx.fillRect(b.x - 1.5, b.y, 3, 10);

        // meteors
        for (const m of gs.meteors) drawRock(ctx, m);

        // particles
        for (const pt of gs.particles) {
          ctx.globalAlpha = (pt.life / pt.maxLife) * 0.9;
          ctx.fillStyle = pt.color;
          ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        }
        ctx.globalAlpha = 1;

        drawShip(ctx, gs.ship.x, gs.ship.y, gs.frame);
      }

      if (p === "victory") {
        // also draw remaining meteors fading
        for (const pt of gs.particles) {
          ctx.globalAlpha = (pt.life / pt.maxLife) * 0.7;
          ctx.fillStyle = pt.color;
          ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        }
        ctx.globalAlpha = 1;
        for (const o of gs.organs) drawOrgan(ctx, o.x, o.y, o.oi);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Keyboard controls ──────────────────────────────────────────────────
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")               { e.preventDefault(); keysRef.current.left  = true; }
      if (e.key === "ArrowRight")              { e.preventDefault(); keysRef.current.right = true; }
      if (e.key === " " || e.key.toLowerCase() === "z") { e.preventDefault(); keysRef.current.shoot = true; }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")               keysRef.current.left  = false;
      if (e.key === "ArrowRight")              keysRef.current.right = false;
      if (e.key === " " || e.key.toLowerCase() === "z") keysRef.current.shoot = false;
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => () => sfxRef.current.destroy(), []);

  // ── Game actions ───────────────────────────────────────────────────────
  function startGame() {
    const stars = makeStars();
    const fresh  = makeGS();
    fresh.stars  = stars;
    Object.assign(gsRef.current, fresh);
    initAudio();
    sfxRef.current.startBGM();
    syncPhase("playing");
  }

  function onMessageContinue() {
    const gs = gsRef.current;
    if (gs.hardDestroyed >= HARD_DATA.length) {
      sfxRef.current.stopBGM();
      sfxRef.current.victory();
      gs.organs = []; gs.victoryOrganTimer = 20;
      syncPhase("victory");
    } else {
      gs.paused = false;
      gs.hardTimer = 360;
      syncPhase("playing");
    }
  }

  function restart() {
    sfxRef.current.stopBGM();
    syncPhase("title");
  }

  // ── Button helpers ─────────────────────────────────────────────────────
  const press   = (k: "left" | "right" | "shoot") => () => { initAudio(); keysRef.current[k] = true;  };
  const release = (k: "left" | "right" | "shoot") => () => { keysRef.current[k] = false; };

  // ── JSX ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center py-6 select-none overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #0c0c28 0%, #050510 70%)" }}
    >
      {/* GameBoy device */}
      <div
        className="relative flex flex-col"
        style={{
          width: 308,
          background: "linear-gradient(160deg, #1c1c38 0%, #121228 55%, #0d0d1e 100%)",
          borderRadius: "2rem 2rem 1.5rem 1.5rem",
          border: "1.5px solid rgba(90,90,160,0.22)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 0 55px rgba(0,200,140,0.07), 0 24px 64px rgba(0,0,0,0.85)",
        }}
      >
        {/* Top label */}
        <div className="flex items-center justify-center pt-4 pb-1 gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400/50" style={{ boxShadow: "0 0 6px #00ff88" }} />
          <span className="font-['Press_Start_2P'] text-[6px] tracking-[0.35em] text-green-400/45 uppercase">Space Donors</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400/50" style={{ boxShadow: "0 0 6px #00ff88" }} />
        </div>

        {/* Screen bezel */}
        <div
          className="mx-4 rounded-2xl"
          style={{
            background: "#080814",
            border: "2px solid rgba(0,255,136,0.07)",
            padding: "6px",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.9)",
          }}
        >
          {/* Screen */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: "0.6rem",
              boxShadow: "inset 0 0 28px rgba(0,0,0,0.85), inset 0 1px 3px rgba(255,255,255,0.025)",
            }}
          >
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              style={{ display: "block", imageRendering: "pixelated" }}
            />

            {/* ── Title overlay ── */}
            {phase === "title" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/72 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-6 px-6">
                  <div
                    className="font-['Press_Start_2P'] text-[11px] leading-loose text-center"
                    style={{ color: "#00ff88", textShadow: "0 0 18px rgba(0,255,136,0.7), 0 0 40px rgba(0,255,136,0.3)" }}
                  >
                    DESAFIO<br />SPACE<br />DONORS
                  </div>
                  <div className="font-['Press_Start_2P'] text-[6.5px] leading-relaxed text-center text-cyan-300/75 max-w-[200px]">
                    Um app desenvolvido para educação em doação e transplantes
                  </div>
                  <button
                    onClick={() => { initAudio(); syncPhase("intro"); }}
                    className="font-['Press_Start_2P'] text-[8px] px-6 py-3 rounded-xl text-black active:scale-95 transition-transform"
                    style={{ background: "#00ff88", boxShadow: "0 0 24px rgba(0,255,136,0.55), 0 3px 0 #006633" }}
                  >
                    INICIAR
                  </button>
                </div>
              </div>
            )}

            {/* ── Intro overlay ── */}
            {phase === "intro" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[2px] px-6">
                <div className="flex flex-col items-center gap-7">
                  <div
                    className="font-['Press_Start_2P'] text-[6.5px] leading-relaxed text-center"
                    style={{ color: "#ffe533", textShadow: "0 0 12px rgba(255,229,51,0.5)" }}
                  >
                    Alcance a doação enfrentando os maiores obstáculos do universo! Atire, destrua e entenda cada um deles!
                  </div>
                  <div className="font-['Press_Start_2P'] text-[5.5px] leading-relaxed text-center text-white/45">
                    ← → mover &nbsp;|&nbsp; botão 🔥 atirar
                  </div>
                  <button
                    onClick={startGame}
                    className="font-['Press_Start_2P'] text-[9px] px-7 py-3 rounded-xl text-black active:scale-95 transition-transform"
                    style={{ background: "#f5c518", boxShadow: "0 0 24px rgba(245,197,24,0.55), 0 3px 0 #a07800" }}
                  >
                    COMEÇAR
                  </button>
                </div>
              </div>
            )}

            {/* ── Message overlay ── */}
            {phase === "message" && msgData && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/86 backdrop-blur-[2px] p-4">
                <div
                  className="w-full rounded-2xl p-4 flex flex-col items-center gap-4"
                  style={{ background: "rgba(40,0,12,0.95)", border: "2px solid rgba(255,50,80,0.45)", boxShadow: "0 0 30px rgba(255,30,60,0.18)" }}
                >
                  <div
                    className="font-['Press_Start_2P'] text-[7px] leading-loose text-center"
                    style={{ color: "#ff5577", textShadow: "0 0 10px rgba(255,50,80,0.6)" }}
                  >
                    {msgData.label}
                  </div>
                  <div className="w-full h-px bg-red-400/20" />
                  <div className="font-['Press_Start_2P'] text-[6px] leading-relaxed text-center text-white/88">
                    {msgData.text}
                  </div>
                  <button
                    onClick={onMessageContinue}
                    className="font-['Press_Start_2P'] text-[7px] px-5 py-2.5 rounded-xl text-black active:scale-95 transition-transform"
                    style={{ background: "#00ff88", boxShadow: "0 0 18px rgba(0,255,136,0.45)", marginTop: 2 }}
                  >
                    ENTENDIDO!
                  </button>
                </div>
              </div>
            )}

            {/* ── Victory overlay ── */}
            {phase === "victory" && (
              <div className="absolute inset-0 flex flex-col items-end justify-end bg-black/55 pb-8 px-4">
                <div className="w-full flex flex-col items-center gap-5">
                  <div
                    className="font-['Press_Start_2P'] text-[8px] leading-loose text-center"
                    style={{ color: "#ffe533", textShadow: "0 0 18px rgba(255,229,51,0.75), 0 0 40px rgba(255,229,51,0.3)" }}
                  >
                    VOCÊ VENCEU<br />TODOS OS<br />DESAFIOS!
                  </div>
                  <div
                    className="font-['Press_Start_2P'] text-[6px] leading-relaxed text-center"
                    style={{ color: "#00ff88", textShadow: "0 0 10px rgba(0,255,136,0.5)" }}
                  >
                    A doação de órgãos salva vidas, avise a sua família!
                  </div>
                  <button
                    onClick={restart}
                    className="font-['Press_Start_2P'] text-[7px] px-5 py-3 rounded-xl text-black active:scale-95 transition-transform"
                    style={{ background: "#00ff88", boxShadow: "0 0 20px rgba(0,255,136,0.5)", marginTop: 4 }}
                  >
                    JOGAR NOVAMENTE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          {/* Left: movement */}
          <div className="flex gap-2.5">
            {(["left", "right"] as const).map((dir) => (
              <button
                key={dir}
                onPointerDown={press(dir)}
                onPointerUp={release(dir)}
                onPointerLeave={release(dir)}
                onPointerCancel={release(dir)}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-black font-bold text-lg active:scale-90 transition-transform"
                style={{ background: "#f5c518", boxShadow: "0 4px 0 #9a7b00, 0 0 14px rgba(245,197,24,0.3)", fontSize: 18 }}
              >
                {dir === "left" ? "◄" : "►"}
              </button>
            ))}
          </div>

          <div className="font-['Press_Start_2P'] text-[5px] text-white/15 text-center leading-snug">
            SPACE<br />DONORS
          </div>

          {/* Right: shoot */}
          <button
            onPointerDown={press("shoot")}
            onPointerUp={release("shoot")}
            onPointerLeave={release("shoot")}
            onPointerCancel={release("shoot")}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl active:scale-90 transition-transform"
            style={{ background: "#f5c518", boxShadow: "0 4px 0 #9a7b00, 0 0 18px rgba(245,197,24,0.38)" }}
          >
            🔥
          </button>
        </div>

        {/* keyboard hint */}
        <div className="text-center pb-2">
          <span className="font-['Press_Start_2P'] text-[5px] text-white/12 tracking-widest">
            ← → MOVER &nbsp;|&nbsp; ESPAÇO ATIRAR
          </span>
        </div>

        {/* footer / watermark */}
        <div
          className="text-center py-3 rounded-b-[2rem]"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <span className="font-['Press_Start_2P'] text-[5.5px] text-green-400/28 tracking-widest">
            by Lucas Stterphann
          </span>
        </div>
      </div>

      {/* page-level watermark */}
      <div className="mt-5 font-['Press_Start_2P'] text-[6px] text-white/10 tracking-widest">
        by Lucas Stterphann
      </div>
    </div>
  );
}
