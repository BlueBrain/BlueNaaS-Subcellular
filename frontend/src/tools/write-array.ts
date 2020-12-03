/**
 * Writes elements from source to destination array
 *
 * @param sourceArray
 * @param destinationArray
 * @param destinationIdx
 * @param length
 */
function writeArray(
  sourceArray: any[],
  destinationArray: any[],
  destinationIdx = 0,
  length?: number,
) {
  const elementsToWrite = length || sourceArray.length;

  if (length && length > sourceArray.length) {
    throw new Error("Number of copied elements can't be more then source array length");
  }

  if (elementsToWrite > destinationArray.length - destinationIdx) {
    throw new Error('Destination array is too small to fit all copied elements');
  }

  for (let i = 0; i < elementsToWrite; i += 1) {
    destinationArray[destinationIdx + i] = sourceArray[i];
  }
}

export default writeArray;
