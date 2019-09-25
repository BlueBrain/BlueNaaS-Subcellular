
function writeArrayChunk(sourceArray, destinationArray, destinationIdx) {
  for (let i = 0; i < sourceArray.length; i += 1) {
    destinationArray[destinationIdx + i] = sourceArray[i];
  }
}


export default writeArrayChunk;
