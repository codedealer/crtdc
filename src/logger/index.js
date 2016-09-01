function messageFactory(message, cssClass = '') {
  return {
    cssClass,
    message
  }
}

import Vue from 'vue';

export default class Logger {
  constructor (channel) {
    if (Logger.prototype._Instance) return Logger.prototype._Instance;

    Logger.prototype._Instance = this;

    this.channel = channel;
  }
  message (message, cssClass) {
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
    this.message(message, 'game');
  }
  se (message) {
    this.message(message, 'self');
  }
  a (message) {
    this.message(message, 'attention');
  }
  onEvent (funcName, ...args) {
    if (!typeof this[funcName] === 'function') return;

    this[funcName](...args);
  }
}
