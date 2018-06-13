
import throttle from 'lodash/throttle';

import {
  Color, TextureLoader, WebGLRenderer, Scene, Fog, AmbientLight, PointLight, Vector2,
  Raycaster, PerspectiveCamera, BufferAttribute, BufferGeometry,
  PointsMaterial, VertexColors, Geometry, Points, Vector3,
} from 'three';

// TODO: consider to use trackball ctrl instead
import OrbitControls from 'orbit-controls-es6';

// TODO: refactor to remove store operations
// and move them to vue viewport component
import store from '@/store';

const FOG_COLOR = 0xffffff;
const NEAR = 1;
const FAR = 50000;
const AMBIENT_LIGHT_COLOR = 0x555555;
const CAMERA_LIGHT_COLOR = 0xcacaca;
const BACKGROUND_COLOR = 0xf8f8f9;

const HOVERED_NEURON_GL_COLOR = new Color(0xf26d21).toArray();

const neuronTexture = new TextureLoader().load('/neuron-texture.png');


class NeuronRenderer {
  constructor(canvas, config) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    const { clientWidth, clientHeight } = canvas.parentElement;

    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);

    this.scene = new Scene();
    this.scene.background = new Color(BACKGROUND_COLOR);
    this.scene.fog = new Fog(FOG_COLOR, NEAR, FAR);
    this.scene.add(new AmbientLight(AMBIENT_LIGHT_COLOR));

    this.mouseGl = new Vector2();
    this.mouseNative = new Vector2();

    this.raycaster = new Raycaster();

    this.camera = new PerspectiveCamera(45, clientWidth / clientHeight, 1, 100000);
    this.scene.add(this.camera);
    this.camera.add(new PointLight(CAMERA_LIGHT_COLOR, 0.9));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.hoveredMesh = null;
    this.hoveredNeuron = null;
    this.highlightedNeuron = null;
    this.mousePressed = false;

    this.onHoverExternalHandler = config.onHover;
    this.onHoverEndExternalHandler = config.onHoverEnd;
    this.onClickExternalHandler = config.onClick;

    this.initEventHandlers();
    this.animate();
  }

  initNeuronCloud(cloudSize) {
    const positionBuffer = new Float32Array(cloudSize * 3);
    const colorBuffer = new Float32Array(cloudSize * 3);
    const alphaBuffer = new Float32Array(cloudSize).fill(0.8);

    this.neuronCloud = {
      positionBufferAttr: new BufferAttribute(positionBuffer, 3),
      colorBufferAttr: new BufferAttribute(colorBuffer, 3),
      alphaBufferAttr: new BufferAttribute(alphaBuffer, 1),
    };

    const geometry = new BufferGeometry();
    geometry.addAttribute('position', this.neuronCloud.positionBufferAttr);
    geometry.addAttribute('color', this.neuronCloud.colorBufferAttr);
    geometry.addAttribute('alpha', this.neuronCloud.alphaBufferAttr);

    const material = new PointsMaterial({
      vertexColors: VertexColors,
      size: store.state.circuit.somaSize,
      opacity: 0.85,
      transparent: true,
      alphaTest: 0.2,
      sizeAttenuation: true,
      map: neuronTexture,
    });

    this.neuronCloud.points = new Points(geometry, material);

    this.neuronCloud.points.matrixAutoUpdate = false;
    this.neuronCloud.points.updateMatrix();

    this.neuronCloud.points.name = 'neuronCloud';
    this.neuronCloud.points.frustumCulled = false;
    this.scene.add(this.neuronCloud.points);

    const highlightedNeuronGeometry = new Geometry();
    const highlightedNeuronMaterial = new PointsMaterial({
      size: 0,
      transparent: true,
      opacity: 0,
      map: neuronTexture,
    });
    highlightedNeuronGeometry.vertices.push(new Vector3(0, 0, 0));
    this.highlightedNeuron = new Points(
      highlightedNeuronGeometry,
      highlightedNeuronMaterial,
    );
    this.highlightedNeuron.frustumCulled = false;
    this.scene.add(this.highlightedNeuron);
  }

  alignCamera() {
    this.neuronCloud.points.geometry.computeBoundingSphere();
    const { center, radius } = this.neuronCloud.points.geometry.boundingSphere;
    this.camera.position.x = center.x;
    this.camera.position.y = center.y;

    const distance = radius / Math.tan(Math.PI * this.camera.fov / 360) * 1.15;

    this.camera.position.z = distance + center.z;
    this.controls.target = center;
  }

  showNeuronCloud() {
    this.neuronCloud.points.visible = true;
  }

  hideNeuronCloud() {
    this.neuronCloud.points.visible = false;
  }

  updateNeuronCloud() {
    this.neuronCloud.points.geometry.attributes.position.needsUpdate = true;
    this.neuronCloud.points.geometry.attributes.color.needsUpdate = true;
  }

  initEventHandlers() {
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
    this.renderer.domElement.addEventListener('mousemove', throttle(this.onMouseMove.bind(this), 100), false);
    window.addEventListener('resize', this.onResize.bind(this), false);
  }

  onMouseDown(e) {
    this.mousePressed = true;
    this.mouseNative.set(e.clientX, e.clientY);
  }

  onMouseUp(e) {
    this.mousePressed = false;
    if (e.clientX !== this.mouseNative.x || e.clientY !== this.mouseNative.y) return;

    const clickedMesh = this.getMeshByNativeCoordinates(e.clientX, e.clientY);
    if (!clickedMesh) return;

    this.onClickExternalHandler({
      type: clickedMesh.object.name,
      index: clickedMesh.index,
      data: clickedMesh.object.userData,
      clickPosition: {
        x: e.clientX,
        y: e.clientY,
      },
    });
  }

  onMouseMove(e) {
    if (this.mousePressed) return;

    const mesh = this.getMeshByNativeCoordinates(e.clientX, e.clientY);

    if (
      mesh &&
      this.hoveredMesh &&
      mesh.object.uuid === this.hoveredMesh.object.uuid &&
      this.hoveredMesh.index === mesh.index
    ) return;

    if (this.hoveredMesh) {
      this.onHoverEnd(this.hoveredMesh);
      this.hoveredMesh = null;
    }

    if (mesh) {
      this.onHover(mesh);
      this.hoveredMesh = mesh;
    }
  }

  onHover(mesh) {
    switch (mesh.object.name) {
    case 'neuronCloud': {
      this.onNeuronHover(mesh.index);
      break;
    }
    case 'morphSection': {
      this.onMorphSectionHover(mesh);
      break;
    }
    case 'synapseCloud': {
      this.onSynapseHover(mesh.index);
      break;
    }
    default: {
      break;
    }
    }
  }

  onHoverEnd(mesh) {
    switch (mesh.object.name) {
    case 'neuronCloud': {
      this.onNeuronHoverEnd(mesh.index);
      break;
    }
    case 'morphSection': {
      this.onMorphSectionHoverEnd(mesh);
      break;
    }
    case 'synapseCloud': {
      this.onSynapseHoverEnd(mesh.index);
      break;
    }
    default: {
      break;
    }
    }
  }

  onNeuronHover(neuronIndex) {
    this.onHoverExternalHandler({
      type: 'cloudNeuron',
      neuronIndex,
    });

    this.hoveredNeuron = [
      neuronIndex,
      this.neuronCloud.colorBufferAttr.getX(neuronIndex),
      this.neuronCloud.colorBufferAttr.getY(neuronIndex),
      this.neuronCloud.colorBufferAttr.getZ(neuronIndex),
    ];
    this.neuronCloud.colorBufferAttr.setXYZ(neuronIndex, ...HOVERED_NEURON_GL_COLOR);
    this.neuronCloud.points.geometry.attributes.color.needsUpdate = true;
  }

  onNeuronHoverEnd(neuronIndex) {
    this.onHoverEndExternalHandler({
      neuronIndex,
      type: 'cloudNeuron',
    });

    this.neuronCloud.colorBufferAttr.setXYZ(...this.hoveredNeuron);
    this.neuronCloud.points.geometry.attributes.color.needsUpdate = true;
    this.hoveredNeuron = null;
  }

  onResize() {
    const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  getMeshByNativeCoordinates(x, y) {
    this.mouseGl.x = (x / this.renderer.domElement.clientWidth) * 2 - 1;
    // TODO: remove hardcoded const
    this.mouseGl.y = -((y - 28) / this.renderer.domElement.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseGl, this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children, true);
    return intersections.find(mesh => !mesh.object.userData.skipHoverDetection);
  }

  animate() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate.bind(this));
  }
}


export default NeuronRenderer;
