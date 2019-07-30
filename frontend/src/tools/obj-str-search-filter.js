
import lowerCase from 'lodash/lowerCase';


/**
 * Filter function to match given or all object properties
 * including nested onesby a string,
 * returns true if search string is empty (to match all objects
 * from collection)
 *
 * @param {String} searchStr
 * @param {Object} obj
 * @param {String[]} props
 *
 * @returns {Boolean}
 */
function objStrSearchFilter(searchStr, obj, props = []) {
  if (!searchStr) return true;

  const searchStrNorm = lowerCase(searchStr);
  const filterProps = props.length ? props : Object.keys(obj);

  const fFunc = (prop) => {
    const propVal = obj[prop];
    return typeof(propVal) === 'string'
      ? lowerCase(propVal).includes(searchStrNorm)
      : objStrSearchFilter(searchStrNorm, propVal);
  }

  return filterProps.some(fFunc);
}


export default objStrSearchFilter;
