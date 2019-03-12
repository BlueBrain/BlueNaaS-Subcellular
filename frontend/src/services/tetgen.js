

/**
 * Parse TetGen line
 *
 * @param {String} line
 */
function parseLine(line) {
  return line
    .split(/(\s+)/)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk)
    .map(numStr => parseFloat(numStr));
}

/**
 * Parse TetGen text based file
 *
 * @param {String} fileContent
 */
function parseFile(fileContent) {
  return fileContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line)
    .filter(line => !line.startsWith('#'))
    .map(line => parseLine(line));
}

/**
 * Class representing TetGen mesh
 */
class TetGenMesh {
  /**
   * Create TetGen mesh instance, only text format supported
   *
   * @param {String} nodesStr    Content of .nodes file
   * @param {String} facesStr    Content of .faces file
   * @param {String} elementsStr Content of .elements file
   */
  constructor(nodesStr, facesStr, elementsStr) {
    this.nodes = [];
    this.faces = [];
    this.elements = [];

    this.parse(nodesStr, facesStr, elementsStr);
  }

  /**
   * Parse nodes, faces and elements
   * according to spec, reindexing nodes from zero
   * @see http://wias-berlin.de/software/tetgen/fformats.html
   */
  parse(nodesStr, facesStr, elementsStr) {
    const nodeIdxMap = {};

    const nodesRaw = parseFile(nodesStr).splice(1);
    this.nodes = nodesRaw.map((node, nodeIdx) => {
      const [nodeNum, x, y, z] = node;
      nodeIdxMap[nodeNum] = nodeIdx;
      return [x, y, z];
    });

    const facesRaw = parseFile(facesStr).splice(1);
    this.faces = facesRaw.map((face) => {
      return face
        .splice(1, 3)
        .map(nodeNum => nodeIdxMap[nodeNum]);
    });

    const elementsRaw = parseFile(elementsStr).splice(1);
    this.elements = elementsRaw.map((element) => {
      return element
        .splice(1, 4)
        .map(nodeNum => nodeIdxMap[nodeNum]);
    });
  }
}

export default TetGenMesh;
