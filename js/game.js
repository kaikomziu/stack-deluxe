// ==========================================================================
// game.js - Stack本体(Three.js製、積み上げ物理・カメラ・見た目)
// ==========================================================================

const Game = (() => {
  const BOX_HEIGHT = 2;
  const BASE_SIZE = 10;
  const RANGE = 7.5; // ブロックが往復する範囲(ワールド座標)
  const PERFECT_THRESHOLD = 0.15;
  const BASE_SPEED = 9; // 単位/秒
  const MAX_SPEED = 20;
  const GRAVITY = 40;
  const CAMERA_LERP = 0.12;

  let renderer, scene, camera, clock;
  let stackMeshes = []; // {mesh, x, z, sizeX, sizeZ, axis}
  let debris = []; // {mesh, vy, vx, vz, rotVel}
  let movingBox = null; // {mesh, axis, dir, speed, sizeX, sizeZ}
  let currentHue = 200;
  let score = 0;
  let perfectStreak = 0;
  let maxStreakThisGame = 0;
  let perfectsThisGame = 0;
  let isRunning = false;
  let isGameOver = true;
  let cameraCurrentY = 0;
  let cameraTargetY = 0;

  const callbacks = {
    onScore: null,
    onPerfect: null,
    onGameOver: null,
  };

  function colorForIndex(i) {
    const h = (currentHue + i * 7) % 360;
    const c = new THREE.Color();
    c.setHSL(h / 360, 0.55, 0.58);
    return c;
  }

  function makeBoxMesh(sizeX, sizeZ, colorIndex) {
    const geo = new THREE.BoxGeometry(sizeX, BOX_HEIGHT, sizeZ);
    const mat = new THREE.MeshLambertMaterial({ color: colorForIndex(colorIndex) });
    return new THREE.Mesh(geo, mat);
  }

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new THREE.Scene();

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(30, 60, 20);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0x8899ff, 0.25);
    dirLight2.position.set(-30, 20, -20);
    scene.add(dirLight2);

    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    resize();

    clock = new THREE.Clock();
    window.addEventListener("resize", resize);

    requestAnimationFrame(loop);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const viewSize = 16; // 縦方向に見える範囲(ワールド単位)
    camera.left = -viewSize * aspect;
    camera.right = viewSize * aspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();
  }

  const CAM_OFFSET = { x: 24, y: 24, z: 24 };

  function updateCamera(dt) {
    cameraCurrentY += (cameraTargetY - cameraCurrentY) * Math.min(1, CAMERA_LERP * (dt * 60));
    camera.position.set(CAM_OFFSET.x, cameraCurrentY + CAM_OFFSET.y, CAM_OFFSET.z);
    camera.lookAt(0, cameraCurrentY, 0);
  }

  function clearScene() {
    for (const b of stackMeshes) scene.remove(b.mesh);
    for (const d of debris) scene.remove(d.mesh);
    stackMeshes = [];
    debris = [];
    if (movingBox) { scene.remove(movingBox.mesh); movingBox = null; }
  }

  function reset() {
    clearScene();
    score = 0;
    perfectStreak = 0;
    maxStreakThisGame = 0;
    perfectsThisGame = 0;
    currentHue = Math.random() * 360;
    cameraCurrentY = 0;
    cameraTargetY = 0;
    isGameOver = false;

    const base = makeBoxMesh(BASE_SIZE, BASE_SIZE, 0);
    base.position.set(0, 0, 0);
    scene.add(base);
    stackMeshes.push({ mesh: base, x: 0, z: 0, sizeX: BASE_SIZE, sizeZ: BASE_SIZE });

    spawnNextBox();
    isRunning = true;
  }

  function spawnNextBox() {
    const top = stackMeshes[stackMeshes.length - 1];
    const axis = stackMeshes.length % 2 === 0 ? "x" : "z";
    const sizeX = top.sizeX;
    const sizeZ = top.sizeZ;
    const mesh = makeBoxMesh(sizeX, sizeZ, stackMeshes.length);
    const y = stackMeshes.length * BOX_HEIGHT;

    const side = Math.random() < 0.5 ? -1 : 1;
    const startPos = side * RANGE;
    const dir = -side;

    mesh.position.set(
      axis === "x" ? startPos : top.x,
      y,
      axis === "z" ? startPos : top.z
    );
    scene.add(mesh);

    const speed = Math.min(MAX_SPEED, BASE_SPEED + score * 0.15);

    movingBox = { mesh, axis, dir, speed, sizeX, sizeZ, x: mesh.position.x, z: mesh.position.z, y };
    cameraTargetY = y;
  }

  function computeCut(topPos, movingPos, size) {
    const topMin = topPos - size / 2, topMax = topPos + size / 2;
    const movMin = movingPos - size / 2, movMax = movingPos + size / 2;
    const overlapMin = Math.max(topMin, movMin);
    const overlapMax = Math.min(topMax, movMax);
    const overlap = overlapMax - overlapMin;
    if (overlap <= 0.001) return null;
    const newCenter = (overlapMin + overlapMax) / 2;
    let leftover = null;
    if (overlap < size - 0.001) {
      leftover = movMin < overlapMin
        ? { min: movMin, max: overlapMin }
        : { min: overlapMax, max: movMax };
    }
    return { newCenter, newSize: overlap, leftover };
  }

  function spawnDebris(axis, leftoverRange, otherAxisPos, otherAxisSize, y) {
    const size = leftoverRange.max - leftoverRange.min;
    if (size <= 0.02) return;
    const center = (leftoverRange.min + leftoverRange.max) / 2;
    const sizeX = axis === "x" ? size : otherAxisSize;
    const sizeZ = axis === "z" ? size : otherAxisSize;
    const mesh = makeBoxMesh(sizeX, sizeZ, stackMeshes.length);
    mesh.position.set(
      axis === "x" ? center : otherAxisPos,
      y,
      axis === "z" ? center : otherAxisPos
    );
    scene.add(mesh);
    const dir = center - otherAxisPos; // 落ちる方向のヒント(未使用時は0)
    debris.push({
      mesh,
      vy: 0,
      vx: axis === "x" ? Math.sign(center) * 2 : 0,
      vz: axis === "z" ? Math.sign(center) * 2 : 0,
      rotAxis: axis === "x" ? "z" : "x",
      rotVel: (Math.random() * 2 + 2) * (Math.random() < 0.5 ? -1 : 1),
      life: 0,
    });
  }

  function placeBlock() {
    if (!isRunning || isGameOver || !movingBox) return;

    const top = stackMeshes[stackMeshes.length - 1];
    const axis = movingBox.axis;
    const topPos = axis === "x" ? top.x : top.z;
    const movingPos = movingBox.mesh.position[axis];
    const size = axis === "x" ? movingBox.sizeX : movingBox.sizeZ;

    const cut = computeCut(topPos, movingPos, size);

    if (!cut) {
      // 完全に外れた -> ゲームオーバー、ブロックは落下
      debris.push({
        mesh: movingBox.mesh,
        vy: 0,
        vx: axis === "x" ? Math.sign(movingBox.dir) * 4 : (Math.random() - 0.5) * 2,
        vz: axis === "z" ? Math.sign(movingBox.dir) * 4 : (Math.random() - 0.5) * 2,
        rotAxis: axis === "x" ? "z" : "x",
        rotVel: (Math.random() * 3 + 2) * (movingBox.dir < 0 ? -1 : 1),
        life: 0,
      });
      movingBox = null;
      triggerGameOver();
      return;
    }

    let { newCenter, newSize, leftover } = cut;
    const isPerfect = Math.abs(movingPos - topPos) < PERFECT_THRESHOLD;
    if (isPerfect) {
      newCenter = topPos;
      newSize = size;
      leftover = null;
    }

    const otherAxis = axis === "x" ? "z" : "x";
    const otherPos = axis === "x" ? top.z : top.x;
    const otherSize = axis === "x" ? top.sizeZ : top.sizeX;

    // 新しいブロックを確定
    const mesh = movingBox.mesh;
    mesh.position[axis] = newCenter;
    if (axis === "x") {
      mesh.scale.x = newSize / movingBox.sizeX;
    } else {
      mesh.scale.z = newSize / movingBox.sizeZ;
    }

    const entry = {
      mesh,
      x: axis === "x" ? newCenter : otherPos,
      z: axis === "z" ? newCenter : otherPos,
      sizeX: axis === "x" ? newSize : otherSize,
      sizeZ: axis === "z" ? newSize : otherSize,
    };
    stackMeshes.push(entry);

    if (leftover) {
      spawnDebris(axis, leftover, otherPos, otherSize, movingBox.y);
    }

    score++;
    if (isPerfect) {
      perfectsThisGame++;
      perfectStreak++;
      maxStreakThisGame = Math.max(maxStreakThisGame, perfectStreak);
      if (callbacks.onPerfect) callbacks.onPerfect();
    } else {
      perfectStreak = 0;
    }
    if (callbacks.onScore) callbacks.onScore(score);

    if (newSize < 0.35) {
      // 積めないほど小さくなったらゲームオーバー扱い
      triggerGameOver();
      return;
    }

    spawnNextBox();
  }

  function triggerGameOver() {
    isGameOver = true;
    isRunning = false;
    if (callbacks.onGameOver) {
      callbacks.onGameOver({
        score,
        perfects: perfectsThisGame,
        maxStreak: maxStreakThisGame,
      });
    }
  }

  function updateMovingBox(dt) {
    if (!movingBox) return;
    const axis = movingBox.axis;
    let pos = movingBox.mesh.position[axis];
    pos += movingBox.dir * movingBox.speed * dt;
    if (pos > RANGE) { pos = RANGE; movingBox.dir = -1; }
    if (pos < -RANGE) { pos = -RANGE; movingBox.dir = 1; }
    movingBox.mesh.position[axis] = pos;
  }

  function updateDebris(dt) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.vy -= GRAVITY * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.x += (d.vx || 0) * dt;
      d.mesh.position.z += (d.vz || 0) * dt;
      d.mesh.rotation[d.rotAxis] += d.rotVel * dt;
      d.life += dt;
      if (d.life > 2.5 || d.mesh.position.y < cameraCurrentY - 40) {
        scene.remove(d.mesh);
        debris.splice(i, 1);
      }
    }
  }

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (isRunning) updateMovingBox(dt);
    updateDebris(dt);
    updateCamera(dt);
    renderer.render(scene, camera);
  }

  return {
    init,
    reset,
    placeBlock,
    callbacks,
    get score() { return score; },
  };
})();
