export default {
  buffer: [],
  length: 0,
  pointer: 0,
  turns: 0,
  populate (players) {
    this.buffer = [];
    players.forEach(player => {
      this.buffer.push(player.uid);
    });
    this.length = players.length;
    this.pointer = 0;
  },
  next () {
    let uid = this.buffer[this.pointer];
    let index = this.pointer;

    this.pointer += 1;
    this.turns += 1;
    if (this.pointer >= this.length) this.pointer = 0;
    return { uid, index }
  },
  peekUid () {
    let current = this.pointer === 0 ? this.length - 1 : this.pointer - 1;
    return this.buffer[current];
  },
  peekNext () {
    return this.buffer[this.pointer];
  },
  peekPrev () {
    let current = this.pointer === 0 ? this.length - 1 : this.pointer - 1;
    let prev = current === 0 ? this.length - 1 : current - 1;
    return this.buffer[prev];
  },
  reset () {
    this.pointer = 0;
    this.turns = 0;
  }
}
