export default {
  buffer: [],
  length: 0,
  pointer: 0,
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
    if (this.pointer >= this.length) this.pointer = 0;
    return { uid, index }
  },
  peekUid () {
    let current = this.pointer === 0 ? this.length - 1 : this.pointer - 1;
    return this.buffer[current];
  },
  reset () {
    this.pointer = 0;
  }
}
