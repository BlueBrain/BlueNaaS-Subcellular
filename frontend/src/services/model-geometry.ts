//@ts-nocheck
import get from 'lodash/get';
import webWorker from 'simple-web-worker';

function unflatten(array: number[], n: number) {
  const nested = [];
  for (let i = 0; i < array.length; i += n) {
    nested.push([array[i], array[i + 1], array[i + 2], array[i + 3]]);
  }
  return nested;
}

/**
 * Parse TetGen text based file
 *
 * @param {String} fileContent
 */
function parseTetGenFileSync(fileContent) {
  const NUMBER_R = /[\d.-]+/g;

  const parseLine = (line) => line.match(NUMBER_R).map(parseFloat);

  const parsed = [];
  let currentIdx = 0;
  let nextNewLineIdx = fileContent.indexOf('\n', currentIdx);

  while (nextNewLineIdx !== -1) {
    const line = fileContent.slice(currentIdx, nextNewLineIdx).trim();

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
    return [volMesh.nodes[idx * 3], volMesh.nodes[idx * 3 + 1], volMesh.nodes[idx * 3 + 2]];
  }

  const vertexMap = new Map();

  const tets = compartment.tetIdxs.map((elIdx) => getElementByIdx(elIdx));

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
      const key = tri.slice().sort().join('_');

      if (vertexMap.has(key)) {
        vertexMap.delete(key);
      } else {
        vertexMap.set(key, tri);
      }
    });
  });

  const surfTris = Array.from(vertexMap.values());

  const vertexSet = new Set();
  surfTris.forEach((vertices) => vertices.forEach((vertex) => vertexSet.add(vertex)));
  const surfVertices = Array.from(vertexSet);

  const surfVertexIdxMap = new Map();
  surfVertices.forEach((v, idx) => {
    surfVertexIdxMap[v] = idx;
  });

  const mesh = {
    vertices: [],
    faces: [],
  };

  surfVertices.forEach((nodeIdx) => {
    const coords = getNodeByIdx(nodeIdx);
    mesh.vertices.push(coords);
  });

  surfTris.forEach((tris) => {
    const face = tris.map((triIdx) => surfVertexIdxMap[triIdx]);
    mesh.faces.push(face);
  });

  return mesh;
}

function generateCompartmentSurfaceMesh(volMesh, compartment) {
  return webWorker.run(generateCompartmentSurfaceMeshSync, [volMesh, compartment]);
}

function generateMembraneSurfaceMeshSync(volMesh, compartment) {
  function getFaceByIdx(idx) {
    return [volMesh.faces[idx * 3], volMesh.faces[idx * 3 + 1], volMesh.faces[idx * 3 + 2]];
  }

  function getNodeByIdx(idx) {
    return [volMesh.nodes[idx * 3], volMesh.nodes[idx * 3 + 1], volMesh.nodes[idx * 3 + 2]];
  }

  const { triIdxs } = compartment;

  const vertexIdxSet = new Set();
  triIdxs.forEach((triIdx) => {
    getFaceByIdx(triIdx).forEach((vertexIdx) => vertexIdxSet.add(vertexIdx));
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
    const faceReindexedVertexIdxs = getFaceByIdx(triIdx).map(
      (vertexIdx) => vertexIdxMap[vertexIdx],
    );
    mesh.faces.push(faceReindexedVertexIdxs);
  });

  return mesh;
}

function generateMembraneSurfaceMesh(volMesh, compartment) {
  return webWorker.run(generateMembraneSurfaceMeshSync, [volMesh, compartment]);
}

interface Mesh {
  volume: {
    nodes: number[][];
    faces: number[][];
    elements: number[][];
    raw: {
      nodes: string;
      faces: string;
      elements: string;
    };
  };
}

class ModelGeometry {
  name = null;

  description = null;

  id = null;

  valid = false;

  meta = {
    scale: 1,
    structures: [],
    freeDiffusionBoundaries: [],
  };

  mesh: Mesh = {
    volume: {
      nodes: [],
      faces: [],
      elements: [],
      raw: {
        nodes: '',
        faces: '',
        elements: '',
      },
    },
    surface: {},
  };

  constructor(dispatch: () => void) {
    this.dispatch = dispatch;
  }

