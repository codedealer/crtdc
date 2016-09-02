import {hash} from '../core/utils'

export default class Card {
  constructor (meta) {
    Object.assign(this, meta);
    this._mark = '';

    this.uid = hash(this.token + this._mark);

    Object.defineProperties(this, {
      'mark': {
        'set': function(value) {
          this.uid = hash(this.token + value);
          this._mark = value;
        },
        'get': function() {
          return this._mark;
        }
      }
    });
  }
}
