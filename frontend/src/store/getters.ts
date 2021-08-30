const collectionNames = [
  'structures',
  'molecules',
  'species',
  'reactions',
  'diffusions',
  'functions',
  'observables',
  'parameters',
];

export default {
  queryResultVersions: (state) => {
    if (!state.repoQueryResult) return [];

    const versionMap = new Map();

    collectionNames.forEach((collName) => {
      state.repoQueryResult[collName].forEach((entity) => {
        const key = `${entity.branch}:${entity.rev}`;
        if (!versionMap.has(key)) {
          const version = {
            key,
            branch: entity.branch,
            revision: entity.rev,
          };
          versionMap.set(key, version);
        }
      });
    });

    return Array.from(versionMap.values());
  },
  revisionSources: (state) => {
    const sourceSet = new Set();

    collectionNames.forEach((collName) => {
      state.revision[collName].forEach((entity) => {
        sourceSet.add(entity.source);
      });
    });

    return Array.from(sourceSet.values());
  },
};
