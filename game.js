// ==========================================
// ashraf bauome - النسخة المحسّنة
// تصميم: اشرف بيومي
// ==========================================

const CONFIG = {
  lanes: [-2, 0, 2],
  startSpeed: 0.35,
  maxSpeed: 1.2,
  speedIncrease: 0.00005,
  jumpForce: 0.35,
  gravity: 0.015,
  slideDuration: 600,
};

let scene, camera, renderer;
let player, playerParts = [];
let lanes = CONFIG.lanes;
let currentLane = 1;
let isJumping = false;
let isSliding = false;
let jumpVelocity = 0;
let gameSpeed = CONFIG.startSpeed;
let isGameRunning = false;
let score = 0;
let coins = 0;
let obstacles = [];
let coinObjects = [];
let lastSpawn = 0;
let lastCoinSpawn = 0;

// ==========================================
// نظام الأصوات
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
}

function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'jump') {
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'coin') {
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.05);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'hit') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  } else if (type === 'slide') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }
}

// ==========================================
// إعداد المشهد
// ==========================================
function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 30, 100);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 4, 8);
  camera.lookAt(0, 1, -5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('gameScreen').appendChild(renderer.domElement);

  // إضاءة محسّنة
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x88bbff, 0.4);
  fill.position.set(-10, 5, -10);
  scene.add(fill);

  createGround();
  createPlayer();
}

// ==========================================
// الأرضية الواقعية
// ==========================================
function createGround() {
  // الأرضية الرئيسية
  const groundGeo = new THREE.PlaneGeometry(20, 400);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -180;
  ground.receiveShadow = true;
  scene.add(ground);

  // سكك حديدية لكل مسار
  for (let i = 0; i < 3; i++) {
    const laneX = lanes[i];
    for (let j = -1; j <= 1; j += 2) {
      // القضيب
      const railGeo = new THREE.BoxGeometry(0.12, 0.1, 400);
      const railMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.3 });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(laneX + j * 0.65, 0.08, -180);
      rail.castShadow = true;
      scene.add(rail);
    }

    // العوارض الخشبية
    for (let z = 0; z > -400; z -= 3) {
      const tieGeo = new THREE.BoxGeometry(2.2, 0.08, 0.4);
      const tieMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 1 });
      const tie = new THREE.Mesh(tieGeo, tieMat);
      tie.position.set(laneX, 0.04, z);
      tie.receiveShadow = true;
      scene.add(tie);
    }
  }

  // الجدران الجانبية
  for (let side of [-1, 1]) {
    const wallGeo = new THREE.BoxGeometry(0.3, 1.5, 400);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(side * 5.5, 0.75, -180);
    wall.castShadow = true;
    scene.add(wall);
  }
}

// ==========================================
// شخصية اللاعب الواقعية
// ==========================================
function createPlayer() {
  player = new THREE.Group();
  playerParts = [];

  // الجسم
  const bodyGeo = new THREE.BoxGeometry(0.6, 0.9, 0.4);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, roughness: 0.5 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.95;
  body.castShadow = true;
  player.add(body);
  playerParts.push(body);

  // الرأس
  const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.65;
  head.castShadow = true;
  player.add(head);
  playerParts.push(head);

  // الشعر / القبعة
  const capGeo = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xff3333 });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 1.7;
  cap.castShadow = true;
  player.add(cap);
  playerParts.push(cap);

  // الذراعان
  const armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
  const armMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.42, 1.0, 0);
  leftArm.castShadow = true;
  player.add(leftArm);
  playerParts.push(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.42, 1.0, 0);
  rightArm.castShadow = true;
  player.add(rightArm);
  playerParts.push(rightArm);

  // الساقان
  const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x222266 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.15, 0.35, 0);
  leftLeg.castShadow = true;
  player.add(leftLeg);
  playerParts.push(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.15, 0.35, 0);
  rightLeg.castShadow = true;
  player.add(rightLeg);
  playerParts.push(rightLeg);

  player.position.set(0, 0, 0);
  scene.add(player);
}

