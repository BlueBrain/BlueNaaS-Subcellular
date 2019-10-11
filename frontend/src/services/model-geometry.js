
import get from 'lodash/get';
import webWorker from 'simple-web-worker';

import writeArray from '@/tools/write-array';


/**
 * Get array representation of a particular type
 *
 * @param {Array} array
 * @param {Function} TypedArrayCtor
 */
function getTypedArray(array, TypedArrayCtor) {
  return array instanceof ArrayType
      ? array
      : ArrayType.from(array);
}

/**
 * Parse TetGen text based file
 *
 * @param {String} fileContent
 */
function parseTetGenFileSync(fileContent) {
  const NUMBER_R = /[\d.-]+/g;

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
  return webWorker.run(parseTetGenFileSync, [fileContent]);
}

class GeometryCompartment {
  type = 'compartment';

  constructor(name, tetIdxs) {
    this.name = name;
    this.tetIdxs = tetIdxs;
  }
}

function generateCompartmentSurfaceMeshSync(volMesh, compartment) {
  function getElementByIdx(idx) {
    return [
      volMesh.elements[idx * 4],
      volMesh.elements[idx * 4 + 1],
      volMesh.elements[idx * 4 + 2],
      volMesh.elements[idx * 4 + 3],
    ];
  }

  function getNodeByIdx(idx) {
    return [
      volMesh.nodes[idx * 3],
      volMesh.nodes[idx * 3 + 1],
      volMesh.nodes[idx * 3 + 2],
    ];
  }

  const vertexMap = new Map();

  const tets = compartment.tetIdxs
    .map(elIdx => getElementByIdx(elIdx));

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
    const coords = getNodeByIdx(nodeIdx);
    mesh.vertices.push(coords);
  });

  surfTris.forEach((tris) => {
    const face = tris.map(triIdx => surfVertexIdxMap[triIdx]);
    mesh.faces.push(face);
  });

  return mesh;
}

function generateCompartmentSurfaceMesh(volMesh, compartment) {
  return webWorker.run(generateCompartmentSurfaceMeshSync, [volMesh, compartment]);
}

function generateMembraneSurfaceMeshSync(volMesh, compartment) {
  function getFaceByIdx(idx) {
    return [ volMesh.faces[idx * 3], volMesh.faces[idx * 3 + 1], volMesh.faces[idx * 3 + 2]];
  }

  function getNodeByIdx(idx) {
    return [volMesh.nodes[idx * 3], volMesh.nodes[idx * 3 + 1], volMesh.nodes[idx * 3 + 2]];
  }

  const { triIdxs } = compartment;

  const vertexIdxSet = new Set();
  triIdxs.forEach((triIdx) => {
    getFaceByIdx(triIdx)
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
    const coords = getNodeByIdx(vertexIdx);
    mesh.vertices.push(coords);
  });

  triIdxs.forEach((triIdx) => {
    const faceReindexedVertexIdxs = getFaceByIdx(triIdx)
      .map(vertexIdx => vertexIdxMap[vertexIdx]);
    mesh.faces.push(faceReindexedVertexIdxs);
  });

  return mesh;
}

function generateMembraneSurfaceMesh(volMesh, compartment) {
  return webWorker.run(generateMembraneSurfaceMeshSync, [volMesh, compartment]);
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

    const srcNodes = get(mesh, 'volume.nodes', []).flat();
    modelGeometry.mesh.volume.nodes = getTypedArray(srcNodes, Float64Array);

    const srcFaces = get(mesh, 'volume.faces', []).flat();
    modelGeometry.mesh.volume.faces = getTypedArray(srcFaces, Uint32Array);

    const srcElements = get(mesh, 'volume.elements', []).flat();
    modelGeometry.mesh.volume.elements = getTypedArray(srcElements, Uint32Array);

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
    this.mesh.volume.raw = Object.freeze({ nodes, faces, elements });
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

        const { nodes, faces, elements } = this.mesh.volume;
        const volMesh = { nodes, faces, elements };
        const mesh = await genMeshFunc(volMesh, structure);
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

    const nodesRaw = await parseTetGenFile(this.mesh.volume.raw.nodes);
    const nodes = new Float64Array(nodesRaw.length * 3);
    nodesRaw.forEach((node, nodeIdx) => {
      const [nodeNum, x, y, z] = node;
      nodeIdxMap.set(nodeNum, nodeIdx);
      writeArray([x, y, z], nodes, nodeIdx * 3);
    });
    this.mesh.volume.nodes = nodes;

    const parseFaces = new Promise(async (done) => {
      const facesRaw = await parseTetGenFile(this.mesh.volume.raw.faces);
      const faces = new Uint32Array(facesRaw.length * 3);
      facesRaw.forEach((rawFace, faceIdx) => {
        const face = rawFace
          .splice(1, 3)
          .map(nodeNum => nodeIdxMap.get(nodeNum));
        writeArray(face, faces, faceIdx * 3);
      });
      this.mesh.volume.faces = faces;
      done();
    });

    const parseElements = new Promise(async (done) => {
      const elementsRaw = await parseTetGenFile(this.mesh.volume.raw.elements);
      const elements = new Uint32Array(elementsRaw.length * 4);
      elementsRaw.map((rawElement, elementIdx) => {
        const element = rawElement
          .splice(1, 4)
          .map(nodeNum => nodeIdxMap.get(nodeNum));
        writeArray(element, elements, elementIdx * 4);
      });
      this.mesh.volume.elements = elements;
      done();
    });

    await Promise.all([parseFaces, parseElements]);

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
