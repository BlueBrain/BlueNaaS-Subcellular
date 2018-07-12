
import throttle from 'lodash/throttle';
import get from 'lodash/get';
import difference from 'lodash/difference';

import {
  Color, TextureLoader, WebGLRenderer, Scene, Fog, AmbientLight, PointLight, Vector2,
  Raycaster, PerspectiveCamera, Object3D, BufferAttribute, BufferGeometry,
  PointsMaterial, VertexColors, Geometry, Points, Vector3,
  Mesh, LineSegments, LineBasicMaterial, EdgesGeometry, SphereBufferGeometry,
  MeshPhongMaterial,
} from 'three';

import { TweenLite } from 'gsap';

import TrackballControls from './trackball-controls';

// TODO: refactor to remove store operations
// and move them to vue viewport component
import store from '@/store';
import eachAsync from '@/tools/each-async';
import utils from '@/tools/neuron-renderer-utils';


const FOG_COLOR = 0xffffff;
const NEAR = 1;
const FAR = 50000;
const AMBIENT_LIGHT_COLOR = 0x555555;
const CAMERA_LIGHT_COLOR = 0xcacaca;
const BACKGROUND_COLOR = 0xf8f8f9;
const HOVER_BOX_COLOR = 0xffdf00;

const EXC_SYN_COLOR = 0xfc1501;
const INH_SYN_COLOR = 0x0080ff;

const HOVERED_NEURON_GL_COLOR = new Color(0xf26d21).toArray();

const ALL_SEC_TYPES = [
  'axon',
  'soma',
  'axon',
  'apic',
  'dend',
  'myelin',
];

const neuronTexture = new TextureLoader().load('/neuron-texture.png');