  static from(modelGeometrySrc) {
    const modelGeometry = new ModelGeometry();
    const { name, id, description, meta, mesh } = modelGeometrySrc;
    Object.assign(modelGeometry, {
      name,
      id,
      description,
      meta,
    });

    if (mesh.volume.raw) modelGeometry.mesh.volume.raw = Object.freeze(mesh.volume.raw);

    modelGeometry.mesh.volume.nodes = mesh.volume?.nodes || [];
    modelGeometry.mesh.volume.faces = mesh.volume?.faces || [];
    modelGeometry.mesh.volume.elements = mesh.volume?.elements || [];

    modelGeometry.mesh.surface = Object.entries(mesh.surface || {}).reduce(
      (acc, [structName, structMesh]) => ({
        ...acc,
        ...{ [structName]: Object.freeze(structMesh) },
      }),
      {},
    );

    return modelGeometry;
  }

  get hasCompleteRawMesh() {
    const rawMesh = this.mesh.volume.raw;

    return (
      rawMesh.nodes &&
      rawMesh.nodes.length &&
      rawMesh.faces &&
      rawMesh.faces.length &&
      rawMesh.elements &&
      rawMesh.elements.length
    );
  }

  get hasVolumeMesh() {
    const { nodes, faces, elements } = this.mesh.volume;

    return nodes.length && faces.length && elements.length;
  }

  get hasSurfaceMesh() {
    return Object.keys(this.mesh.surface).length;
  }

  async init() {
    if (this.hasCompleteRawMesh) await this.parseTetGen();
    if (this.hasVolumeMesh) await this.generateSurfaceMeshes();
  }

  removeRawMesh() {
    delete this.mesh.volume.raw;
  }

  async addTetGenMesh({ nodes, faces, elements }) {
    this.mesh.volume.raw = Object.freeze({ nodes, faces, elements });
    await this.parseTetGen();
  }

  addMeta({ meshNameRoot, scale, structures, freeDiffusionBoundaries }) {
    this.meta = Object.freeze({
      meshNameRoot,
      scale,
      structures,
      freeDiffusionBoundaries,
    });
  }

  async generateSurfaceMeshes() {
    const surfGenPromises = [];

    this.meta.structures.forEach((structure) => {
      surfGenPromises.push(
        //eslint-disable-next-line
        new Promise(async (done) => {
          const genMeshFunc =
            structure.type === 'compartment'
              ? generateCompartmentSurfaceMesh
              : generateMembraneSurfaceMesh;

          const mesh = await genMeshFunc(this.mesh.volume, structure);
          this.mesh.surface[structure.name] = Object.freeze(mesh);
          done(undefined);
        }),
      );
    });

    await Promise.all(surfGenPromises);
  }

  /**
   * Parse TetGen mesh files and reindex nodes
   * @see http://wias-berlin.de/software/tetgen/fformats.html
   */
  async parseTetGen() {
    const nodesRaw: number[][] = await parseTetGenFile(this.mesh.volume.raw.nodes);
    this.mesh.volume.nodes = nodesRaw.map((n) => n.slice(1));

    const facesRaw: number[][] = await parseTetGenFile(this.mesh.volume.raw.faces);
    this.mesh.volume.faces = facesRaw.map((f) => [f[0] - 1, f[1] - 1, f[2] - 1, f[3] - 1]);

    const elementsRaw: number[][] = await parseTetGenFile(this.mesh.volume.raw.elements);
    this.mesh.volume.elements = elementsRaw.map((e) => [
      e[0] - 1,
      e[1] - 1,
      e[2] - 1,
      e[3] - 1,
      e[4] - 1,
    ]);
  }

  getRaw() {
    const { id, name, description, meta, structures } = this;
    const { raw } = this.mesh.volume;

    return {
      id,
      name,
      description,
      meta,
      structures,
      mesh: {
        volume: {
          raw,
        },
      },
    };
  }

  getClean() {
    const { id, name, description, meta, structures } = this;
    const { nodes, faces, elements } = this.mesh.volume;

    return {
      id,
      name,
      description,
      meta,
      structures,
      mesh: {
        volume: {
          nodes: Array.from(nodes),
          faces: Array.from(faces),
          elements: Array.from(elements),
        },
      },
    };
  }
}

export default ModelGeometry;
