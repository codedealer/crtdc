import GameStatus from '../world/status'
import turnQueue from './turn-queue'
import EventEmitter from '../core/eventemitter'
import * as Turns from './turns'
import Pool from './pool'
import co from 'co'

let contractorCaller = {};
let contractorCallee = {};

function preTurn () {
  this.em.on('pool.change', this.pool.onChange.bind(this.pool));
  this.pool.expectAny(this.turns.vote, 'turn', 'all').then(this.onVote.bind(this));

  this.em.emit('board.card-selector.init', this.starterPack, { dismissable: true, selectable: false }, () => { this.turns.makeVote('turn') });
  this.em.emit('gm.startdeck');
  this.em.emit('log', 's', 'Стартовая колода на столе');
}

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
    this.starterPack = starterPack;

    this.em.on('pool.history', () => {
      let history = this.pool.poolHistory.map(poolObject => {
        let obj = {
          uid: poolObject.uid,
          callee: poolObject.callee || false,
          action: poolObject.actionObject.action
        }

        if (poolObject.actionObject.args) {
          for (let [name, value] of Object.entries(poolObject.actionObject.args)) {
            obj[name] = value;
          }
        }

        return obj;
      });

      console.table(history);
    });

    for (let [index, turn] of Object.entries(Turns)) {
      this.turns[index] = turn.bind(this);
    }

    this.queue.populate(players);

    if (turn === GameStatus.PREGAME) {
      this.em.once('board.card-selector.ready', preTurn.bind(this));

      this.dealStarterPack(players, starterPack);
      this.queue.reset();
    }
  },
  reset (turn, pool, players, selfUid, starterPack) {
    this.players = players;
    this.self = players.find(x => x.uid === selfUid);
    this.pool.pool = pool;
    this.queue.populate(players);
    this.starterPack = starterPack;

    preTurn.call(this);

    this.dealStarterPack(players, starterPack);
    this.queue.reset();
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
    this.queue.reset();
    this.pool.resetHistory();
    this.em.emit('gm.restart', this.self);
  },
  onVote (funcName) {
    this.em.removeAllListeners('pool.change');
    if (typeof this[funcName] === 'function') this[funcName]();
    else console.error(`${funcName} was supplied after turn`);
  },
  isCaller () { return this.queue.peekUid() === this.self.uid },
  find (uid) { return this.players.find(x => x.uid === uid) },
  getContractorsFromPool (flushCache = false, action = 'trade') {
    if (flushCache === true) {
      let caller = {};
      let callee = {};

      for (let [uid, actionObject] of Object.entries(this.pool.pool)) {
        if (actionObject.action === action) {
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
