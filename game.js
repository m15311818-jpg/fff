// ==========================================
// SAIF RUNNER - لعبة الجري اللانهائي
// تصميم: سيف
// ملف كامل: كل المراحل في كود واحد
// ==========================================

// ==========================================
// 1) الإعدادات العامة
// ==========================================
const CONFIG = {
  laneWidth: 2,
  lanes: [-2, 0, 2],
  startSpeed: 0.35,
  maxSpeed: 1.2,
  speedIncrease: 0.00005,
  jumpForce: 0.35,
  gravity: 0.015,
  slideDuration: 600,
};

// ==========================================
// 2) متغيرات اللعبة
// ==========================================
let scene, camera, renderer;
let player;
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
// 3) إعداد Three.js
// ==========================================
function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f3460);
  scene.fog = new THREE.Fog(0x0f3460, 20, 80);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 4, 8);
  camera.lookAt(0, 1, -5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.getElementById('gameScreen').appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);

  createGround();
  createPlayer();
}

// ==========================================
// 4) الأرضية والسكك
// ==========================================
function createGround() {
  const groundGeo = new THREE.PlaneGeometry(12, 400);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3e });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -180;
  ground.receiveShadow = true;
  scene.add(ground);

  for (let i = 0; i < 3; i++) {
    const laneX = lanes[i];
    for (let j = -1; j <= 1; j += 2) {
      const railGeo = new THREE.BoxGeometry(0.1, 0.05, 400);
      const railMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(laneX + j * 0.6, 0.03, -180);
      scene.add(rail);
    }
  }
}

// ==========================================
// 5) اللاعب
// ==========================================
function createPlayer() {
  const playerGeo = new THREE.BoxGeometry(0.8, 1.6, 0.8);
  const playerMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff });
  player = new THREE.Mesh(playerGeo, playerMat);
  player.position.set(0, 0.8, 0);
  player.castShadow = true;
  scene.add(player);
}

// ==========================================
// 6) توليد العوائق
// ==========================================
function spawnObstacle() {
  const laneIndex = Math.floor(Math.random() * 3);
  const laneX = lanes[laneIndex];
  const type = Math.random();

  let obstacle;

  if (type < 0.5) {
    const geo = new THREE.BoxGeometry(1.6, 2.5, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    obstacle = new THREE.Mesh(geo, mat);
    obstacle.position.set(laneX, 1.25, -60);
    obstacle.userData = { type: 'train' };
  } else if (type < 0.8) {
    const geo = new THREE.BoxGeometry(1.6, 0.8, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    obstacle = new THREE.Mesh(geo, mat);
    obstacle.position.set(laneX, 0.4, -60);
    obstacle.userData = { type: 'low' };
  } else {
    const geo = new THREE.BoxGeometry(1.6, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    obstacle = new THREE.Mesh(geo, mat);
    obstacle.position.set(laneX, 2.2, -60);
    obstacle.userData = { type: 'high' };
  }

  obstacle.castShadow = true;
  scene.add(obstacle);
  obstacles.push(obstacle);
}

// ==========================================
// 7) توليد العملات
// ==========================================
function spawnCoin() {
  const laneIndex = Math.floor(Math.random() * 3);
  const laneX = lanes[laneIndex];
  const height = Math.random() > 0.7 ? 1.8 : 0.8;

  const geo = new THREE.TorusGeometry(0.25, 0.08, 8, 20);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00 });
  const coin = new THREE.Mesh(geo, mat);
  coin.position.set(laneX, height, -60);
  coin.rotation.x = Math.PI / 2;
  scene.add(coin);
  coinObjects.push(coin);
}

// ==========================================
// 8) الحركة والتحكم
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
}

function slide() {
  if (!isGameRunning || isSliding) return;
  isSliding = true;
  player.scale.y = 0.5;
  player.position.y = 0.4;
  setTimeout(() => {
    isSliding = false;
    player.scale.y = 1;
    player.position.y = 0.8;
  }, CONFIG.slideDuration);
}

function updatePlayer() {
  const targetX = lanes[currentLane];
  player.position.x += (targetX - player.position.x) * 0.2;

  if (isJumping) {
    player.position.y += jumpVelocity;
    jumpVelocity -= CONFIG.gravity;
    if (player.position.y <= 0.8) {
      player.position.y = 0.8;
      isJumping = false;
      jumpVelocity = 0;
    }
  }

  player.rotation.z = (targetX - player.position.x) * 0.3;
}

// ==========================================
// 9) كشف التصادم
// ==========================================
function checkCollision(obj1, obj2, threshold = 1) {
  const dx = Math.abs(obj1.position.x - obj2.position.x);
  const dy = Math.abs(obj1.position.y - obj2.position.y);
  const dz = Math.abs(obj1.position.z - obj2.position.z);
  return dx < threshold && dy < threshold && dz < threshold;
}

// ==========================================
// 10) الحلقة الرئيسية
// ==========================================
function animate() {
  requestAnimationFrame(animate);

  if (isGameRunning) {
    if (gameSpeed < CONFIG.maxSpeed) gameSpeed += CONFIG.speedIncrease;

    updatePlayer();

    // العوائق
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.position.z += gameSpeed;

      if (checkCollision(player, obs)) {
        gameOver();
        return;
      }

      if (obs.position.z > 10) {
        scene.remove(obs);
        obstacles.splice(i, 1);
      }
    }

    // العملات
    for (let i = coinObjects.length - 1; i >= 0; i--) {
      const coin = coinObjects[i];
      coin.position.z += gameSpeed;
      coin.rotation.z += 0.1;

      if (checkCollision(player, coin, 0.8)) {
        scene.remove(coin);
        coinObjects.splice(i, 1);
        coins++;
        document.getElementById('coins').textContent = coins;
      }

      if (coin.position.z > 10) {
        scene.remove(coin);
        coinObjects.splice(i, 1);
      }
    }

    // توليد جديد
    const now = Date.now();
    if (now - lastSpawn > 1200 / gameSpeed) {
      spawnObstacle();
      lastSpawn = now;
    }
    if (now - lastCoinSpawn > 800) {
      spawnCoin();
      lastCoinSpawn = now;
    }

    // النقاط
    score += Math.floor(gameSpeed * 10);
    document.getElementById('score').textContent = score;

    // الكاميرا
    camera.position.z = player.position.z + 8;
    camera.lookAt(player.position.x * 0.3, 1, -5);
  }

  renderer.render(scene, camera);
}

// ==========================================
// 11) بدء اللعبة ونهايتها
// ==========================================
function startGame() {
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

  player.position.set(0, 0.8, 0);
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
// 12) التحكم
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

// ==========================================
// 13) التشغيل
// ==========================================
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

initThree();
animate();

// ==========================================
// نهاية الملف
// ==========================================
