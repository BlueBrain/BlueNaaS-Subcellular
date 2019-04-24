
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
  Sphere,
  DoubleSide,
  WireframeGeometry,
  LineSegments,
  MeshBasicMaterial,
} from 'three';
import * as DistinctColors from 'distinct-colors';

import TrackballControls from './trackball-controls';
import utils from '@/tools/neuron-renderer-utils';
import constants from '@/constants';

const { StructureType, GeometryDisplayMode } = constants;


const FOG_COLOR = 0xffffff;
const NEAR = 1;
const FAR = 100;
const AMBIENT_LIGHT_COLOR = 0x555555;
const CAMERA_LIGHT_COLOR = 0xcacaca;
const BACKGROUND_COLOR = 0xf8f8f9;


function getNormScalar(nodes) {
  const xVec = nodes.map(node => node[0]);
  const yVec = nodes.map(node => node[1]);
  const zVec = nodes.map(node => node[2]);

  const deltaX = Math.max(...xVec) - Math.min(...xVec);
  const deltaY = Math.max(...yVec) - Math.min(...yVec);
  const deltaZ = Math.max(...zVec) - Math.min(...zVec);

  const maxDimensionSize = Math.max(deltaX, deltaY, deltaZ);

  const normScalar = 1 / maxDimensionSize;

  return normScalar;
}


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

    this.camera = new PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 10);
    this.scene.add(this.camera);
    this.camera.add(new PointLight(CAMERA_LIGHT_COLOR, 0.9));

    this.modelMeshObject = new Object3D();
    this.scene.add(this.modelMeshObject);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.zoomSpeed = 0.8;

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
  initGeometry(modelGeometry, displayMode = GeometryDisplayMode.DEFAULT) {
    // TODO: move mesh skinning to TetGen class

    if (this.meshes) throw new Error('Model geometry has been already initialized');

    const defaultStructure = {
      name: 'main',
      type: 'compartment',
      tetIdxs: range(modelGeometry.elements.length),
    };

    const structures = modelGeometry.structures || [defaultStructure];

    this.colors = new DistinctColors({
      count: structures.length,
      hueMin: 0,
      hueMax: 360,
      chromaMin: 60,
      chromaMax: 100,
      lightMin: 20,
      lightMax: 90,
    });

    this.normScalar = getNormScalar(modelGeometry.nodes);

    const createCompartmentGeometry = (compartment) => {
      const vertexMap = {};

      const tets = compartment.tetIdxs
        .map(elIdx => modelGeometry.elements[elIdx]);

      tets.forEach((tet) => {
        const [vert1, vert2, vert3, vert4] = tet;

        [
          [vert1, vert3, vert2],
          [vert2, vert3, vert4],
          [vert1, vert2, vert4],
          [vert1, vert4, vert3],
        ].forEach((tri) => {
          const key = tri.slice().sort().join('_');
          vertexMap[key] = !vertexMap[key] && [...tri];
        });
      });

      const surfTris = Object.values(vertexMap).filter(val => val);

      const allSurfVertices = surfTris.reduce((acc, cur) => acc.concat(cur));
      const surfVertices = Array.from(new Set(allSurfVertices));

      const surfVertexIdxMap = new Map();
      surfVertices.forEach((v, idx) => { surfVertexIdxMap[v] = idx; });

      const compGeometry = new Geometry();
      surfVertices.forEach((nodeIdx) => {
        const coords = modelGeometry
          .nodes[nodeIdx]
          .map(coord => coord * this.normScalar);
        const vec = new Vector3(...coords);
        compGeometry.vertices.push(vec);
      });

      surfTris.forEach((tris) => {
        const face = new Face3(...tris.map(triIdx => surfVertexIdxMap[triIdx]));
        compGeometry.faces.push(face);
      });

      return compGeometry;
    };

    const createMembraneGeometry = (membrane) => {
      const { triIdxs } = membrane;

      const vertexIdxSet = new Set();
      triIdxs.forEach((triIdx) => {
        modelGeometry.faces[triIdx]
          .forEach(vertexIdx => vertexIdxSet.add(vertexIdx));
      });

      const vertexIdxs = Array.from(vertexIdxSet);
      const vertexIdxMap = vertexIdxs
        .reduce((acc, vertexIdx, idx) => Object.assign(acc, { [vertexIdx]: idx }), {});

      const membGeometry = new Geometry();

      vertexIdxs.forEach((vertexIdx) => {
        const coords = modelGeometry
          .nodes[vertexIdx]
          .map(coord => coord * this.normScalar);
        const vec = new Vector3(...coords);
        membGeometry.vertices.push(vec);
      });

      membrane.triIdxs.forEach((triIdx) => {
        const faceReindexedVertexIdxs = modelGeometry.faces[triIdx]
          .map(vertexIdx => vertexIdxMap[vertexIdx]);
        const face = new Face3(...faceReindexedVertexIdxs);
        membGeometry.faces.push(face);
      });

      return membGeometry;
    };

    structures.forEach((structure, idx) => {
      const geometry = structure.type === StructureType.COMPARTMENT
        ? createCompartmentGeometry(structure)
        : createMembraneGeometry(structure);

      geometry.mergeVertices();
      geometry.computeFaceNormals();

      const color = this.colors[idx].num();

      const material = new MeshPhongMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
      });

      const stMesh = new Mesh(geometry, material);
      stMesh.name = structure.name;
      this.modelMeshObject.add(stMesh);

      const wireframeGeometry = new WireframeGeometry(geometry);
      const lineMaterial = new MeshBasicMaterial({
        color,
        opacity: 0,
        transparent: true,
        depthTest: false,
      });
      const wireframe = new LineSegments(wireframeGeometry, lineMaterial);
      wireframe.name = structure.name;
      this.modelMeshObject.add(wireframe);
    });

    this.setDisplayMode(displayMode);
    this.alignCamera();
  }

  clearGeometry() {
    while (this.modelMeshObject.children.length) {
      const mesh = this.modelMeshObject.children[0];
      this.modelMeshObject.remove(mesh);
      utils.disposeMesh(mesh);
    }
  }

  setVisible(compName, visible) {
    this.modelMeshObject.traverse((obj) => {
      if (obj.name === compName) obj.visible = visible;
    });
  }

  setDisplayMode(mode) {
    this.modelMeshObject.traverse((obj) => {
      if (mode === 'wireframe' && obj instanceof Mesh) obj.material.opacity = 0.1;
      if (mode === 'wireframe' && obj instanceof LineSegments) obj.material.opacity = 0.5;

      if (mode === 'default' && obj instanceof Mesh) obj.material.opacity = 1;
      if (mode === 'default' && obj instanceof LineSegments) obj.material.opacity = 0;
    });
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
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }
}

export default ModelGeometryRenderer;