// ==========================================
// قطار واقعي
// ==========================================
function createTrain(laneX) {
  const train = new THREE.Group();

  const bodyColor = [0xcc2222, 0x2244cc, 0x22aa44, 0xddaa00][Math.floor(Math.random() * 4)];

  // جسم القطار
  const bodyGeo = new THREE.BoxGeometry(1.8, 2.4, 7);
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.6, roughness: 0.4 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.3;
  body.castShadow = true;
  body.receiveShadow = true;
  train.add(body);

  // السقف
  const roofGeo = new THREE.BoxGeometry(1.85, 0.2, 7.05);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 2.6;
  train.add(roof);

  // المقدمة
  const frontGeo = new THREE.BoxGeometry(1.8, 2.4, 0.3);
  const frontMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 });
  const front = new THREE.Mesh(frontGeo, frontMat);
  front.position.set(0, 1.3, -3.65);
  train.add(front);

  // النوافذ
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    emissive: 0x4466aa,
    emissiveIntensity: 0.4,
    metalness: 0.9,
    roughness: 0.1
  });

  for (let z = -2.8; z <= 2.8; z += 1.4) {
    for (let side of [-1, 1]) {
      const winGeo = new THREE.BoxGeometry(0.05, 0.8, 1);
      const win = new THREE.Mesh(winGeo, windowMat);
      win.position.set(side * 0.91, 1.6, z);
      train.add(win);
    }
  }

  // العجلات
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
  for (let z of [-2.5, 0, 2.5]) {
    for (let side of [-1, 1]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.85, 0.35, z);
      train.add(wheel);
    }
  }

  // الأضواء الأمامية
  const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffff00, emissiveIntensity: 1 });
  for (let side of [-1, 1]) {
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(side * 0.6, 0.8, -3.8);
    train.add(light);
  }

  train.position.set(laneX, 0, -60);
  train.userData = { type: 'train' };
  scene.add(train);
  return train;
}

// ==========================================
// حاجز منخفض (قابل للقفز)
// ==========================================
function createLowBarrier(laneX) {
  const group = new THREE.Group();

  const geo = new THREE.BoxGeometry(1.6, 0.8, 0.4);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.6 });
  const barrier = new THREE.Mesh(geo, mat);
  barrier.position.y = 0.4;
  barrier.castShadow = true;
  group.add(barrier);

  // خطوط تحذيرية
  for (let x = -0.6; x <= 0.6; x += 0.3) {
    const stripeGeo = new THREE.BoxGeometry(0.15, 0.85, 0.42);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(x, 0.4, 0);
    group.add(stripe);
  }

  group.position.set(laneX, 0, -60);
  group.userData = { type: 'low' };
  scene.add(group);
  return group;
}

// ==========================================
// حاجز مرتفع (لازم انزلاق)
// ==========================================
function createHighBarrier(laneX) {
  const group = new THREE.Group();

  const geo = new THREE.BoxGeometry(1.6, 0.5, 0.4);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.6 });
  const barrier = new THREE.Mesh(geo, mat);
  barrier.position.y = 2.2;
  barrier.castShadow = true;
  group.add(barrier);

  // أعمدة دعم
  for (let side of [-1, 1]) {
    const poleGeo = new THREE.BoxGeometry(0.1, 2.2, 0.1);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(side * 0.7, 1.1, 0);
    group.add(pole);
  }

  group.position.set(laneX, 0, -60);
  group.userData = { type: 'high' };
  scene.add(group);
  return group;
}

function spawnObstacle() {
  const laneIndex = Math.floor(Math.random() * 3);
  const laneX = lanes[laneIndex];
  const type = Math.random();

  let obstacle;
  if (type < 0.5) {
    obstacle = createTrain(laneX);
  } else if (type < 0.8) {
    obstacle = createLowBarrier(laneX);
  } else {
    obstacle = createHighBarrier(laneX);
  }

  obstacles.push(obstacle);
}

// ==========================================
// عملة معدنية
// ==========================================
function spawnCoin() {
  const laneIndex = Math.floor(Math.random() * 3);
  const laneX = lanes[laneIndex];
  const height = Math.random() > 0.7 ? 1.8 : 0.8;

  const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffaa00,
    emissiveIntensity: 0.5,
    metalness: 1,
    roughness: 0.2
  });
  const coin = new THREE.Mesh(geo, mat);
  coin.position.set(laneX, height, -60);
  coin.rotation.x = Math.PI / 2;
  coin.castShadow = true;
  scene.add(coin);
  coinObjects.push(coin);
}

// ==========================================
// التحكم والحركة
// ==========================================
function movePlayer(direction) {
  if (!isGameRunning) return;
  if (direction === 'left' && currentLane > 0) currentLane--;
  else if (direction === 'right' && currentLane < 2) currentLane++;
}

function jump() {
  if (!isGameRunning || isJumping) return;
  isJumping = true;
  jumpVelocity = CONFIG.jumpForce;
  playSound('jump');
}

