
(() => {
  const $ = id => document.getElementById(id);
  const warning = $("warning");

  if (!window.THREE) {
    warning.textContent =
      "Three.js load nahi hui. CodePen Settings > JavaScript mein Three.js CDN URL add karo aur Save & Close karo.";
    warning.classList.remove("hidden");
    return;
  }

  const THREE = window.THREE;
  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x8ec9eb);
  scene.fog = new THREE.Fog(0x8ec9eb, 45, 190);

  const camera = new THREE.PerspectiveCamera(
    65, innerWidth / innerHeight, 0.1, 300
  );
  camera.position.set(0, 5.5, 10);
  camera.lookAt(0, 0.8, -8);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  $("game").appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe3f5ff, 0x40523b, 2));

  const sunlight = new THREE.DirectionalLight(0xffffff, 3);
  sunlight.position.set(-8, 15, 10);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  scene.add(sunlight);

  function material(color, roughness = 0.7, metalness = 0) {
    return new THREE.MeshStandardMaterial({
      color, roughness, metalness
    });
  }

  const roadMat = material(0x30343a);
  const grassMat = material(0x4c793c);
  const lineMat = material(0xffffff);
  const treeMat = material(0x28623a);
  const trunkMat = material(0x66442b);
  const tireMat = material(0x15191d);
  const wheelMetal = material(0x9ba8b0, 0.3, 0.8);

  function box(parent, size, mat, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size), mat
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Landscape and highway
  box(scene, [250, 0.2, 320], grassMat, 0, -0.2, -110);
  box(scene, [11.5, 0.12, 320], roadMat, 0, -0.05, -110);

  for (const x of [-5.55, 5.55]) {
    box(scene, [0.15, 0.04, 320], lineMat, x, 0.04, -110);
  }

  // Animated road markings
  const roadLines = [];

  for (let z = -280; z < 20; z += 9) {
    for (const x of [-1.9, 1.9]) {
      roadLines.push(
        box(scene, [0.12, 0.04, 4], lineMat, x, 0.04, z)
      );
    }
  }

  // Roadside trees
  const trees = [];

  for (let z = -280; z < 20; z += 13) {
    for (const side of [-1, 1]) {
      const tree = new THREE.Group();
      tree.position.set(side * 9, 0, z);
      scene.add(tree);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.25, 1.8, 8),
        trunkMat
      );
      trunk.position.y = 0.9;
      tree.add(trunk);

      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 3.5, 8),
        treeMat
      );
      leaves.position.y = 3;
      leaves.castShadow = true;
      tree.add(leaves);

      trees.push(tree);
    }
  }

  // Car builder
  function createCar(color) {
    const car = new THREE.Group();
    const paint = material(color, 0.27, 0.5);
    const glass = material(0x183447, 0.2, 0.25);
    const lamp = material(0xf7ffff, 0.2);
    const tail = material(0xff2018, 0.3);

    box(car, [1.65, 0.48, 3.1], paint, 0, 0.68, 0);
    box(car, [1.3, 0.2, 0.85], paint, 0, 0.95, -1.05);
    box(car, [1.1, 0.58, 1.35], glass, 0, 1.12, 0.05);

    for (const x of [-0.53, 0.53]) {
      box(car, [0.3, 0.12, 0.06], lamp, x, 0.75, -1.56);
      box(car, [0.3, 0.12, 0.06], tail, x, 0.75, 1.56);
    }

    const wheels = [];

    for (const x of [-0.85, 0.85]) {
      for (const z of [-0.98, 0.98]) {
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.22, 16),
          tireMat
        );

        tire.rotation.z = Math.PI / 2;
        tire.position.set(x, 0.38, z);
        car.add(tire);
        wheels.push(tire);

        const rim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.17, 0.235, 12),
          wheelMetal
        );

        rim.rotation.z = Math.PI / 2;
        rim.position.set(x, 0.38, z);
        car.add(rim);
      }
    }

    car.userData.wheels = wheels;
    return car;
  }

  const player = createCar(0x00b9ee);
  player.position.set(0, 0, 3);
  scene.add(player);

  // Traffic
  const traffic = [];
  const trafficColors = [
    0xe83d35, 0xf3bd35, 0xe9edf2, 0x8056d9, 0x23a16b
  ];

  function resetTraffic(car, initial = false) {
    car.position.x = [-3.6, 0, 3.6][
      Math.floor(Math.random() * 3)
    ];

    car.position.z = initial
      ? -25 - Math.random() * 190
      : -180 - Math.random() * 90;
  }

  for (let i = 0; i < 8; i++) {
    const car = createCar(trafficColors[i % trafficColors.length]);
    resetTraffic(car, true);
    scene.add(car);
    traffic.push(car);
  }

  let running = false;
  let speed = 0;
  let distance = 0;
  let score = 0;
  let playerX = 0;
  let lastTime = 0;
  let crashCooldown = 0;

  const keys = Object.create(null);

  function clearKeys() {
    Object.keys(keys).forEach(key => keys[key] = false);
  }

  function startGame() {
    clearKeys();

    running = true;
    speed = 0;
    distance = 0;
    score = 0;
    playerX = 0;
    crashCooldown = 0;

    player.position.set(0, 0, 3);
    player.rotation.set(0, 0, 0);

    traffic.forEach(car => resetTraffic(car, true));

    $("speed").textContent = "0";
    $("distance").textContent = "0";
    $("score").textContent = "0";

    $("startScreen").classList.add("hidden");
    $("endScreen").classList.add("hidden");
    $("tip").classList.remove("hidden");
    warning.classList.add("hidden");
  }

  function endGame() {
    running = false;
    speed = 0;
    clearKeys();

    $("finalScore").textContent = Math.floor(score);
    $("endScreen").classList.remove("hidden");
    $("tip").classList.add("hidden");
  }

  $("startBtn").addEventListener("click", startGame);
  $("restartBtn").addEventListener("click", startGame);

  window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    if (["arrowleft", "arrowright", "arrowup", " "].includes(key)) {
      e.preventDefault();
    }

    keys[key] = true;
  });

  window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener("blur", clearKeys);

  function bindHold(id, key) {
    const button = $(id);

    button.addEventListener("pointerdown", e => {
      e.preventDefault();
      keys[key] = true;
      button.setPointerCapture(e.pointerId);
    });

    const release = () => keys[key] = false;

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }

  bindHold("leftBtn", "arrowleft");
  bindHold("rightBtn", "arrowright");
  bindHold("nitroBtn", "nitro");

  function update(dt) {
    if (!running) {
      return;
    }

    crashCooldown = Math.max(0, crashCooldown - dt);

    const boosting = keys.nitro;
    const targetSpeed = boosting ? 78 : 48;

    speed += (targetSpeed - speed) * Math.min(1, dt * 0.8);

    if (keys.arrowup || keys.w) {
      speed = Math.min(95, speed + 28 * dt);
    }

    if (keys.arrowdown || keys.s) {
      speed = Math.max(0, speed - 65 * dt);
    }

    const steer = (keys.arrowright || keys.d ? 1 : 0)
      - (keys.arrowleft || keys.a ? 1 : 0);

    playerX += steer * dt * 6;
    playerX = THREE.MathUtils.clamp(playerX, -4.2, 4.2);

    player.position.x +=
      (playerX - player.position.x) * Math.min(1, dt * 10);

    player.rotation.z = -steer * 0.07;

    const movement = speed * dt * 0.42;

    roadLines.forEach(line => {
      line.position.z += movement;
      if (line.position.z > 12) line.position.z -= 300;
    });

    trees.forEach(tree => {
      tree.position.z += movement;
      if (tree.position.z > 15) tree.position.z -= 300;
    });

    traffic.forEach(car => {
      car.position.z += movement * 0.78;

      if (car.position.z > 13) {
        resetTraffic(car);
        score += 100;
      }

      const dx = Math.abs(car.position.x - player.position.x);
      const dz = Math.abs(car.position.z - player.position.z);

      if (dx < 1.35 && dz < 2.2 && crashCooldown <= 0) {
        endGame();
      }
    });

    player.userData.wheels.forEach(wheel => {
      wheel.rotation.x += speed * dt * 0.12;
    });

    camera.position.x +=
      (player.position.x * 0.24 - camera.position.x)
      * Math.min(1, dt * 2);

    camera.lookAt(player.position.x * 0.18, 0.7, -7);

    distance += speed * dt / 3.6;
    score += speed * dt / 2;

    $("speed").textContent = Math.round(speed * 2.2);
    $("distance").textContent = Math.floor(distance);
    $("score").textContent = Math.floor(score);
  }

  function animate(time) {
    requestAnimationFrame(animate);

    const dt = Math.min(
      Math.max((time - (lastTime || time)) / 1000, 0),
      0.04
    );

    lastTime = time;

    update(dt);
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  });

  animate(0);
})();
