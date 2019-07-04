
import lowerCase from 'lodash/lowerCase';


/**
 * Filter function to match given or all object properties by a string,
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

  const filterProps = props.length ? props : Object.keys(obj);
  return filterProps.some(prop => lowerCase(obj[prop]).includes(lowerCase(searchStr)));
}


export default objStrSearchFilter;
