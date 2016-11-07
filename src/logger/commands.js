//this = chat

export function flush (author) {
  if (this.self.uid === author) {
    this.em.emit('chat.flush');
    this.em.emit('log', 's', 'История чата удалена');
  }
}

export function team (author) {
  let player = this.players.find(x => x.uid === author);
  if (!player) return;

  this.em.emit('fun.team', player);
}
