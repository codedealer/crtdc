import Server from '../core/server'
import EventEmitter from '../core/eventemitter'
import Player from '../player'
import rulecoordinator from './rulecoordinator'
import Status from '../player/status'
import GameStatus from './status'
import settings from './settings'
import Timer from './timer'
import {seed} from '../core/utils'

export default class World {
  constructor (user) {
    this.name = 'echo';
    this.updated = null;
    this.em = EventEmitter.getInstance();
    this.server = Server.getInstance();
    this.user = user;
    this.players = [];
    this.started = false;
    this.status = GameStatus.PREJOIN;

    this.settings = settings;

    this.em.on('sv.player_join', this.onJoin.bind(this));
    this.em.on('sv.player_status', this.onPlayerStatusChange.bind(this));
    this.em.on('sv.player_leave', this.onLeave.bind(this));

    this.em.on(['sv.player_join', 'sv.player_status', 'sv.player_leave'], this.onPlayersReadyChange.bind(this))

    this.em.on('self.player_ready', this.onSelfReady.bind(this));

    this.server.gameExists(this.name).then(snapshot => {
      if (snapshot.exists()) {
        this.em.on('sv.game_update_date', this.onUpdatedDate.bind(this));
        this.server.joinSimple(this.user, this.name);
      } else {
        throw 'Game is not found'
      }
    });
  }
  startGame () {
    this.em.emit('log', 'g', 'Игра начинается');

    //host sends data to server and then syncs with everyone else
    //sync is taking place in onUpdatedDate event
    this.server.isSelfHost(this.user, this.name).then(function(isHost) {
      this.host = isHost;

      if (!isHost) return;

      this.seed = seed();

      let allowedPlayers = this.players.filter(x => x.status === Status.READY).slice(0, this.settings.PLAYERS_MAX);

      let pool = {};

      allowedPlayers.forEach(player => { pool[player.uid] = { action: false, callee: false, args: false } });

      let gameObject = {
        seed: this.seed,
        started: false,
        status: GameStatus.INGAME,
        turn: GameStatus.PREGAME,
        players: rulecoordinator.init(this.seed, allowedPlayers),
        deck: rulecoordinator.prepDeck(this.seed, allowedPlayers).rest,
        pool
      }

      this.server.startGame(gameObject, this.name);
    }.bind(this));
  }
  onJoin (uid, status) {
    if (this.players.findIndex(x => x.uid === uid) === -1) this.players.push(new Player(uid, status));
    else return;

    if (uid === this.user.uid) {
      this.status = GameStatus.WAIT;
    }
  }
  onLeave (uid) {
    //TO DO: Counter measures against timeout
    this.players = this.players.filter(item => { return uid !== item.uid; });
    if (uid === this.user.uid) this.em.emit('log', 's', 'Вы в оффлайн режиме');
  }
  onSelfReady (ready) {
    let onlineStatus = ready ? Status.READY : Status.IDLE;

    this.server.changePlayerStatus(onlineStatus, this.user.uid, this.name);
  }
  onPlayerStatusChange (uid, status) {
    this.players = this.players.map(item => {
      if (item.uid !== uid) return item;

      item.status = status;
      return item;
    });
  }
  onPlayersReadyChange () {
    if (this.started) return;

    //this should be later changed to better reflect game start logic
    if (this.players.every(player => player.status === Status.READY) &&
        this.players.length >= this.settings.PLAYERS_MIN) {
      let time = this.players.length === this.settings.PLAYERS_MAX
                                    ? this.settings.PREGAME_WAIT_MIN
                                    : this.settings.PREGAME_WAIT_MAX;

      this.timer = new Timer(time, (time) => { time /= 1000; this.em.emit('log', 'g', `Игра начнется через ${time} ...`) }, () => this.startGame(), this);
    } else if (this.timer && !this.timer.ended) {
      this.timer.cancel();
    }
  }
  onUpdatedDate (date) {
    if (this.updated === null) {
      this.updated = date;
      return;
    }

    if (this.updated === date) return;

    //at this point the game has just started or resumed after pause
    this.updated = date;

    this.server.getGameObject(this.name).then(gameObject => {
      this.status = GameStatus.INGAME;
      this.seed = gameObject.seed;
      this.players = rulecoordinator.sync(gameObject);

      rulecoordinator.load(gameObject, this.players, this.user.uid);

      this.em.on('pool.write', this.pubToPool.bind(this));
      this.em.on('gm.sync', this.syncGame.bind(this));
      this.em.on('gm.get_token', (player) => {
        if (rulecoordinator.canGiveToken()) {
          this.em.emit('gm.sync', {tokens: player.tokens + 1}, `profiles/${player.uid}`);
        }
      });
      this.em.on('gm.sync.known', player => {
        let knownSyncObj = {};
        player.known.forEach(x => { knownSyncObj[x.uid] = true; });
        this.em.emit('gm.sync', { known: knownSyncObj }, `profiles/${player.uid}`);
      });
      this.em.on('deck.draw', player => {
        let card = rulecoordinator.deck.draw();
        if (card === false) return; //should emit anyway bc others expect event

        player.hand.push(card);
        this.em.emit('deck.card.got', card, player);
      });
      this.em.on('gm.hand_limit.check', () => {
        this.em.emit('gm.hand_limit.result', rulecoordinator.checkHandLimit(this.players));
      });

      this.em.on('duel.spend_token', player => {
        this.em.emit('gm.sync', {tokens: player.tokens - 1}, `profiles/${player.uid}`);
      });

      this.em.on('gm.try_win', (playersToWin, winParty) => {
        this.em.emit('gm.game_result', rulecoordinator.isWin(this.players, playersToWin, winParty));
      });

      this.em.on('sv.profile.change', (uid, data) => {
        let player = this.players.find(x => x.uid === uid)
        if (player.tokens < data.tokens) {
          rulecoordinator.tokens--;
          player.tokens = data.tokens;
          this.em.emit('gm.got_token', player);
        } else if (player.tokens > data.tokens) {
          rulecoordinator.tokens++;
          player.tokens = data.tokens;
          this.em.emit('duel.spent_token', player);
        }
      });

      this.server.subToPool(this.name);
      this.server.subToProfiles(this.name);

      this.started = true;

      this.em.emit('gm.start', this.players);
    });
  }
  pubToPool (...args) {
    args.unshift(this.name);
    this.server.pubToPool(...args)
               .then(() => { this.em.emit('pool.written') });
  }
  syncGame(...args) {
    args.unshift(this.name);
    this.server.syncGameObject(...args)
        .then(() => { this.em.emit('gm.synced') });
  }
}
