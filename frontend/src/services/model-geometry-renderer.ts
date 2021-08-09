//@ts-nocheck
import {
  WebGLRenderer,
  Scene,
  Color,
  AmbientLight,
  PerspectiveCamera,
  PointLight,
  Geometry,
  Vector3,
  Face3,
  MeshPhongMaterial,
  Mesh,
  Box3,
  Sphere,
  BufferGeometry,
  BufferAttribute,
  Points,
  PointsMaterial,
  VertexColors,
  TextureLoader,
  Raycaster,
  Camera,
  Object3D,
} from 'three';

import distinctColors from 'distinct-colors';
import colors from '@/tools/colors';
import { Store } from 'vuex';
import TrackballControls from './trackball-controls';

const MAX_MOLECULES = 30000;
const AMBIENT_LIGHT_COLOR = 0x555555;
const CAMERA_LIGHT_COLOR = 0xcacaca;
const BACKGROUND_COLOR = 0xf8f8f9;

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
}

function disposeMesh(obj) {
  obj.geometry.dispose();
  obj.material.dispose();
}

function getNormScalar(nodes) {
  const xVec = [];
  const yVec = [];
  const zVec = [];

  for (const node of nodes) {
    xVec.push(node[0]);
    yVec.push(node[1]);
    zVec.push(node[2]);
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
  renderer: WebGLRenderer;
  store: Store<{}>;
  ctrl: RendererCtrl;
  scene: Scene;
  camera: Camera;
  objects: Object3D[];
  controls: () => void;

  constructor(canvas, store) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    this.store = store;

    const { clientWidth, clientHeight } = canvas.parentElement;

    this.ctrl = new RendererCtrl();

    this.renderer.setSize(clientWidth, clientHeight, false);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);

    this.scene = new Scene();
    this.scene.background = new Color(BACKGROUND_COLOR);
    this.scene.add(new AmbientLight(AMBIENT_LIGHT_COLOR), 7);

    this.camera = new PerspectiveCamera(45, clientWidth / clientHeight, 0.0000001, 5000);
    this.scene.add(this.camera);
    this.camera.add(new PointLight(CAMERA_LIGHT_COLOR, 0.9));

    this.objects = [];

    //@ts-ignore
    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    //@ts-ignore
    this.controls.enableDamping = true;
    //@ts-ignore
    this.controls.zoomSpeed = 0.8;

    //@ts-ignore
    this.controls.addEventListener('change', () => this.ctrl.renderOnce());
    this.renderer.domElement.addEventListener('wheel', () => this.ctrl.renderFor(2000), false);
    this.renderer.domElement.addEventListener('mousemove', () => this.ctrl.renderFor(2000), false);

    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('click', this.onClick);

    this.animate();
  }

  onMouseMove = (e: MouseEvent) => {
    if (!this.store.state.selectMode) return;
    const raycaster = new Raycaster();

    const canvasRect = this.renderer.domElement.parentElement.getBoundingClientRect();

    raycaster.setFromCamera(
      {
        x: (e.offsetX / canvasRect.width) * 2 - 1,
        y: -(e.offsetY / canvasRect.height) * 2 + 1,
      },
      this.camera,
    );

    const objects = this.objects.filter(
      (o) => !this.selectedTetIdxs.has(o.tetIdx) && !store.state.selectedTetIdxs.includes(o.tetIdx),
    );

    const intersects = raycaster.intersectObjects(objects, false);

    for (const obj of objects) {
      obj.material.color = new Color(0xffffff);
    }

    for (const intersect of intersects.slice(0, 1)) {
      intersect.object.material.color = new Color(colors[this.structures.length].num());
    }
  };

  onClick = (e: MouseEvent) => {
    if (!this.store.state.selectMode) return;

    const raycaster = new Raycaster();

    const canvasRect = this.renderer.domElement.parentElement.getBoundingClientRect();

    raycaster.setFromCamera(
      {
        x: (e.offsetX / canvasRect.width) * 2 - 1,
        y: -(e.offsetY / canvasRect.height) * 2 + 1,
      },
      this.camera,
    );

    const intersects = raycaster.intersectObjects(this.objects, false);

    for (const intersect of intersects.slice(0, 1)) {
      intersect.object.material.color = new Color(colors[this.structures.length].num());
      this.store.commit('addTetIdx', intersect.object.tetIdx);
    }
  };

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
  initGeometry(modelGeometry, structureType = '') {
    if (this.meshes) throw new Error('Model geometry has been already initialized');

    this.selectedTetIdxs = new Set(modelGeometry.meta.structures.flatMap((s) => s.tetIdxs));
    this.selectedTriIdxs = new Set(modelGeometry.meta.structures.flatMap((s) => s.triIdxs));
    this.structures = modelGeometry.meta.structures;
    const tetrahedrons: number[][] = modelGeometry.mesh.volume.elements.filter(
      (tetra) => !this.selectedTetIdxs.has(tetra[0]),
    );
    const triangles: number[][] = modelGeometry.mesh.volume.faces.filter(
      (face) => !this.selectedTriIdxs.has(face[0]),
    );

    const nodes: number[][] = modelGeometry.mesh.volume.nodes;

    if (structureType === '' || structureType === 'compartment')
      this.renderStructure(tetrahedrons, nodes);
    if (structureType === '' || structureType === 'membrane') this.renderFace(triangles, nodes);

    this.normScalar = getNormScalar(nodes);

    this.structureConfig = this.structures.reduce(
      (acc, structure, idx) => ({
        ...acc,
        [structure.name]: {
          ...structure,
          color: colors[idx],
          visible: true,
        },
      }),
      {},
    );

    this.structures.forEach((structure, idx) => {
      const tetrahedrons = structure.tetIdxs?.map((idx) => modelGeometry.mesh.volume.elements[idx]);
      const triangles = structure.triIdxs?.map((idx) => modelGeometry.mesh.volume.faces[idx]);
      if (tetrahedrons)
        this.renderStructure(tetrahedrons, nodes, colors[idx].num(), structure.name);
      if (triangles) this.renderFace(triangles, nodes, colors[idx].num(), structure.name);
    });

    this.alignCamera();
    this.ctrl.renderOnce();
  }

  renderStructure(
    tetrahedrons: number[][],
    nodes: number[][],
    color = 0xffffff,
    structureName = '',
  ) {
    tetrahedrons.forEach((tetrahedron) => {
      const index = tetrahedron[0];

      const vertices = tetrahedron.slice(1);

      const geometry = new Geometry();
      for (const vertex of vertices) {
        geometry.vertices.push(new Vector3(...nodes[vertex]));
      }

      const faces: [number, number, number][] = [
        [0, 1, 3],
        [1, 2, 3],
        [0, 3, 2],
        [0, 1, 2],
      ];

      for (const face of faces) {
        geometry.faces.push(new Face3(...face));
      }

      const material = new MeshPhongMaterial({
        color: new Color(color),
        transparent: true,
        opacity: 0.2,
      });

      geometry.mergeVertices();
      geometry.computeFaceNormals();

      const mesh = new Mesh(geometry, material);
      //@ts-ignore
      mesh.tetIdx = index;
      //@ts-ignore
      mesh.structureName = structureName;
      this.objects.push(mesh);
      this.scene.add(mesh);
    });
  }

  renderFace(triangles: number[][], nodes: number[][], color = 0xffffff, structureName = '') {
    triangles.forEach((tri) => {
      const index = tri[0];

      const vertices = tri.slice(1);

      const geometry = new Geometry();
      for (const vertex of vertices) {
        geometry.vertices.push(new Vector3(...nodes[vertex]));
      }

      geometry.faces.push(new Face3(...([0, 1, 2] as [number, number, number])));

      const material = new MeshPhongMaterial({
        color: new Color(color),
        transparent: true,
        opacity: 0.2,
      });

      geometry.mergeVertices();
      geometry.computeFaceNormals();

      const mesh = new Mesh(geometry, material);
      mesh.tetIdx = index;
      mesh.structureName = structureName;
      this.objects.push(mesh);
      this.scene.add(mesh);
    });
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
      // if (!this.structureConfig[structureName].visible) return;

      const structureType = this.modelGeometry.meta.structures.find(
        (st) => st.name === structureName,
      ).type;
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
    this.objects
      .filter((o) => o.structureName === compName)
      .forEach((o) => {
        o.visible = visible;
      });
    this.ctrl.renderOnce();
  }

  setDisplayConf(displayConf) {
    const conf = { ...DEFAULT_DISPLAY_CONF, ...displayConf };

    this.objects.forEach((obj) => {
      obj.material.opacity = conf.meshSurfaceOpacity;
    });

    if (this.moleculeCloud) {
      this.moleculeCloud.points.material.size = conf.moleculeSize;
      this.moleculeCloud.points.material.needsUpdate = true;
    }

    this.ctrl.renderOnce();
  }

  setWireFrame(wireframe) {
    this.objects.forEach((obj) => {
      obj.material.wireframe = wireframe;
    });
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
    cancelAnimationFrame(this.animationFrameId);
    this.controls.dispose();
    this.objects.forEach((mesh) => {
      disposeMesh(mesh);
    });
  }

  animate = () => {
    if (this.ctrl.render) {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  onResize = () => {
    const { clientWidth, clientHeight } = this.renderer.domElement.parentElement;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
    this.ctrl.renderOnce();
  };
}

export default ModelGeometryRenderer;
