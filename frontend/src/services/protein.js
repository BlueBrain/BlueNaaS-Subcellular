
import cellProteins from '@/data/cell_proteins.json';
import synProteinsAll from '@/data/syn_proteins.json';

function getProteinList(excSyn) {
  const synProteins = synProteinsAll.map(p => Object.assign(p, { psd: p[`psd${excSyn ? 'exc' : 'inh'}`] }));
  const proteins = synProteins.concat(cellProteins);
  return proteins;
}

export default {
  getProteinList,
};
