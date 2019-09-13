
const NUMBER_R = /[\d.]+/g;


/**
 * Parse TetGen line
 *
 * @param {String} line
 */
function parseLine(line) {
  const splitted = line.match(NUMBER_R);
  const numbers = splitted.map(parseFloat);

  return numbers;
}

/**
 * Parse TetGen text based file
 *
 * @param {String} fileContent
 */
function parseFile(fileContent) {
  const parsed = [];
  let currentIdx = 0
  let nextNewLineIdx = fileContent.indexOf('\n', currentIdx);
  while (nextNewLineIdx !== -1) {
    const line = fileContent
      .slice(currentIdx, nextNewLineIdx)
      .trim();

    currentIdx = nextNewLineIdx + 1;
    nextNewLineIdx = fileContent.indexOf('\n', currentIdx);

    if (!line.startsWith('#')) {
      parsed.push(parseLine(line));
    };
  }

  return parsed;
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