function slide() {
  if (!isGameRunning || isSliding) return;
  isSliding = true;
  player.scale.y = 0.5;
  player.position.y = 0;
  playSound('slide');
  setTimeout(() => {
    isSliding = false;
    player.scale.y = 1;
    player.position.y = 0;
  }, CONFIG.slideDuration);
}

function updatePlayer() {
  const targetX = lanes[currentLane];
  player.position.x += (targetX - player.position.x) * 0.2;

  if (isJumping) {
    player.position.y += jumpVelocity;
    jumpVelocity -= CONFIG.gravity;
    if (player.position.y <= 0) {
      player.position.y = 0;
      isJumping = false;
      jumpVelocity = 0;
    }
  }

  player.rotation.z = (targetX - player.position.x) * 0.3;

  // اهتزاز الجري
  if (!isJumping && isGameRunning) {
    const t = Date.now() * 0.01;
    playerParts.forEach((part, i) => {
      if (i === 3 || i === 4) { // الذراعان
        part.rotation.x = Math.sin(t + i) * 0.5;
      }
      if (i === 5 || i === 6) { // الساقان
        part.rotation.x = Math.sin(t + i) * 0.6;
      }
    });
  }
}

function checkCollision(obj1, obj2, threshold = 1) {
  const dx = Math.abs(obj1.position.x - obj2.position.x);
  const dy = Math.abs(obj1.position.y - obj2.position.y);
  const dz = Math.abs(obj1.position.z - obj2.position.z);
  return dx < threshold && dy < threshold && dz < threshold;
}

function animate() {
  requestAnimationFrame(animate);

  if (isGameRunning) {
    if (gameSpeed < CONFIG.maxSpeed) gameSpeed += CONFIG.speedIncrease;

    updatePlayer();

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.position.z += gameSpeed;

      if (checkCollision(player, obs, 1.2)) {
        playSound('hit');
        gameOver();
        return;
      }

      if (obs.position.z > 15) {
        scene.remove(obs);
        obstacles.splice(i, 1);
      }
    }

    for (let i = coinObjects.length - 1; i >= 0; i--) {
      const coin = coinObjects[i];
      coin.position.z += gameSpeed;
      coin.rotation.z += 0.15;

      if (checkCollision(player, coin, 0.9)) {
        scene.remove(coin);
        coinObjects.splice(i, 1);
        coins++;
        document.getElementById('coins').textContent = coins;
        playSound('coin');
      }

      if (coin.position.z > 15) {
        scene.remove(coin);
        coinObjects.splice(i, 1);
      }
    }

    const now = Date.now();
    if (now - lastSpawn > 1200 / gameSpeed) {
      spawnObstacle();
      lastSpawn = now;
    }
    if (now - lastCoinSpawn > 800) {
      spawnCoin();
      lastCoinSpawn = now;
    }

    score += Math.floor(gameSpeed * 10);
    document.getElementById('score').textContent = score;

    camera.position.z = player.position.z + 8;
    camera.lookAt(player.position.x * 0.3, 1.5, -5);
  }

  renderer.render(scene, camera);
}

// ==========================================
// بدء اللعبة ونهايتها
// ==========================================
function startGame() {
  initAudio();
  score = 0;
  coins = 0;
  gameSpeed = CONFIG.startSpeed;
  currentLane = 1;
  isJumping = false;
  isSliding = false;

  obstacles.forEach(o => scene.remove(o));
  coinObjects.forEach(c => scene.remove(c));
  obstacles = [];
  coinObjects = [];

  player.position.set(0, 0, 0);
  player.scale.y = 1;

  document.getElementById('score').textContent = '0';
  document.getElementById('coins').textContent = '0';

  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');

  isGameRunning = true;
}

function gameOver() {
  isGameRunning = false;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalCoins').textContent = coins;
  document.getElementById('gameOverScreen').classList.remove('hidden');
}

// ==========================================
// التحكم
// ==========================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft')  movePlayer('left');
  if (e.key === 'ArrowRight') movePlayer('right');
  if (e.key === 'ArrowUp')    jump();
  if (e.key === 'ArrowDown')  slide();
});

document.querySelectorAll('.ctrl-btn').forEach(btn => {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const action = btn.dataset.action;
    if (action === 'left')  movePlayer('left');
    if (action === 'right') movePlayer('right');
    if (action === 'jump')  jump();
    if (action === 'slide') slide();
  });
});

let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 30)  movePlayer('right');
    if (dx < -30) movePlayer('left');
  } else {
    if (dy < -30) jump();
    if (dy > 30)  slide();
  }
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

initThree();
animate();
