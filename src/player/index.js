import Status from './status'
// import {brotherhood} from '../cards/allegiance'
// import {diplomat} from '../cards/occupations'
// import characters from '../cards/characters.json'

export default class Player {
  constructor (uid, status = Status.IDLE) {
    this.uid = uid;
    this.status = status;
    // this.occupation = Object.assign({}, diplomat);
    // this.allegiance = Object.assign({}, brotherhood);
    // this.hand = [];
    // this.tokens = 0;
    // this.known = [];
    // this.character = characters[0];
  }
}
