import isEqual from 'lodash/isEqual';

/**
 * Compare two objects by a subset of their properties
 *
 * @param {Object} o1
 * @param {Object} o2
 * @param {String[]} props List of object properties
 *
 * @returns {Boolean}
 */
function isEqualBy(o1, o2, props) {
  return props.reduce((acc, prop) => acc && isEqual(o1[prop], o2[prop]), true);
}

export default isEqualBy;
