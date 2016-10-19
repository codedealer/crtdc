import turnQueue from './turn-queue'

export default class {
  constructor (obj, em, self) {
    this.pool = obj;
    this.em = em;
    this.self = self;
  }
  reset (keepPool) {
    return new Promise((resolve, reject) => {
      if (keepPool) return resolve();

      for (let i of Object.keys(this.pool)) {
        this.pool[i] = {
          action: false,
          callee: false,
          args: false
        }
      }

      if (turnQueue.peekUid() === this.self.uid) {
        this.em.once('gm.synced', () => resolve());
        this.em.emit('gm.sync', {pool: this.pool});
      } else {
        resolve();
      }
    });
  }
  onChange (uid, actionObject) {
    if (!this.pool.hasOwnProperty(uid)) throw new Error(`Unexpected player ${uid}`);

    this.pool[uid] = actionObject;
    if (actionObject.action !== false) {
      //this is bad
      if (actionObject.action.split('.')[0] === 'occupation') {
        this.em.emit('pool.read.occupation', {uid, actionObject});
      } else {
        this.em.emit('pool.read', {uid, actionObject});
      }
    }
  }
  expect (from = false) {
    return new Promise((resolve, reject) => {
      this.em.once('pool.read', ({uid, actionObject}) => {
        if (from === uid || from === false) {
          resolve({uid, actionObject});
        }
      });
    });
  }
  expectOccupation () {
    return new Promise((resolve, reject) => {
      this.em.once('pool.read.occupation', ({uid, actionObject}) => {
        resolve({uid, actionObject});
      });
    });
  }
  expectAny (cb, ...args) {
    return new Promise((resolve, reject) => {
      //try to resolve immediatly
      let result = cb({}, ...args);

      if (result !== false) return resolve(result);

      this.em.on('pool.read', poolObject => {
        let result = cb(poolObject, ...args);
        if (result !== false) {
          this.em.removeAllListeners('pool.read'); //cleanup
          resolve(result);
        }
      });
    });
  }
}
