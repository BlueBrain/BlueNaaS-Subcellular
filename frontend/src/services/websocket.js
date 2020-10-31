import get from 'lodash/get'

import config from '@/config'
import eventBus from './event-bus'
import store from '@/store'

const socketState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

const reconnectTimeout = 2000

/**
 * Replacer function for JSON.stringify to produce JSON arrays from typed arrays
 * instead of objects (which is default behaviour)
 *
 * @param {String} key
 * @param {*} value
 */
function stringifyReplacer(key, value) {
  const convertToArrayCtors = [
    Float32Array,
    Float64Array,
    Uint8Array,
    Int8Array,
    Uint16Array,
    Int16Array,
    Uint32Array,
    Int32Array,
  ]
  if (value && convertToArrayCtors.includes(value.constructor)) {
    return Array.from(value)
  }

  return value
}

function getSocketUrlFromConfig(conf) {
  const { location } = window

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = get(conf, 'server.host', location.host)
  const port = get(conf, 'server.port', '')

  const socketUrl = `${protocol}//${host}:${port}/ws`

  return socketUrl
}

class Ws {
  constructor() {
    this.cmdId = 0
    this.messageQueue = []
    this.requestResolvers = new Map()
    this.socket = null
    this.userId = null
  }

  send(message, data, cmdId = null) {
    if (!this.socket) {
      this.messageQueue.push([message, data, cmdId])
      return
    }

    switch (this.socket.readyState) {
      case socketState.OPEN: {
        this.socket.send(
          JSON.stringify(
            {
              data,
              cmd: message,
              cmdid: cmdId,
              timestamp: Date.now(),
            },
            stringifyReplacer
          )
        )
        break
      }
      case socketState.CONNECTING:
      case socketState.CLOSING:
      case socketState.CLOSED:
      default: {
        this.messageQueue.push([message, data, cmdId])
        break
      }
    }
  }

  async request(message, data) {
    this.cmdId += 1
    const currentCmdId = this.cmdId

    const response = new Promise((resolve) => {
      this.requestResolvers.set(currentCmdId, resolve)
    })
    this.send(message, data, currentCmdId)
    return response
  }

  init() {
    const socketUrl = `${getSocketUrlFromConfig(config)}?userId=${this.userId}`
    this.socket = new WebSocket(socketUrl)

    this.socket.addEventListener('open', () => this.processQueue())
    this.socket.addEventListener('error', (e) => console.error(e))
    this.socket.addEventListener('close', () => this.reconnect())

    this.socket.addEventListener('message', (e) => {
      const message = JSON.parse(e.data)

      const cmdId = message.cmdid
      if (cmdId) {
        const requestResolver = this.requestResolvers.get(cmdId)
        requestResolver(message.data)
        this.requestResolvers.delete(cmdId)
        return
      }

      eventBus.$emit(`ws:${message.cmd}`, message.data)
    })
  }

  reconnect() {
    setTimeout(() => this.init(), reconnectTimeout)
  }

  processQueue() {
    let queueLength = this.messageQueue.length
    while (queueLength) {
      queueLength -= 1
      const message = this.messageQueue.shift()
      this.send(...message)
    }
  }
}

export default new Ws()
