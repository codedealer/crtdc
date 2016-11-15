//this = chat
import characters from '../cards/characters.json'
import {setAuthorName} from '../core/utils'

export function flush (author) {
  if (this.self.uid === author) {
    this.em.emit('chat.flush');
    this.em.emit('log', 's', 'История чата удалена');
  }
}

export function uid (author) {
  let svMessageObject = { author };

  setAuthorName(svMessageObject, this.players, this.self);

  this.em.emit('log', 'a', `${svMessageObject.author}: ${author}`);
}

export function team (author) {
  let player = this.players.find(x => x.uid === author);
  if (!player) return;

  this.em.emit('fun.team', player);
}

export function character (author, ...args) {
  let target, newCharacter;

  if (args.length === 0) {
    if (author === this.self.uid) this.em.emit('log', 'a', 'Команда задана неправильно');
    return;
  }

  target = this.players.find(x => {
    if (args.length === 1) return x.uid === author;
    else return (x.character.name === args[0] || x.character.imgClass === args[0]);
  });

  if (!target) {
    if (author === this.self.uid) this.em.emit('log', 'a', 'Заданный игрок не найден');
    return;
  }

  let criteria = args.length === 1 ? args[0] : args[1];
  newCharacter = characters.find(x => x.name === criteria || x.imgClass === criteria);

  if (!newCharacter) {
    if (author === this.self.uid) this.em.emit('log', 'a', 'Требуемый персонаж не найден');
    return;
  }

  if (this.players.find(x => x.character.name === newCharacter.name)) {
    if (author === this.self.uid) this.em.emit('log', 'a', 'Требуемый персонаж занят');
    return;
  }

  target.character = newCharacter;
  if (target.uid === this.self.uid) {
    this.em.emit('gm.sync', {character: newCharacter.imgClass}, `profiles/${target.uid}`);
  }
}

export function history (author) {
  if (this.self.uid === author) {
    this.em.emit('pool.history');
    this.em.emit('log', 's', 'История пула в консоли');
  }
}
