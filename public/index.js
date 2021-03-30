import * as THREE from './build/three.module.js';

import Stats from './build/jsm/libs/stats.module.js';

import { ColladaLoader } from './build/jsm/loaders/ColladaLoader.js';
import { OrbitControls } from './build/jsm/controls/OrbitControls.js';

let container, stats, clock, controls;
let camera, scene, renderer;
let fishArray = [];

window.onload = () => {
  init();
  animate();
};

function init() {
  container = document.getElementById('container');

  camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(15, 10, -15);

  scene = new THREE.Scene();

  clock = new THREE.Clock();

  // collada

  const loader = new ColladaLoader();
  for (let i = 0; i < 5; i++) {
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

      avatar.position.set(i, 0, i * Math.random() * 10);

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
  avatar;
  mixer;
  velocity;
  constructor(avatar, mixer) {
    this.avatar = avatar;
    this.mixer = mixer;
    this.velocity = new THREE.Vector3(Math.random() / 50, Math.random() / 50, Math.random() / 50);
  }

  update = (delta) => {
    this.mixer.update(delta);

    this.avatar.position.add(this.velocity);
    // Face to the direction it goes
    const angleX = Math.atan2(-this.velocity.z, -this.velocity.y);
    const angleZ = Math.atan2(this.velocity.x, this.velocity.y);
    this.avatar.rotation.x = angleX;
    this.avatar.rotation.z = angleZ;
  };
}
