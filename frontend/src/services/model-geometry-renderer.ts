//@ts-nocheck
import range from 'lodash/range';
import chroma from 'chroma-js';
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
  BufferGeometry,
  BufferAttribute,
  Points,
  PointsMaterial,
  VertexColors,
  TextureLoader,
} from 'three';
import distinctColors from 'distinct-colors';

import TrackballControls from './trackball-controls';

const DEFAULT_STRUCTURE_COLOR = 0x47cb89;
const MAX_MOLECULES = 30000;

const FOG_COLOR = 0xf8f8f9;
const NEAR = 20;
const FAR = 200;
const AMBIENT_LIGHT_COLOR = 0x555555;
const CAMERA_LIGHT_COLOR = 0xcacaca;
const BACKGROUND_COLOR = 0xf8f8f9;

// TODO: move to tools/utils
class RendererCtrl {
  countinuousRenderCounter = 0;

  once = true;

  stopTime = null;

  get render() {
    if (this.countinuousRenderCounter) return true;

    if (this.stopTime) {
      const now = Date.now();
      if (this.stopTime > now) return true;

      this.stopTime = null;
      return false;
    }

    const { once } = this;
    this.once = false;
    return once;
  }

  renderOnce() {
    this.once = true;
  }

  renderFor(time) {
    const now = Date.now();
    if (this.stopTime && this.stopTime > now + time) return;
    this.stopTime = now + time;
  }

  renderUntilStopped() {
    this.countinuousRenderCounter += 1;
    return () => {
      this.countinuousRenderCounter -= 1;
    };
  }
}

function disposeMesh(obj) {
  obj.geometry.dispose();
  obj.material.dispose();
}

function getNormScalar(nodes) {
  const xVec = [];
  const yVec = [];
  const zVec = [];

  for (let i = 0; i < nodes.length / 3; i += 3) {
    xVec.push(nodes[i]);
    yVec.push(nodes[i + 1]);
    zVec.push(nodes[i + 2]);
  }

  const deltaX = Math.max(...xVec) - Math.min(...xVec);
  const deltaY = Math.max(...yVec) - Math.min(...yVec);
  const deltaZ = Math.max(...zVec) - Math.min(...zVec);

  const maxDimensionSize = Math.max(deltaX, deltaY, deltaZ);

  const normScalar = 10 / maxDimensionSize;

  return normScalar;
}

const DEFAULT_DISPLAY_CONF = {
  meshSurfaceOpacity: 0.5,
  meshWireframeOpacity: 0.1,
  moleculeSize: 0.15,
};

class ModelGeometryRenderer {
  constructor(canvas) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    const { clientWidth, clientHeight } = canvas.parentElement;

    this.ctrl = new RendererCtrl();

