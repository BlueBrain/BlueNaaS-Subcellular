/**
 * Based on an array of  find unique item name
 * which constists of prefix and index
 */
function findUniqName(array: { name: string }[], prefix: string) {
  const regex = new RegExp(`${prefix}[0-9]+`)
  const n = array.filter((e) => !!e.name.match(regex))
  return `${prefix}${n.length}`
}

export default findUniqName
