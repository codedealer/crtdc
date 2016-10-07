import GameStatus from '../world/status'
import turnQueue from './turn-queue'
import EventEmitter from '../core/eventemitter'
import * as Turns from './turns'
import Pool from './pool'
import co from 'co'

let contractorCaller = {};
let contractorCallee = {};

export default {
  queue: {},
  pool: null,
  em: EventEmitter.getInstance(),
  self: {},
  players: [],
  turns: {},
  init (turn, pool, players, selfUid, starterPack) {
    this.queue = turnQueue;
    this.self = players.find(x => x.uid === selfUid);
    this.players = players;
    this.pool = new Pool(pool, this.em, this.self);

    for (let [index, turn] of Object.entries(Turns)) {
      this.turns[index] = turn.bind(this);
    }

    this.queue.populate(players);

    if (turn === GameStatus.PREGAME) {
      this.em.once('board.card-selector.ready', () => {
        this.em.on('pool.change', this.pool.onChange.bind(this.pool));
        this.pool.expectAny(this.turns.vote, 'turn', 'all').then(this.onVote.bind(this));

        this.em.emit('board.card-selector.init', starterPack, { dismissable: true, selectable: false }, () => { this.turns.makeVote('turn') });
        this.em.emit('log', 's', 'Стартовая колода на столе');
      });

      this.dealStarterPack(players, starterPack);
      this.queue.reset();
    }
  },
  dealStarterPack (players, deck) {
    deck.forEach(card => {
      players[this.queue.next().index].hand.push(card);
    });
  },
  // every turn starts with sync
  // then action is decided and excuted synchronously
  // every turn ends with vote
  turn (keepPool = false) {
    co(function* () {
      let queueInfo = this.queue.next();

      yield this.pool.reset(keepPool);

      this.em.emit('turn.new', queueInfo);
      this.em.on('pool.change', this.pool.onChange.bind(this.pool));
      let poolObject;

      if (this.isCaller()) {
        this.em.emit('gm.sync', {turn: queueInfo.index});

        let action = yield this.turns.once('turn.action');

        if (!this.turns[action]) throw 'Unsupported action';

        poolObject = yield this.turns.updatePool(action, false, false);
      } else {
        poolObject = yield this.pool.expect(queueInfo.uid);
      }

      return yield * this.turns[poolObject.actionObject.action]();
    }.bind(this))
      .then(this.onVote.bind(this))
      .catch(err => console.error(err))
      ;
  },
  finish () {
    this.em.emit('log', 's', '-----THAT\'S ALL FOLKS-----');
  },
  onVote (funcName) {
    this.em.removeAllListeners('pool.change');
    if (typeof this[funcName] === 'function') this[funcName]();
  },
  isCaller () { return this.queue.peekUid() === this.self.uid },
  find (uid) { return this.players.find(x => x.uid === uid) },
  getContractorsFromPool (flushCache = false) {
    if (flushCache === true) {
      let caller = {};
      let callee = {};

      for (let [uid, actionObject] of Object.entries(this.pool.pool)) {
        if (actionObject.action === 'trade') {
          caller = this.find(uid);
          callee = this.find(actionObject.callee);
          break;
        }
      }

      contractorCaller = caller;
      contractorCallee = callee;

      return {caller, callee};
    }

    return {caller: contractorCaller, callee: contractorCallee};
  }
}
