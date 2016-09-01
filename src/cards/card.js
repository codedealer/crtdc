import {hash} from '../core/utils'

export default class Card {
  constructor (meta) {
    this.name = meta.name;
    this.description = meta.description;
    this.token = meta.token;
    this._mark = '';

    this.winnable = false;
    this.battle = false;
    this.special = false;

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
