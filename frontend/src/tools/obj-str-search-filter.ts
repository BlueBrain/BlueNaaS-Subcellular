import lowerCase from 'lodash/lowerCase'

/**
 * Filter function to match given, excluding or all object properties
 * including nested ones by a string,
 * returns true if search string is empty (to match all objects
 * from collection)
 *
 * @param {String} searchStr
 * @param {Object} obj
 * @param {String[]} props
 *
 * @returns {Boolean}
 */
function objStrSearchFilter(searchStr, obj, { include, exclude }: { include?: string[]; exclude?: string[] } = {}) {
  if (!searchStr) return true

  const searchStrNorm = lowerCase(searchStr)

  const props = Object.keys(obj)
    .filter((prop) => (include ? include.includes(prop) : true))
    .filter((prop) => (exclude ? !exclude.includes(prop) : true))

  const fFunc = (prop) => {
    const propVal = obj[prop]
    return typeof propVal === 'string' ? lowerCase(propVal).includes(searchStrNorm) : false
  }

  return props.some(fFunc)
}

export default objStrSearchFilter
