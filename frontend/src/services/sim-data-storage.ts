//@ts-nocheck
import get from 'lodash/get';
import set from 'lodash/set';
import noop from 'lodash/noop';

import bus from '@/services/event-bus';
import socket from '@/services/websocket';
import storage from '@/services/storage';

const MAX_INMEM_SPATIAL_STEP_TRACES = 400;

const cache = {};
const watcher = {};
const simStore = {};

function getSimStore(simId) {
  const cachedStore = simStore[simId];
  if (cachedStore) return cachedStore;

  const store = storage.createInstance({ name: `sim:${simId}` });
  simStore[simId] = store;

  return store;
}

function removeStore(simId) {
  const store = getSimStore(simId);
  delete simStore[simId];
  store.dropInstance();
}

bus.$on('ws:simLogMessage', (logMsg) => {
  if (!get(cache, `${logMsg.simId}.log.${logMsg.source}`)) {
    set(cache, `${logMsg.simId}.log.${logMsg.source}`, [logMsg.message]);
  } else {
    cache[logMsg.simId].log[logMsg.source].push(logMsg.message);
  }

  const watcherCb = get(watcher, `${logMsg.simId}.log`, noop);
  watcherCb(cache[logMsg.simId].log);
});

bus.$on('ws:simTrace', (trace) => {

  if (!get(cache, `${trace.simId}.trace`)) {
    set(cache, `${trace.simId}.trace`, trace);
  } else {

    for (const [observable, values] of Object.entries(trace.values_by_observable)) {
      const existingValues = cache[trace.simId].trace.values_by_observable[observable]
      if (existingValues) cache[trace.simId].trace.values_by_observable[observable].push(...values)
      else {
        set(cache, `${trace.simId}.trace.values_by_observable.${observable}`, values)
      }
    }
  }

  cache[trace.simId].trace.times.push(...trace.times)

  const watcherCb = get(watcher, `${trace.simId}.trace`, noop);
  watcherCb(trace);
});

bus.$on('ws:simStepTrace', (stepTrace) => {
  if (!get(cache, `${stepTrace.simId}.trace`)) {
    set(cache, `${stepTrace.simId}.trace`, {
      observables: stepTrace.observables,
      times: [stepTrace.t],
      values: [stepTrace.values],
    });
  }

  cache[stepTrace.simId].trace.times.push(stepTrace.t);
  cache[stepTrace.simId].trace.values.push(stepTrace.values);

  const watcherCb = get(watcher, `${stepTrace.simId}.trace`, noop);
  watcherCb(cache[stepTrace.simId].trace);
});

bus.$on('ws:simSpatialStepTrace', (spatialStepTrace) => {
  const { simId } = spatialStepTrace;
  _setSpatialStepTrace(spatialStepTrace);

  const store = getSimStore(simId);
  store.setItem(String(spatialStepTrace.stepIdx), spatialStepTrace);

  const watcherCb = get(watcher, `${spatialStepTrace.simId}.spatialTrace`, noop);
  watcherCb(spatialStepTrace);
});

function subscribeLogChange(simId, cb) {
  set(watcher, `${simId}.log`, cb);
}

function unsubscribeLogChange(simId) {
  if (get(watcher, `${simId}.log`)) {
    delete watcher[simId].log;
  }
}

async function getLog(simId) {
  const logRes = await socket.request('get_log', simId);
  const { log } = logRes;

  _setLog(simId, log);

  return log;
}

function subscribeTraceChange(simId, cb) {
  set(watcher, `${simId}.trace`, cb);
}

function unsubscribeTraceChange(simId) {
  if (get(watcher, `${simId}.trace`)) {
    delete watcher[simId].trace;
  }
}

async function getTrace(simId) {
  const trace = await socket.request('get_trace', simId);

  _setTrace(simId, trace);

  return trace;
}

function _getTrace(simId) {
  return get(cache, `${simId}.trace`);
}

function _setTrace(simId, trace) {
  return set(cache, `${simId}.trace`, trace);
}

function _getLog(simId) {
  get(cache, `${simId}.log`);
}

function _setLog(simId, log) {
  set(cache, `${simId}.log`, log);
}

function _getSpatialStepTrace(simId, stepIdx) {
  get(cache, `${simId}.spatialTrace.${stepIdx}`);
}

function _setSpatialStepTrace(spatialStepTrace) {
  const { simId, stepIdx } = spatialStepTrace;
  set(cache, `${simId}.spatialTrace.${stepIdx}`, spatialStepTrace);

  const idxToDelete = stepIdx - MAX_INMEM_SPATIAL_STEP_TRACES;
  if (idxToDelete >= 0 && _getSpatialStepTrace(simId, stepIdx)) {
    delete cache[simId].spatialTrace[stepIdx];
  }
}

function subscribeSpatialTraceChange(simId, cb) {
  set(watcher, `${simId}.spatialTrace`, cb);
}

function unsubscribeSpatialTraceChange(simId) {
  if (get(watcher, `${simId}.spatialTrace`)) {
    delete watcher[simId].spatialTrace;
  }
}
async function getSpatialTrace(simId) {
  return get(cache, `${simId}.spatialTrace`);
}

async function getSpatialStepTraceByIdx(simId, stepIdx) {
  const inMemoryStepTrace = _getSpatialStepTrace(simId, stepIdx);
  if (inMemoryStepTrace) return inMemoryStepTrace;

  const store = getSimStore(simId);
  const storeStepTrace = await store.getItem(String(stepIdx));
  if (storeStepTrace) {
    _setSpatialStepTrace(stepIdx, storeStepTrace);
    return storeStepTrace;
  }

  const backendStepTrace = await socket.request('get_spatial_step_trace', {
    simId,
    stepIdx,
  });
  if (backendStepTrace) {
    store.setItem(String(stepIdx), backendStepTrace);
    _setSpatialStepTrace(backendStepTrace);
    return backendStepTrace;
  }
}

async function getLastSpatialStepIdx(simId) {
  return await socket.request('get_last_spatial_step_trace_idx', { simId });
}

function unsubscribeAll(simId) {
  if (watcher[simId]) {
    delete watcher[simId];
  }
}

function unloadAll(simId) {
  if (cache[simId]) {
    delete cache[simId];
  }
}

function removeSimulation(simId) {
  unsubscribeAll(simId);

  if (cache[simId]) {
    delete cache[simId];
  }

  removeStore(simId);
}

export default {
  unsubscribeAll,
  removeSimulation,
  unloadAll,
  log: {
    get: getLog,
    subscribe: subscribeLogChange,
    unsubscribe: unsubscribeLogChange,
  },
  trace: {
    get: getTrace,
    getCached: _getTrace,
    subscribe: subscribeTraceChange,
    unsubscribe: unsubscribeTraceChange,
  },
  spatialTrace: {
    get: getSpatialTrace,
    getStepByIdx: getSpatialStepTraceByIdx,
    getLastStepIdx: getLastSpatialStepIdx,
    subscribe: subscribeSpatialTraceChange,
    unsubscribe: unsubscribeSpatialTraceChange,
  },
};
