import * as THREE from './build/three.module.js';

import Stats from './build/jsm/libs/stats.module.js';

import { ColladaLoader } from './build/jsm/loaders/ColladaLoader.js';
import { OrbitControls } from './build/jsm/controls/OrbitControls.js';

let container, stats, clock, controls;
let camera, scene, renderer;
const fishArray = [];
const minSpeed = 1;

window.onload = () => {
  init();
  animate();
};

function init() {
  container = document.getElementById('container');

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(15, 10, -15);

  scene = new THREE.Scene();

  clock = new THREE.Clock();

  // collada

  const loader = new ColladaLoader();
  for (let i = 0; i < 200; i++) {
    loader.load('./models/fish_nip.dae', function (collada) {
      const avatar = collada.scene;
      avatar.scale.x = avatar.scale.y = avatar.scale.z = 0.2;
      avatar.updateMatrix();
      const animations = (avatar.animations = collada.scene.animations);

      avatar.traverse(function (node) {
        if (node.isSkinnedMesh) {
          node.frustumCulled = false;
        }
      });

      const mixer = new THREE.AnimationMixer(avatar);
      mixer.timeScale = Math.random(); // add this
      mixer.clipAction(animations[0]).play();

      avatar.position.set(
        Math.random() * 10 - Math.random() * 20,
        Math.random() * 10 - Math.random() * 20,
        Math.random() * 10 - Math.random() * 20
      );

      avatar.children[0].rotation.x = 0;
      avatar.children[0].rotation.y = -Math.PI / 2;
      avatar.children[0].rotation.z = Math.PI / 2;

      fishArray.push(new Fish(avatar, mixer));
      scene.add(avatar);
    });
  }

  //

  const gridHelper = new THREE.GridHelper(10, 20, 0x888888, 0x444444);
  scene.add(gridHelper);

  //

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  scene.add(camera);
  camera.add(pointLight);

  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  //

  controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.target.set(0, 2, 0);
  controls.update();

  //

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  render();
  stats.update();
}

function render() {
  const delta = clock.getDelta();

  for (let f = 0; f < fishArray.length; f++) {
    const fish = fishArray[f];
    fish.update(delta);
  }

  renderer.render(scene, camera);
}

class Fish {
  id;
  avatar;
  mixer;
  velocity;
  constructor(avatar, mixer) {
    this.id = Math.floor(Math.random() * 10000).toString();
    this.avatar = avatar;
    this.mixer = mixer;
    this.velocity = new THREE.Vector3(
      Math.random() / 20 - Math.random() / 10,
      Math.random() / 20 - Math.random() / 10,
      Math.random() / 20 - Math.random() / 10
    );
  }

  update = (delta) => {
    const targetPosition = this.getTargetPosition();
    this.velocity.add(targetPosition.sub(this.avatar.position).divideScalar(1));

    this.mixer.timeScale = this.velocity.length() * 40;
    this.mixer.update(delta);

    this.avatar.position.add(this.velocity);
    // Face to the direction it goes
    const lookPos = this.velocity.clone().add(this.avatar.position);
    this.avatar.lookAt(lookPos);
  };

  getTargetPosition = () => {
    const centerWeight = getCenterWeight(this.avatar.position);
    const peerFishTargetPos = [];
    for (let f = 0; f < fishArray.length; f++) {
      const peerFish = fishArray[f];
      if (peerFish.id === this.id) continue;
      const peerPosition = peerFish.avatar.position.clone().sub(this.avatar.position);
      if (peerPosition.length() > 40) continue;
      const weight = getPeerWeight(this.avatar.position, peerFish.avatar.position, this.velocity, peerFish.velocity);
      peerPosition.multiplyScalar(weight);
      peerFishTargetPos.push(peerPosition);
    }
    peerFishTargetPos.sort((a, b) => a.length() - b.length());
    let targetPosition = this.avatar.position.clone();
    for (let p = 0; p < peerFishTargetPos.slice(1, 30).length; p++) {
      targetPosition.add(peerFishTargetPos[p].divideScalar(peerFishTargetPos.length * 0.4));
    }
    for (let p = 0; p < peerFishTargetPos.slice(170, 199).length; p++) {
      targetPosition.sub(peerFishTargetPos[p].divideScalar(peerFishTargetPos.length * 0.4));
    }
    targetPosition.divideScalar(centerWeight / 100000000 + 1);
    return targetPosition;
  };
}

const center = new THREE.Vector3();
function getCenterWeight(position) {
  return Math.pow(position.distanceTo(center), 2);
}

function getPeerWeight(position1, position2, velocity1, velocity2) {
  return 1 / (Math.sqrt(position1.distanceTo(position2)) * Math.pow(velocity1.distanceTo(velocity2), 2)) / 100000;
}
