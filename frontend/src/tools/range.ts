/**
 * Generate a sequence of numbers
 * @param {Number} start
 * @param {Number} end
 */
function range(start: number, end: number) {
  const length = end - start
  return Array.from({ length }, (_, i) => start + i)
}

export default range
