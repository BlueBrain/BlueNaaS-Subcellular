
/**
 * Based on collecton find unique item name
 * which constists of prefix and index
 *
 * @param {Object[]} collection
 * @param {String} prefix
 *
 * @returns {String} Unique item name
 */
function findUniqName(collection, prefix) {
  let i = 0;
  const isEntityPresent = entity => entity.name === `${prefix}${i}`;
  while (collection.find(isEntityPresent)) i += 1;
  return `${prefix}${i}`;
}

export default findUniqName;
