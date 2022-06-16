//@ts-nocheck
import { uniq } from 'lodash'

function parseTetGenFile(fileContent: string) {
  const NUMBER_R = /[\d.-]+/g

  const parseLine = (line: string) => line.match(NUMBER_R).map(parseFloat)

  const parsed: number[][] = []
  let currentIdx = 0
  let nextNewLineIdx = fileContent.indexOf('\n', currentIdx)

  while (nextNewLineIdx !== -1) {
    const line = fileContent.slice(currentIdx, nextNewLineIdx).trim()

    const header = currentIdx === 0

    currentIdx = nextNewLineIdx + 1
    nextNewLineIdx = fileContent.indexOf('\n', currentIdx)

    // parse line if it's not a header or comment
    if (!header && line[0] !== '#') {
      parsed.push(parseLine(line))
    }
  }

  return parsed
}

function generateCompartmentSurfaceMesh(volMesh, compartment) {
  const vertexMap = new Map()
  const tets: number[][] = compartment.tetIdxs.map((elIdx) => volMesh.elements[elIdx])

  for (const tet of tets) {
    const vert1 = tet[0]
    const vert2 = tet[1]
    const vert3 = tet[2]
    const vert4 = tet[3]

    const vertCombos = [
      [vert1, vert3, vert2],
      [vert2, vert3, vert4],
      [vert1, vert2, vert4],
      [vert1, vert4, vert3],
    ]

    for (const vert of vertCombos) {
      const key = [...vert].sort().join('_')
      if (vertexMap.has(key)) {
        vertexMap.delete(key)
      } else {
        vertexMap.set(key, vert)
      }
    }
  }

  const surfTris = Array.from(vertexMap.values())
  const surfVertices = uniq(surfTris.flat())

  const surfVertexIdxMap = new Map(surfVertices.map((v, i) => [v, i]))

  return {
    vertices: surfVertices.map((i) => volMesh.nodes[i]),
    faces: surfTris.map((tri: number[][]) => tri.map((triIdx) => surfVertexIdxMap.get(triIdx))),
  }
}

function generateMembraneSurfaceMesh(volMesh, { triIdxs }) {
  const vertexIdxs = uniq(triIdxs.map((triIdx) => volMesh.faces[triIdx]).flat())
  const vertexIdxMap = new Map(vertexIdxs.map((vi, i) => [vi, i]))

  return {
    vertices: vertexIdxs.map((vi) => volMesh.nodes[vi]),
    faces: triIdxs.map((triIdx) => volMesh.faces[triIdx].map((vertexIdx) => vertexIdxMap.get(vertexIdx))),
  }
}

class ModelGeometry {
  name = null

  description = null

  id = null

  valid = false

  initialized = false

  meta = null

  mesh = {
    volume: {
      nodes: [],
      faces: [],
      elements: [],
      raw: {
        nodes: null,
        faces: null,
        elements: null,
      },
    },
    surface: {},
  }

  constructor(name) {
    this.name = name
  }

  static from(modelGeometrySrc) {
    const modelGeometry = new ModelGeometry()
    const { name, id, description, meta, mesh } = modelGeometrySrc

    Object.assign(modelGeometry, {
      name,
      id,
      description,
      initialized: true,
      meta,
      mesh,
    })
    return modelGeometry
  }

  get hasCompleteRawMesh() {
    const rawMesh = this.mesh.volume.raw
    const { meta } = this

    return (
      rawMesh.nodes &&
      rawMesh.nodes.length &&
      rawMesh.faces &&
      rawMesh.faces.length &&
      rawMesh.elements &&
      rawMesh.elements.length &&
      meta &&
      meta.meshNameRoot &&
      meta.scale &&
      meta.structures &&
      meta.structures.length
    )
  }

  get hasVolumeMesh() {
    const { nodes, faces, elements } = this.mesh.volume

    return nodes.length && faces.length && elements.length
  }

  get hasSurfaceMesh() {
    return Object.keys(this.mesh.surface).length
  }

  async init({ removeRawMesh } = { removeRawMesh: true }) {
    if (this.hasSurfaceMesh) return

    if (!this.hasVolumeMesh) {
      await this.parseTetGen()
    }

    if (removeRawMesh) delete this.mesh.volume.raw

    this.generateSurfaceMeshes()
  }

  async addTetGenMesh({ nodes, faces, elements }) {
    this.mesh.volume.raw = Object.freeze({ nodes, faces, elements })
    await this.parseTetGen()
  }

  addMeta({ meshNameRoot, scale, structures, freeDiffusionBoundaries }) {
    this.meta = Object.freeze({
      meshNameRoot,
      scale,
      structures,
      freeDiffusionBoundaries,
    })
  }

  generateSurfaceMeshes() {
    for (const structure of this.meta.structures) {
      const genMeshFunc =
        structure.type === 'compartment' ? generateCompartmentSurfaceMesh : generateMembraneSurfaceMesh

      const { nodes, faces, elements } = this.mesh.volume
      const volMesh = { nodes, faces, elements }
      const mesh = genMeshFunc(volMesh, structure)

      this.mesh.surface[structure.name] = Object.freeze(mesh)
    }

    this.initialized = true
  }

  /**
   * Parse TetGen mesh files and reindex nodes
   * @see http://wias-berlin.de/software/tetgen/fformats.html
   */
  async parseTetGen() {
    this.mesh.volume.nodes = parseTetGenFile(this.mesh.volume.raw.nodes).map((n) => n.slice(1))
    this.mesh.volume.faces = parseTetGenFile(this.mesh.volume.raw.faces).map((f) => f.map((n) => n - 1).slice(1))
    this.mesh.volume.elements = parseTetGenFile(this.mesh.volume.raw.elements).map((f) => f.map((n) => n - 1).slice(1))
  }

  getRaw() {
    const { id, name, description, meta, structures } = this
    const { raw } = this.mesh.volume

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
    }
  }

  getClean() {
    const { id, name, description, meta, structures } = this
    const { nodes, faces, elements } = this.mesh.volume

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
    }
  }
}

export default ModelGeometry
