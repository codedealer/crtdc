function messageFactory(message, cssClass = '', sanitize = false) {
  return {
    cssClass,
    message,
    sanitize
  }
}

import Vue from 'vue';
import Filter from './filter'

export default class Logger {
  constructor (channel) {
    if (Logger.prototype._Instance) return Logger.prototype._Instance;

    Logger.prototype._Instance = this;

    this.channel = channel;
    this.filter = new Filter();
  }
  message (message, cssClass, useFilter = false) {
    if (useFilter) message = this.filter.filter(message);

    this.channel.push(messageFactory(message, cssClass));

    Vue.nextTick(() => {
      let chat = document.getElementsByClassName('chat-message-box')[0];
      chat.scrollTop = chat.scrollHeight;
    });
  }
  s (message) {
    this.message(message, 'system');
  }
  g (message) {
    this.message(message, 'game', true);
  }
  se (message) {
    this.message(message, 'self', true);
  }
  a (message) {
    this.message(message, 'attention');
  }
  onEvent (funcName, ...args) {
    if (!typeof this[funcName] === 'function') return;

    this[funcName](...args);
  }
}
