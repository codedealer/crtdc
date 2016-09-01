import EventEmitter2 from 'eventemitter2'
let _instance;

export default class EventEmitter extends EventEmitter2.EventEmitter2 {
  constructor () {
    super({
      newListener: false,
      maxListeners: 20,
      wildcard: false
    });

    _instance = this;
  }
  addListener (event, callback) {
    if (_instance.listeners(event).findIndex(x => x === callback) !== -1) return;

    super.on(event, callback);
  }
  on (event, callback) {
    if (!Array.isArray(event)) {
      this.addListener(event, callback);
    } else {
      event.forEach(e => this.addListener(e, callback));
    }
  }
  static getInstance () { return _instance || new EventEmitter() }
}
