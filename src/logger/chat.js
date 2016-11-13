import config from '../server-config/chat-config.json'
import firebase from 'firebase'
import {stripChar, cutUid} from '../core/utils'
import watchDog from './watch-dog'
import * as commands from './commands'

function setAuthorName (svMessageObject, players, self) {
  if (!self) throw new Error('Chat has no user defined');

  let player = players.find(x => x.uid === svMessageObject.author);
  let isSelf = svMessageObject.author === self.uid;

  if (player && player.character) {
    svMessageObject.author = player.character.name;
  } else {
    svMessageObject.author = cutUid(svMessageObject.author);
  }

  if (isSelf) {
    svMessageObject.author = `<span class="self">${svMessageObject.author}</span>`;
  }
}

export default class {
  constructor (em, self) {
    let app = firebase.initializeApp(config, 'chat');

    this.em = em;
    this.self = self;
    this.db = firebase.database(app);
    this.players = [];
    this.watchDog = watchDog;
    this.flushOnConnect = false;

    this.em.on('gm.user.join', gameName => this.connect(gameName));
    this.em.on('chat.flush', () => {
      if (!this.roomRef) return;

      this.roomRef.set(true);
    });
    this.em.on('chat.flush.deferred', () => {
      this.flushOnConnect = true;
    });
  }
  connect (gameName) {
    this.roomName = `${gameName}_chat`;
    this.roomRef = this.db.ref(this.roomName);

    if (this.flushOnConnect) this.roomRef.set(true);

    this.roomRef.limitToLast(1).on('child_added', this.onMessageReceive, this);
  }
  onMessageReceive (snapshot) {
    let svMessageObject = snapshot.val();

    //system command
    if (svMessageObject.msg[0] === '/') {
      let commandArr = svMessageObject.msg.substr(1).match(/\b\w{1,20}\b/g);
      let command = commandArr.length > 0 ? commandArr[0] : false;

      if (command === false || !commands.hasOwnProperty(command)) return;

      commandArr.splice(0, 1, svMessageObject.author);
      return commands[command].call(this, ...commandArr);
    }

    setAuthorName(svMessageObject, this.players, this.self);

    this.em.emit('log', 'u', `${svMessageObject.author}: ${svMessageObject.msg}`);
  }
  send (msg) {
    if (!this.watchDog.guard()) return;

    let sanitizedMsg = stripChar(msg);

    let svMessageObject = this.svMessageObjectFactory(sanitizedMsg);
    if (svMessageObject === false) return;

    this.roomRef.push(svMessageObject);
  }
  svMessageObjectFactory (msg) {
    if (!this.self) return false;

    let author = this.self.uid;

    return { author, msg };
  }
  setPlayers (players) {
    this.players = players;
    this.self = players.find(x => x.uid === this.self.uid);
  }
}
