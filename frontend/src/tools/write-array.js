
/**
 * Writes elements from source to destination array
 *
 * @param {Array} sourceArray
 * @param {Array} destinationArray
 * @param {Number} destinationIdx
 * @param {Number} length optional
 */
function writeArray(sourceArray, destinationArray, destinationIdx = 0, length) {
  const elementsToWrite = length || sourceArray.length;

  if (length && length > sourceArray.length) {
    throw new Error('Number of copied elements can\'t be more then source array length');
  }

  if (elementsToWrite > (destinationArray.length - destinationIdx)) {
    throw new Error('Destination array is too small to fit all copied elements');
  }

  for (let i = 0; i < elementsToWrite; i += 1) {
    destinationArray[destinationIdx + i] = sourceArray[i];
  }
}


export default writeArray;