const defaultSecRenderFilter = t => store.state.view.axonsVisible || t !== 'axon';


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
    this.raycaster.params.Points.threshold = 2;

    this.camera = new PerspectiveCamera(45, clientWidth / clientHeight, 1, 100000);
    this.scene.add(this.camera);
    this.camera.add(new PointLight(CAMERA_LIGHT_COLOR, 0.9));

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.zoomSpeed = 0.8;

    this.hoveredMesh = null;
    this.hoveredNeuron = null;
    this.hoveredSynapse = null;
    this.highlightedNeuron = null;
    this.mousePressed = false;

    this.cellMorphologyObj = new Object3D();
    this.scene.add(this.cellMorphologyObj);
    this.synapseObj = new Object3D();
    this.scene.add(this.synapseObj);

    this.onHoverExternalHandler = config.onHover;
    this.onHoverEndExternalHandler = config.onHoverEnd;
    this.onClickExternalHandler = config.onClick;

    this.initEventHandlers();

    this.shoudStopRenderLoop = false;
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

  initSynapseCloud() {
    const { synapses } = store.state;
    const { synapseSize } = store.state.circuit;

    const synapseGeometry = new SphereBufferGeometry(synapseSize, 16, 16);
    const excSynapseMaterial = new MeshPhongMaterial({ color: EXC_SYN_COLOR });
    const inhSynapseMaterial = new MeshPhongMaterial({ color: INH_SYN_COLOR });

    synapses.forEach((synapse, synapseIndex) => {
      const material = synapse.type >= 100 ? excSynapseMaterial : inhSynapseMaterial;
      const synMesh = new Mesh(synapseGeometry, material);
      synMesh.name = 'synapse';
      synMesh.userData.synapseIndex = synapseIndex;
      synMesh.updateMatrix();
      synMesh.matrixAutoUpdate = false;

      const obj = new Object3D();
      obj.position.set(synapse.postXCenter, synapse.postYCenter, synapse.postZCenter);
      obj.add(synMesh);
      obj.updateMatrix();
      obj.matrixAutoUpdate = false;
      obj.visible = false;

      this.synapseObj.add(obj);
    });
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

  updateSynapses() {
    const { synapses } = store.state;

    synapses.forEach((synapse, synapseIndex) => {
      this.synapseObj.children[synapseIndex].visible = synapse.visible;
    });
  }

  showNeuronCloud() {
    this.neuronCloud.points.visible = true;
  }

  hideNeuronCloud() {
    this.neuronCloud.points.visible = false;
  }

  removeCellMorphologies(filterFunction) {
    const cellMorphObjsToRemove = [];
    this.cellMorphologyObj.children.forEach((obj) => {
      if (filterFunction(obj.userData)) cellMorphObjsToRemove.push(obj);
    });

    // TODO: refactor
    cellMorphObjsToRemove.forEach((obj) => {
      this.cellMorphologyObj.remove(obj);
      const toRemove = obj.children.map(child => child);
      toRemove.forEach(o => utils.disposeMesh(o));
    });
  }

  hideCellMorphology() {
    this.cellMorphologyObj.visible = false;
  }

  showMorphology(secTypes = ALL_SEC_TYPES.filter(defaultSecRenderFilter)) {
    const { neuron } = store.state;
    const { gid } = neuron;

    const { morphology } = store.state;

    let cellObj3d = this.cellMorphologyObj.children.find(cell => get(cell, 'userData.gid') === gid);

    if (!cellObj3d) {
      cellObj3d = new Object3D();
      cellObj3d.userData = {
        gid,
        secTypes: [],
      };
      this.cellMorphologyObj.add(cellObj3d);
    }

    const secTypesToAdd = difference(secTypes, cellObj3d.userData.secTypes);
    if (!secTypesToAdd.length) return;

    cellObj3d.userData.secTypes.push(...secTypesToAdd);

    const { sections } = morphology[gid];

    const materialMap = utils.generateSecMaterialMap();

    const addSecOperation = eachAsync(sections, (section) => {
      const pts = section.points;

      const secMesh = section.type === 'soma' ?
        utils.createSomaMeshFromPoints(pts, materialMap[section.type].clone()) :
        utils.createSecMeshFromPoints(pts, materialMap[section.type].clone());

      secMesh.name = 'morphSection';
      secMesh.userData = {
        neuron,
        type: section.type,
        id: section.id,
        name: section.name,
      };

      cellObj3d.add(secMesh);
    }, sec => secTypesToAdd.includes(sec.type));

    addSecOperation.then(() => store.$dispatch('morphRenderFinished'));
    this.cellMorphologyObj.visible = true;
  }

  setNeuronCloudPointSize(size) {
    this.neuronCloud.points.material.size = size;
    this.raycaster.params.Points.threshold = size / 5;
  }

  setSynapseSize(size) {
    this.synapseObj.children.forEach((child) => {
      child.scale.set(size, size, size);
      child.updateMatrix();
    });
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
    case 'synapse': {
      this.onSynapseHover(mesh);
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
    case 'synapse': {
      this.onSynapseHoverEnd(mesh);
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

  onSynapseHover(mesh) {
    const { synapseSize } = store.state.circuit;

    this.onHoverExternalHandler({
      synapseIndex: mesh.object.userData.synapseIndex,
      type: 'synapse',
    });

    const geometry = new EdgesGeometry(mesh.object.geometry);
    geometry.scale(synapseSize, synapseSize, synapseSize);
    const material = new LineBasicMaterial({
      color: HOVER_BOX_COLOR,
      linewidth: 2,
    });
    this.hoverBox = new LineSegments(geometry, material);

    mesh.object.getWorldPosition(this.hoverBox.position);
    mesh.object.getWorldQuaternion(this.hoverBox.rotation);
    this.hoverBox.name = mesh.object.name;
    this.hoverBox.userData = Object.assign({ skipHoverDetection: true }, mesh.object.userData);
    this.scene.add(this.hoverBox);
  }

  onSynapseHoverEnd(mesh) {
    this.scene.remove(this.hoverBox);
    utils.disposeMesh(this.hoverBox);
    this.hoverBox = null;

    this.onHoverEndExternalHandler({
      synapseIndex: mesh.object.userData.synapseIndex,
      type: 'synapse',
    });
  }

  onMorphSectionHover(mesh) {
    const geometry = new EdgesGeometry(mesh.object.geometry);
    const material = new LineBasicMaterial({
      color: HOVER_BOX_COLOR,
      linewidth: 2,
    });
    this.hoverBox = new LineSegments(geometry, material);

    mesh.object.getWorldPosition(this.hoverBox.position);
    mesh.object.getWorldQuaternion(this.hoverBox.rotation);
    this.hoverBox.name = mesh.object.name;
    this.hoverBox.userData = Object.assign({ skipHoverDetection: true }, mesh.object.userData);
    this.scene.add(this.hoverBox);

    this.onHoverExternalHandler({
      type: 'morphSection',
      data: mesh.object.userData,
    });
  }

  onMorphSectionHoverEnd(mesh) {
    this.scene.remove(this.hoverBox);
    utils.disposeMesh(this.hoverBox);
    this.hoverBox = null;

    this.onHoverEndExternalHandler({
      type: 'morphSection',
      data: mesh.object.userData,
    });
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

  stopRenderLoop() {
    this.shoudStopRenderLoop = true;
  }

  animate() {
    if (this.shoudStopRenderLoop) {
      this.shoudStopRenderLoop = false;
      return;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate.bind(this));
  }
}


export default NeuronRenderer;
