
import first from 'lodash/first';

export default function majorProteinName(proteinNames) {
  if (!proteinNames) return '';

  return first(proteinNames.split(';'));
}
