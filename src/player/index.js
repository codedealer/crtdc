import Status from './status'

export default class Player {
  constructor (uid, status = Status.IDLE, character = false) {
    this.uid = uid;
    this.status = status;
    if (character) this.character = character;
  }
}
