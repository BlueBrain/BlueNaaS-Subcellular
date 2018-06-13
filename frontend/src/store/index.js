
import eventBus from '@/services/event-bus';

import state from './state';
import getters from './getters';
import actions from './actions';


class Store {
  constructor() {
    this.state = state;
    this.eventBus = eventBus;
  }

  $get(property, args) {
    if (!getters[property]) throw new Error(`Store getter ${property} is not available`);

    return getters[property](this, args);
  }

  $dispatchAsync(action, payload) {
    if (!actions[action]) throw new Error(`Store action ${action} is not available`);

    setTimeout(() => actions[action](this, payload), 1);
  }

  $dispatch(action, payload) {
    if (!actions[action]) throw new Error(`Store action ${action} is not available`);

    actions[action](this, payload);
  }

  $emit(action, payload) {
    this.eventBus.$emit(action, payload);
  }

  $emitAsync(action, payload) {
    setTimeout(() => this.eventBus.$emit(action, payload), 0);
  }

  $on(action, handler) {
    this.eventBus.$on(action, handler);
  }

  $once(action, handler) {
    this.eventBus.$once(action, handler);
  }
}

export default new Store();
