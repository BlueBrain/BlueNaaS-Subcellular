
import lowerCase from 'lodash/lowerCase';


/**
 * Filter function to match given object properties by a string,
 * returns true if search string is empty (to match all objects
 * from collection)
 *
 * @param {String} searchStr
 * @param {Object} obj
 * @param {String[]} props
 *
 * @returns {Boolean}
 */
function objStrSearchFilter(searchStr, obj, props) {
  if (!searchStr) return true;
  return props.some(prop => lowerCase(obj[prop]).includes(lowerCase(searchStr)));
}


export default objStrSearchFilter;
