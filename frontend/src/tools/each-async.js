
function eachAsync(
  array,
  iterateeFunc,
  filterPredicate = () => true,
  timeout = 0,
  syncChunkSize = 4,
) {
  const finished = new Promise((resolve) => {
    let itemIndex = 0;
    let iterationIndex = 0;

    const arrayLength = array.length;

    const runIteration = () => {
      iterateeFunc(array[itemIndex], itemIndex);

      itemIndex += 1;
      while (itemIndex < arrayLength && !filterPredicate(array[itemIndex])) itemIndex += 1;

      if (itemIndex >= arrayLength) {
        resolve();
        return;
      }

      iterationIndex += 1;
      if (iterationIndex % syncChunkSize) {
        runIteration();
      } else {
        setTimeout(runIteration, timeout);
      }
    };

    runIteration();
  });

  return finished;
}

export default eachAsync;
