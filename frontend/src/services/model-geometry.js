
import get from 'lodash/get';
import SWorker from 'simple-web-worker';


const webWorker = SWorker.create([{
  message: 'parseTetGenFile',
  func: parseTetGenFileSync,
}, {
  message: 'generateCompartmentSurfaceMesh',
  func: generateCompartmentSurfaceMeshSync,
}, {
  message: 'generateMembraneSurfaceMesh',
  func: generateMembraneSurfaceMeshSync,
}]);

/**
 * Parse TetGen text based file
 *
 * @param {String} fileContent
 */
function parseTetGenFileSync(fileContent) {
  const NUMBER_R = /[\d.]+/g;

  const parseLine = line => line.match(NUMBER_R).map(parseFloat);

  const parsed = [];
  let currentIdx = 0
  let nextNewLineIdx = fileContent.indexOf('\n', currentIdx);

  while (nextNewLineIdx !== -1) {
    const line = fileContent
      .slice(currentIdx, nextNewLineIdx)
      .trim();

    const header = currentIdx === 0;

    currentIdx = nextNewLineIdx + 1;
    nextNewLineIdx = fileContent.indexOf('\n', currentIdx);

    // parse line if it's not a header or comment
    if (!header && line[0] !== '#') {
      parsed.push(parseLine(line));
    }
  }

  return parsed;
}

/**
 * Parse TetGen text based file using WebWorker
 *
 * @param {String} fileContent
 */
function parseTetGenFile(fileContent) {
  return webWorker.postMessage('parseTetGenFile', [fileContent]);
}

class GeometryCompartment {
  type = 'compartment';

  constructor(name, tetIdxs) {
    this.name = name;
    this.tetIdxs = tetIdxs;
  }
}

function generateCompartmentSurfaceMeshSync(modelGeometry, compartment) {
  const vertexMap = new Map();

  const tets = compartment.tetIdxs
    .map(elIdx => modelGeometry.mesh.volume.elements[elIdx]);

  tets.forEach((tet) => {
    const vert1 = tet[0];
    const vert2 = tet[1];
    const vert3 = tet[2];
    const vert4 = tet[3];

    [
      [vert1, vert3, vert2],
      [vert2, vert3, vert4],
      [vert1, vert2, vert4],
      [vert1, vert4, vert3],
    ].forEach((tri) => {
      const key = tri.sort().join('_');

      if (vertexMap.has(key)) {
        vertexMap.delete(key);
      } else {
        vertexMap.set(key, tri);
      }
    });
  });

  const surfTris = Array.from(vertexMap.values());

  const vertexSet = new Set();
  surfTris.forEach(vertices => vertices.forEach(vertex => vertexSet.add(vertex)));
  const surfVertices = Array.from(vertexSet);

  const surfVertexIdxMap = new Map();
  surfVertices.forEach((v, idx) => { surfVertexIdxMap[v] = idx; });

  const mesh = {
    vertices: [],
    faces: [],
  };

  surfVertices.forEach((nodeIdx) => {
    const coords = modelGeometry.mesh.volume.nodes[nodeIdx];
    mesh.vertices.push(coords);
  });

  surfTris.forEach((tris) => {
    const face = tris.map(triIdx => surfVertexIdxMap[triIdx]);
    mesh.faces.push(face);
  });

  return mesh;
}

function generateCompartmentSurfaceMesh(modelGeometry, compartment) {
  return webWorker.postMessage('generateCompartmentSurfaceMesh', [modelGeometry, compartment]);
}

function generateMembraneSurfaceMeshSync(modelGeometry, compartment) {
  const { triIdxs } = compartment;

  const vertexIdxSet = new Set();
  triIdxs.forEach((triIdx) => {
    modelGeometry.mesh.volume.faces[triIdx]
      .forEach(vertexIdx => vertexIdxSet.add(vertexIdx));
  });

  const vertexIdxs = Array.from(vertexIdxSet);
  const vertexIdxMap = vertexIdxs.reduce((acc, vertexIdx, idx) => {
    acc[vertexIdx] = idx;
    return acc;
  }, {});

  const mesh = {
    vertices: [],
    faces: [],
  };

  vertexIdxs.forEach((vertexIdx) => {
    const coords = modelGeometry.mesh.volume.nodes[vertexIdx];
    mesh.vertices.push(coords);
  });

  triIdxs.forEach((triIdx) => {
    const faceReindexedVertexIdxs = modelGeometry.mesh.volume.faces[triIdx]
      .map(vertexIdx => vertexIdxMap[vertexIdx]);
    mesh.faces.push(faceReindexedVertexIdxs);
  });

  return mesh;
}

function generateMembraneSurfaceMesh(modelGeometry, compartment) {
  return webWorker.postMessage('generateMembraneSurfaceMesh', [modelGeometry, compartment]);
}