    this.renderer.setSize(clientWidth, clientHeight, false);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);

    this.scene = new Scene();
    this.scene.background = new Color(BACKGROUND_COLOR);
    this.scene.fog = new Fog(FOG_COLOR, NEAR, FAR);
    this.scene.add(new AmbientLight(AMBIENT_LIGHT_COLOR));

    this.camera = new PerspectiveCamera(45, clientWidth / clientHeight, 1, 300);
    this.scene.add(this.camera);
    this.camera.add(new PointLight(CAMERA_LIGHT_COLOR, 0.9));

    this.modelMeshObject = new Object3D();
    this.modelMeshObject.matrixAutoUpdate = false;
    this.scene.add(this.modelMeshObject);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.zoomSpeed = 0.8;

    this.controls.addEventListener('change', () => this.ctrl.renderOnce());
    this.renderer.domElement.addEventListener('wheel', () => this.ctrl.renderFor(2000), false);
    this.renderer.domElement.addEventListener(
      'mousemove',
      () => this.ctrl.renderFor(2000, 100),
      false,
    );

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
  initGeometry(modelGeometry, displayConf = DEFAULT_DISPLAY_CONF) {
    if (this.meshes) throw new Error('Model geometry has been already initialized');

    this.modelGeometry = modelGeometry;

    const getDefaultStructure = () => ({
      name: 'main',
      type: 'compartment',
      tetIdxs: range(modelGeometry.mesh.volume.elements.length),
      color: chroma(DEFAULT_STRUCTURE_COLOR),
    });

    const structures = modelGeometry.meta.structures || [getDefaultStructure()];

    this.colors = distinctColors({
      count: structures.length,
      chromaMin: 60,
      chromaMax: 100,
    });

    this.structureConfig = structures.reduce(
      (acc, structure, idx) => ({
        ...acc,
        [structure.name]: {
          ...structure,
          color: this.colors[idx],
          visible: true,
        },
      }),
      {},
    );

    this.normScalar = getNormScalar(modelGeometry.mesh.volume.nodes);

    const createGeometry = (structureName) => {
      const geometry = new Geometry();
      const bufferGeometry = new BufferGeometry();

      modelGeometry.mesh.surface[structureName].vertices.forEach((coords) => {
        const vertexVec = new Vector3(...coords.map((coord) => coord * this.normScalar));
        geometry.vertices.push(vertexVec);
      });

      modelGeometry.mesh.surface[structureName].faces.forEach((triIdxs) =>
        geometry.faces.push(new Face3(...triIdxs)),
      );

      geometry.mergeVertices();
      geometry.computeFaceNormals();

      bufferGeometry.fromGeometry(geometry);

      return bufferGeometry;
    };

    structures.forEach((structure, idx) => {
      const geometry = createGeometry(structure.name);

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

    this.setDisplayConf(displayConf);
    this.alignCamera();
    this.ctrl.renderOnce();
  }

  clearGeometry() {
    while (this.modelMeshObject.children.length) {
      const mesh = this.modelMeshObject.children[0];
      this.modelMeshObject.remove(mesh);
      disposeMesh(mesh);
    }
  }

  setMoleculeConfig(moleculeName, config) {
    Object.assign(this.moleculeConfig[moleculeName], config);
  }

  setStructureConfig(structureName, config) {
    Object.assign(this.structureConfig[structureName], config);
  }

  initMolecules(moleculeNames) {
    const molColors = distinctColors({
      count: moleculeNames.length,
    });

    this.moleculeConfig = moleculeNames.reduce(
      (acc, molName, idx) => ({
        ...acc,
        [molName]: { color: molColors[idx], visible: true },
      }),
      {},
    );

    const positionBuffer = new Float32Array(MAX_MOLECULES * 3);
    const colorBuffer = new Float32Array(MAX_MOLECULES * 3);

    const positionBufferAttr = new BufferAttribute(positionBuffer, 3);
    const colorBufferAttr = new BufferAttribute(colorBuffer, 3);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', positionBufferAttr);
    geometry.setAttribute('color', colorBufferAttr);

    const texture = new TextureLoader().load('/disc.png');

    const material = new PointsMaterial({
      vertexColors: VertexColors,
      size: 0.1,
      transparent: true,
      alphaTest: 0.5,
      depthTest: false,
      sizeAttenuation: true,
      map: texture,
    });

    const points = new Points(geometry, material);
    points.name = 'moleculeCloud';
    points.frustumCulled = false;

    this.scene.add(points);

    this.moleculeCloud = {
      positionBufferAttr,
      colorBufferAttr,
      points,
    };
  }

  renderMolecules(spatialSample) {
    if (!this.moleculeCloud) return;
    console.log(spatialSample);

    let pntIdx = 0;

    const { positionBufferAttr, colorBufferAttr, points } = this.moleculeCloud;

    const processCount = (moleculeName, structureType, simplexIdx, count) => {
      const color = this.moleculeConfig[moleculeName].color.gl();

      const genRandPointFunc =
        structureType === 'compartment'
          ? this.genRandTetPoint.bind(this)
          : this.genRandTriPoint.bind(this);

      for (let i = 0; i < count; i += 1) {
        if (pntIdx + 1 === MAX_MOLECULES) {
          return console.warn('Molecule renderer reached MAX_MOLECULES');
        }

        const position = genRandPointFunc(simplexIdx);

        colorBufferAttr.set(color, pntIdx * 3);
        positionBufferAttr.set(position, pntIdx * 3);

        pntIdx += 1;
      }
    };

    Object.keys(spatialSample.data).forEach((structureName) => {
      const structureType = this.modelGeometry.meta.structures.find(
        (st) => st.name.toLowerCase() === structureName.toLowerCase(),
      )?.type;

      if (!structureType) return;

      const simplexIdxProp = structureType === 'compartment' ? 'tetIdxs' : 'triIdxs';
      const structCount = spatialSample.data[structureName];
      Object.keys(structCount).forEach((moleculeName) => {
        if (!this.moleculeConfig[moleculeName].visible) return;

        const molCountObj = structCount[moleculeName];
        molCountObj[simplexIdxProp].forEach((simplexIdx, idx) =>
          processCount(moleculeName, structureType, simplexIdx, molCountObj.molCounts[idx]),
        );
      });
    });

    colorBufferAttr.needsUpdate = true;
    positionBufferAttr.needsUpdate = true;

    points.geometry.setDrawRange(0, pntIdx);
    this.ctrl.renderOnce();
  }

  genRandTetPoint(tetIdx) {
    const tetPnts = Array.from(
      this.modelGeometry.mesh.volume.elements.slice(tetIdx * 4, tetIdx * 4 + 4),
    ).map((vertexIdx) =>
      this.modelGeometry.mesh.volume.nodes
        .slice(vertexIdx * 3, vertexIdx * 3 + 3)
        .map((coord) => coord * this.normScalar),
    );

    let s = Math.random();
    let t = Math.random();
    let u = Math.random();

    if (s + t > 1) {
      // cut'n fold the cube into a prism
      s = 1 - s;
      t = 1 - t;
    }

    if (t + u > 1) {
      // cut'n fold the prism into a tetrahedron
      const tmp = u;
      u = 1 - s - t;
      t = 1 - tmp;
    } else if (s + t + u > 1) {
      const tmp = u;
      u = s + t + u - 1;
      s = 1 - t - tmp;
    }

    // a,s,t,u are the barycentric coordinates of the random point.
    const a = 1 - s - t - u;

    const p0 = tetPnts[0].map((coord) => coord * a);
    const p1 = tetPnts[1].map((coord) => coord * s);
    const p2 = tetPnts[2].map((coord) => coord * t);
    const p3 = tetPnts[3].map((coord) => coord * u);

    return [
      p0[0] + p1[0] + p2[0] + p3[0],
      p0[1] + p1[1] + p2[1] + p3[1],
      p0[2] + p1[2] + p2[2] + p3[2],
    ];
  }

  genRandTriPoint(triIdx) {
    const volumeMesh = this.modelGeometry.mesh.volume;

    const normalize = (coord) => coord * this.normScalar;

    const triPnts = Array.from(
      volumeMesh.faces.slice(triIdx * 3, triIdx * 3 + 3),
    ).map((vertexIdx) => volumeMesh.nodes.slice(vertexIdx * 3, vertexIdx * 3 + 3).map(normalize));

    // from http://www.cs.princeton.edu/~funk/tog02.pdf
    const s = Math.random();
    const t = Math.random();

    const u = Math.sqrt(s);
    const v = u * t;

    const p0 = triPnts[0].map((coord) => coord * (1 - u));
    const p1 = triPnts[1].map((coord) => coord * (u - v));
    const p2 = triPnts[2].map((coord) => coord * v);

    return [p0[0] + p1[0] + p2[0], p0[1] + p1[1] + p2[1], p0[2] + p1[2] + p2[2]];
  }

  setVisible(compName, visible) {
    this.structureConfig[compName].visible = visible;

    this.modelMeshObject.traverse((obj) => {
      if (obj.name === compName) obj.visible = visible;
    });

    this.ctrl.renderOnce();
  }

  setDisplayConf(displayConf) {
    const conf = { ...DEFAULT_DISPLAY_CONF, ...displayConf };

    this.modelMeshObject.traverse((obj) => {
      if (!['Mesh', 'LineSegments'].includes(obj.type)) return;

      obj.material.opacity =
        obj.type === 'Mesh' ? conf.meshSurfaceOpacity : conf.meshWireframeOpacity;
    });

    if (this.moleculeCloud) {
      this.moleculeCloud.points.material.size = conf.moleculeSize;
      this.moleculeCloud.points.material.needsUpdate = true;
    }

    this.ctrl.renderOnce();
  }

  alignCamera() {
    const boundingSphere = new Sphere();
    const box = new Box3().setFromObject(this.scene);
    box.getBoundingSphere(boundingSphere);
    const { center, radius } = boundingSphere;

    this.camera.position.x = center.x;
    this.camera.position.y = center.y;

    this.distance = (radius / Math.tan((Math.PI * this.camera.fov) / 360)) * 1.15;

    this.camera.position.z = this.distance + center.z;
    this.controls.target = center;
  }

  destroy() {
    this.stopAnimation();
    this.controls.dispose();
    this.modelMeshObject.children.forEach((mesh) => disposeMesh(mesh));
  }

  stopAnimation() {
    cancelAnimationFrame(this.animationFrameId);
  }

  animate() {
    if (this.ctrl.render) {
      this.controls.update();
      this.render();
    }
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
    this.ctrl.renderOnce();
  }
}

export default ModelGeometryRenderer;
