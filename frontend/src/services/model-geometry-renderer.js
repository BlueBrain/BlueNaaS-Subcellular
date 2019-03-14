
import range from 'lodash/range';
import {
  WebGLRenderer,
  Scene,
  Color,
  Fog,
  AmbientLight,
  PerspectiveCamera,
  PointLight,
  Object3D,
  Geometry,
  Vector3,
  Face3,
  MeshPhongMaterial,
  Mesh,
  Box3,
  DoubleSide,
  Sphere,
} from 'three';
import * as DistinctColors from 'distinct-colors';

import TrackballControls from './trackball-controls';
import utils from '@/tools/neuron-renderer-utils';
import constants from '@/constants';


const FOG_COLOR = 0xffffff;
const NEAR = 1;
const FAR = 100;
const AMBIENT_LIGHT_COLOR = 0x555555;
const CAMERA_LIGHT_COLOR = 0xcacaca;
const BACKGROUND_COLOR = 0xf8f8f9;


class ModelGeometryRenderer {
  constructor(canvas) {
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

    this.camera = new PerspectiveCamera(45, clientWidth / clientHeight, 1e-8, 1000);
    this.scene.add(this.camera);
    this.camera.add(new PointLight(CAMERA_LIGHT_COLOR, 0.9));

    this.modelMeshObject = new Object3D();
    this.modelMeshCenter = new Vector3(0, 0, 0);
    this.scene.add(this.modelMeshObject);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.zoomSpeed = 0.8;

    this.onResizeBinded = this.onResize.bind(this);
    this.initEventListeners();

    this.animate();
  }

  /**
   * Init and draw model geometry
   * TODO: update docs
   *
   * @param {Array[]} geometry.nodes        Cartesian coordinates of mesh node points
   * @param {Array[]} geometry.faces        Triangular faces, each contains idx of 3 geometry.nodes
   * @param {Array[]} geometry.elements     Tetrahedrons, each contains idxs of 4 geometry nodes
   * @param {Object}  geometry.compartments Mesh compartments, where key is compartment name
   *                                          and value is an array of tetrahedron indexes
   *                                          from geometry.elements
   */
  initGeometry(modelGeometry) {
    if (this.meshes) throw new Error('Model geometry has been already initialized');

    const defaultStructure = {
      name: 'main',
      type: 'compartment',
      tetIdxs: range(modelGeometry.elements.length),
    };

    const structures = modelGeometry.structures || [defaultStructure];
    const compartments = structures.filter(c => c.type === constants.StructureType.COMPARTMENT);

    this.colors = new DistinctColors({
      count: compartments.length,
      hueMin: 0,
      hueMax: 360,
      chromaMin: 60,
      chromaMax: 100,
      lightMin: 20,
      lightMax: 90,
    });

    compartments.forEach((compartment, compartmentIdx) => {
      const elements = compartment.tetIdxs.map(elIdx => modelGeometry.elements[elIdx]);

      const geometry = new Geometry();
      modelGeometry.nodes.forEach(node => geometry.vertices.push(new Vector3(...node)));
      elements.forEach((element) => {
        const [vert1, vert2, vert3, vert4] = element;
        geometry.faces.push(new Face3(vert1, vert2, vert3));
        geometry.faces.push(new Face3(vert2, vert4, vert3));
        geometry.faces.push(new Face3(vert1, vert3, vert4));
        geometry.faces.push(new Face3(vert1, vert2, vert4));
      });

      geometry.computeFaceNormals();

      const color = this.colors[compartmentIdx].num();

      const material = new MeshPhongMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: DoubleSide,
      });

      const mesh = new Mesh(geometry, material);

      this.modelMeshObject.add(mesh);
    });

    this.alignCamera();
  }

  clearGeometry() {
    while (this.modelMeshObject.children.length) {
      const mesh = this.modelMeshObject.children[0];
      this.modelMeshObject.remove(mesh);
      utils.disposeMesh(mesh);
    }
  }

  alignCamera() {
    const boundingSphere = new Sphere();
    const box = new Box3().setFromObject(this.modelMeshObject);
    box.getBoundingSphere(boundingSphere);
    const { center, radius } = boundingSphere;

    this.camera.position.x = center.x;
    this.camera.position.y = center.y;

    this.distance = radius / Math.tan(Math.PI * this.camera.fov / 360) * 1.15;

    this.camera.position.z = this.distance + center.z;
    this.controls.target = center;
    this.modelMeshCenter = center;
  }

  destroy() {
    this.stopAnimation();
    this.controls.dispose();
    this.modelMeshObject.children.forEach(mesh => utils.disposeMesh(mesh));
  }

  stopAnimation() {
    cancelAnimationFrame(this.animationFrameId);
  }

  animate() {
    this.controls.update();
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    this.render();
  }

  render() {
    const timer = Date.now() * 0.001;

    this.camera.position.x = Math.cos(timer) * this.distance;
    this.camera.position.y = Math.sin(timer) * this.distance;
    this.camera.lookAt(this.modelMeshCenter);

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  initEventListeners() {
    window.addEventListener('resize', this.onResizeBinded, false);
  }

  destroyEventListeners() {
    window.removeEventListener('resize', this.onResizeBinded, false);
  }
}

export default ModelGeometryRenderer;
