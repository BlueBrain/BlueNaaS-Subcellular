/**
 * Generate a sequence of numbers
 * @param {Number} start
 * @param {Number} end
 */
function range(start, end) {
  const length = end - start
  return Array.from({ length }, (_, i) => start + i)
}

export default range
