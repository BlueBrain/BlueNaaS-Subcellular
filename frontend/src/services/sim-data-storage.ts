//@ts-nocheck
import get from 'lodash/get'
import set from 'lodash/set'
import noop from 'lodash/noop'

import bus from '@/services/event-bus'
import socket from '@/services/websocket'
import storage from '@/services/storage'

const cache = {}
const watcher = {}
const simStore = {}

function getSimStore(simId: str) {
  const cachedStore = simStore[simId]
  if (cachedStore) return cachedStore

  const store = storage.createInstance({ name: `sim:${simId}` })
  simStore[simId] = store

  return store
}

bus.$on('ws:simLogMessage', (logMsg: {}) => {
  if (!get(cache, `${logMsg.simId}.log.${logMsg.source}`)) {
    set(cache, `${logMsg.simId}.log.${logMsg.source}`, [logMsg.message])
  } else {
    cache[logMsg.simId].log[logMsg.source].push(logMsg.message)
  }

  const watcherCb = get(watcher, `${logMsg.simId}.log`, noop)
  watcherCb(cache[logMsg.simId].log)
})

bus.$on('ws:simTrace', (trace: SimTrace) => {
  if (!get(cache, `${trace.simId}.trace`)) {
    set(cache, `${trace.simId}.trace`, trace)
  } else {
    // eslint-disable-next-line
    for (const [observable, values] of Object.entries(trace.values_by_observable)) {
      const existingValues = cache[trace.simId].trace.values_by_observable[observable]
      if (existingValues) cache[trace.simId].trace.values_by_observable[observable].push(...values)
      else {
        set(cache, `${trace.simId}.trace.values_by_observable.${observable}`, values)
      }
    }
    cache[trace.simId].trace.times.push(...trace.times)
  }

  const watcherCb = get(watcher, `${trace.simId}.trace`, noop)
  watcherCb(trace)
})

bus.$on('ws:simStepTrace', (stepTrace: {}) => {
  if (!get(cache, `${stepTrace.simId}.trace`)) {
    set(cache, `${stepTrace.simId}.trace`, {
      observables: stepTrace.observables,
      times: [stepTrace.t],
      values: [stepTrace.values],
    })
  }

  cache[stepTrace.simId].trace.times.push(stepTrace.t)
  cache[stepTrace.simId].trace.values.push(stepTrace.values)

  const watcherCb = get(watcher, `${stepTrace.simId}.trace`, noop)
  watcherCb(cache[stepTrace.simId].trace)
})

bus.$on('ws:simSpatialStepTrace', (spatialStepTrace: {}) => {
  const { simId } = spatialStepTrace

  const store = getSimStore(simId)
  store.setItem(String(spatialStepTrace.stepIdx), spatialStepTrace)

  const watcherCb = get(watcher, `${spatialStepTrace.simId}.spatialTrace`, noop)
  watcherCb(spatialStepTrace)
})

export function subscribeLog(simId: str, cb: () => any) {
  set(watcher, `${simId}.log`, cb)
}

export function unsubscribeLog(simId: str) {
  if (get(watcher, `${simId}.log`)) {
    delete watcher[simId].log
  }
}

export async function requestLog(simId: str) {
  const logRes = await socket.request('get_log', simId)
  const { log } = logRes

  set(cache, `${simId}.log`, log)

  return log
}

export function subscribeTrace(simId: str, cb: () => any) {
  set(watcher, `${simId}.trace`, cb)
}

export function unsubscribeTrace(simId: str) {
  if (get(watcher, `${simId}.trace`)) {
    delete watcher[simId].trace
  }
}

export async function requestTrace(simId: str) {
  const trace = await socket.request('get_trace', simId)

  set(cache, `${simId}.trace`, trace)

  return trace
}

export function getTrace(simId: str) {
  return get(cache, `${simId}.trace`)
}

export function subscribeSpatialTrace(simId: str, cb: () => any) {
  set(watcher, `${simId}.spatialTrace`, cb)
}

export function unsubscribeSpatialTrace(simId: str) {
  if (get(watcher, `${simId}.spatialTrace`)) {
    delete watcher[simId].spatialTrace
  }
}

export async function getSpatialStepTraceByIdx(simId: str, stepIdx: number) {
  const store = getSimStore(simId)
  const storeStepTrace = await store.getItem(String(stepIdx))
  if (storeStepTrace) return storeStepTrace

  const backendStepTrace = await socket.request('get_spatial_step_trace', {
    simId,
    stepIdx,
  })

  if (backendStepTrace) {
    store.setItem(String(stepIdx), backendStepTrace)
    return backendStepTrace
  }
}

export async function getLastSpatialStepIdx(simId: str) {
  return socket.request('get_last_spatial_step_trace_idx', { simId })
}

export function removeSimulation(simId: str) {
  delete watcher[simId]

  if (cache[simId]) {
    delete cache[simId]
  }

  const store = getSimStore(simId)
  delete simStore[simId]
  store.dropInstance()
}