class GeometryMembrane {
  type = 'membrane';

  constructor(name, triIdxs) {
    this.name = name;
    this.triIdxs = triIdxs;
  }
}

class ModelGeometry {
  name = null;
  description = null;
  id = null;
  valid = false;
  parsed = false;
  initialized = false;
  meta = null;
  mesh = {
    volume: {
      nodes: [],
      faces: [],
      elements: [],
      raw: {
        nodes: null,
        faces: null,
        elements: null,
      }
    },
    surface: {},
  };

  constructor(name) {
    this.name = name;
  }

  static from(modelGeometrySrc) {
    const modelGeometry = new ModelGeometry();
    const { name, id, description, initialized, parsed, meta, mesh } = modelGeometrySrc;
    Object.assign(modelGeometry, { name, id, description, initialized, parsed, meta });

    modelGeometry.mesh.volume.raw = Object.freeze(mesh.volume.raw);
    modelGeometry.mesh.volume.nodes = Object.freeze(get(mesh, 'volume.nodes', []));
    modelGeometry.mesh.volume.faces = Object.freeze(get(mesh, 'volume.faces', []));
    modelGeometry.mesh.volume.elements = Object.freeze(get(mesh, 'volume.elements', []));
    modelGeometry.mesh.surface = Object.entries(get(mesh, 'surface', {}))
      .reduce((acc, [structName, structMesh]) => ({...acc, ...{ [structName]: Object.freeze(structMesh) }}), {});

    return modelGeometry;
  }

  get complete() {
    const rawMesh = this.mesh.volume.raw
    const { meta } = this;

    return rawMesh.nodes && rawMesh.nodes.length
      && rawMesh.faces && rawMesh.faces.length
      && rawMesh.elements && rawMesh.elements.length
      && meta
      && meta.meshNameRoot
      && meta.scale
      && meta.structures && meta.structures.length;
  }

  async init() {
    if (!this.parsed) {
      await this.parseTetGen();
    }

    if (!this.initialized) {
      await this.generateSurfaceMeshes();
    }
  }

  async addTetGenMesh({ nodes, faces, elements }) {
    this.mesh.volume.raw = { nodes, faces, elements };
    await this.parseTetGen();
    this.parsed = true;
  }

  addMeta({ meshNameRoot, scale, structures, freeDiffusionBoundaries }) {
    this.meta = Object.freeze({ meshNameRoot, scale, structures, freeDiffusionBoundaries });
  }

  async generateSurfaceMeshes() {
    const surfGenPromises = [];

    this.meta.structures.forEach((structure) => {
      surfGenPromises.push(new Promise(async (done) => {
        const genMeshFunc = structure.type === 'compartment'
          ? generateCompartmentSurfaceMesh
          : generateMembraneSurfaceMesh;

        const mesh = await genMeshFunc(this, structure);
        this.mesh.surface[structure.name] = Object.freeze(mesh);

        done();
      }));
    });

    await Promise.all(surfGenPromises);

    this.initialized = true;
  }

  /**
   * Parse TetGen mesh files and reindex nodes
   */
  async parseTetGen() {
    const nodeIdxMap = new Map();

    const parseNodes = new Promise(async (done) => {
      const nodesRaw = await parseTetGenFile(this.mesh.volume.raw.nodes);
      const nodes = nodesRaw.map((node, nodeIdx) => {
        const [nodeNum, x, y, z] = node;
        nodeIdxMap.set(nodeNum, nodeIdx);
        return [x, y, z];
      });
      this.mesh.volume.nodes = Object.freeze(nodes);
      done();
    });

    const parseFaces = new Promise(async (done) => {
      const facesRaw = await parseTetGenFile(this.mesh.volume.raw.faces);
      const faces = facesRaw.map((face) => {
        return face
          .splice(1, 3)
          .map(nodeNum => nodeIdxMap.get(nodeNum));
      });
      this.mesh.volume.faces = Object.freeze(faces);
      done();
    });

    const parseElements = new Promise(async (done) => {
      const elementsRaw = await parseTetGenFile(this.mesh.volume.raw.elements);
      const elements = elementsRaw.map((element) => {
        return element
          .splice(1, 4)
          .map(nodeNum => nodeIdxMap.get(nodeNum));
      });
      this.mesh.volume.elements = Object.freeze(elements);
      done();
    });

    await Promise.all([parseNodes, parseFaces, parseElements]);

    this.parsed = true;
  }

  getClean() {
    const { id, name, description, meta, structures } = this;
    const rawMesh = this.mesh.volume.raw;

    return {
      id,
      name,
      description,
      meta,
      structures,
      mesh: {
        volume: {
          raw: rawMesh,
        },
      },
    }
  }
}


export default ModelGeometry;
