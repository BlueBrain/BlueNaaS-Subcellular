
import eventBus from '@/services/event-bus';

import state from './state';
import getters from './getters';
import actions from './actions';


class Store {
  constructor() {
    this.state = state;
    this.eventBus = eventBus;
    this.actions = actions;
  }

  $get(property, args) {
    if (!getters[property]) throw new Error(`Store getter ${property} is not available`);

    return getters[property](this, args);
  }

  $dispatchAsync(action, payload) {
    if (!this.actions[action]) throw new Error(`Store action ${action} is not available`);

    setTimeout(() => this.actions[action](payload), 1);
  }

  $dispatch(action, payload) {
    if (!this.actions[action]) throw new Error(`Store action ${action} is not available`);

    this.actions[action](payload);
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

  $off(action, handler) {
    this.eventBus.$off(action, handler);
  }

  $once(action, handler) {
    this.eventBus.$once(action, handler);
  }
}

export default new Store();
