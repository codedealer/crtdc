import Server from './server'
import store from './store'

export default class User {
  constructor () {
    if (!store.enabled) {
      throw 'localStorage is disabled. Please turn off private mode to use this app';
    }

    let storedMeta = store.get('user-meta');

    if (storedMeta && storedMeta.uid) {
      this.meta = storedMeta;
    } else {
      this.meta = Server.getInstance().createUser();
      store.set('user-meta', this.meta);
    }

    Object.defineProperties(this, {
      'uid': {
        'get': function() {
          if (this.meta && this.meta.uid) return this.meta.uid;
          return null;
        }
      }
    });
  }
}
