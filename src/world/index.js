import Server from '../core/server'
import EventEmitter from '../core/eventemitter'
import Player from '../player'
import rulecoordinator from './rulecoordinator'
import turncoordinator from '../turn/turncoordinator'
import Status from '../player/status'
import GameStatus from './status'
import settings from './settings'
import Timer from './timer'
import {seed, cutUid} from '../core/utils'
import * as occupations from '../cards/occupations'

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

    this.status = GameStatus.INGAME;

    //host sends data to server and then syncs with everyone else
    //sync is taking place in onUpdatedDate event
    this.server.isSelfHost(this.user, this.name).then(function(isHost) {
      this.host = isHost;

      if (!isHost) return;

      this.seed = seed();

      let allowedPlayers = this.players.filter(x => x.status === Status.READY).slice(0, this.settings.PLAYERS_MAX);

      let pool = {};

      allowedPlayers.forEach(player => {
        pool[player.uid] = {
          action: false,
          callee: false,
          args: false
        }

        player.status = Status.INGAME;
      });

      let gameObject = {
        seed: this.seed,
        started: false,
        status: GameStatus.INGAME,
        turn: GameStatus.PREGAME,
        players: rulecoordinator.init(this.seed, allowedPlayers),
        deck: rulecoordinator.prepDeck(this.seed, allowedPlayers).rest,
        occupationPool: rulecoordinator.occupationPool,
        pool
      }

      this.server.startGame(gameObject, this.name);
    }.bind(this));
  }
  onJoin (uid, status) {
    if (this.players.findIndex(x => x.uid === uid) === -1) this.players.push(new Player(uid, status));
    else return;

    if (uid === this.user.uid) {
      this.em.emit('gm.user.join', this.name);
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
  onPlayersReadyChange (uid, status = false) {
    if (this.status === GameStatus.INGAME || status === Status.INGAME) return;
    console.log(this.status, this.players);
    if (this.status === GameStatus.FINISHED) {
      let playersToRestart = 0;
      let firstToPropose;

      this.players.forEach(player => {
        if (player.status === Status.READY) {
          playersToRestart++;
          firstToPropose = player;
        }
      });

      if (playersToRestart === 1) {
        let name = firstToPropose.character
                 ? firstToPropose.character.name
                 : cutUid(firstToPropose.uid)
                 ;
        this.em.emit('log', 'a', `${name} предлагает сыграть еще раз`);
      }

      if (playersToRestart === this.players.length) this.recurring = true;
    }

    if (this.started && !this.recurring) return;

    if ((this.recurring || this.players.every(player => player.status === Status.READY)) &&
        this.players.length >= this.settings.PLAYERS_MIN) {
      let time = this.players.length === this.settings.PLAYERS_MAX
                                    ? this.settings.PREGAME_WAIT_MIN
                                    : this.settings.PREGAME_WAIT_MAX;

      this.timer = new Timer(time,
        (time) => { time /= 1000; this.em.emit('log', 'g', `Игра начнется через ${time} ...`) },
        () => this.startGame(), this);
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
      this.seed = gameObject.seed;
      this.players = rulecoordinator.sync(gameObject);

      rulecoordinator.load(gameObject, this.players, this.user.uid, this.started);

      this.recurring = false;

      if (!this.started) {
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
        this.em.on('gm.sync.deck', () => {
          let cardsObject = {};
          rulecoordinator.deck.getDeck().forEach((card, i) => {
            cardsObject[card.uid] = i;
          });
          console.dir(cardsObject);
          this.em.emit('gm.sync', {deck: cardsObject});
        });
        this.em.on('deck.draw', player => {
          let card = rulecoordinator.deck.draw();
          if (card === false) return; //should emit anyway bc others expect event

          player.hand.push(card);
          this.em.emit('deck.card.got', card, player);
          //sync deck
          if (player.uid === this.user.uid) {
            this.em.emit('gm.sync', {[card.uid]: null}, 'deck');
          }
        });
        this.em.on('deck.shuffle', () => {
          this.em.emit('deck.shuffled', rulecoordinator.deck.shuffle(this.seed));
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

        this.em.on('gm.win', () => {
          this.status = GameStatus.FINISHED;
          if (this.host) {
            this.server.syncGameObject(`games/${this.name}`, {status: GameStatus.FINISHED});
          }
        });

        this.em.on('gm.occupation_pool.get', () => {
          this.em.emit('gm.occupation_pool.got', rulecoordinator.occupationPool);
        });

        this.em.on('gm.change_ocupation', (player, newOccupation) => {
          this.em.emit('gm.sync', { [player.uid]: {
            [newOccupation.token]: false
          } }, 'occupations');
          this.em.emit('gm.sync', {[newOccupation.token]: null}, 'occupationPool');
        });

        this.em.on('sv.occupation.change', (uid, data) => {
          let [newOccupationToken, newOccupationDisclosed] = Object.entries(data)[0];
          let player = this.players.find(x => x.uid === uid);

          if (newOccupationToken !== player.occupation.token) {
            rulecoordinator.occupationPool = rulecoordinator.occupationPool.filter(x => x.token !== newOccupationToken);

            let newOccupation = occupations[newOccupationToken];

            player.occupation = Object.assign({}, newOccupation);

            if (turncoordinator.queue.turns !== 0) {
              this.em.emit('gm.occupation.changed', player);
            }
          } else if (newOccupationDisclosed) {
            player.occupation.disclosed = true;

            this.em.emit('gm.occupation.disclosed', player);
          }
        });

        this.em.on('gm.occupation.disclose', player => {
          if (player.occupation.disclosed) {
            //this is a recurring activation
            //bc of data architecture we have to
            //quickly hide and disclose occupation
            //to trigger event
            this.em.emit('gm.sync', { [player.uid]: {
              [player.occupation.token]: false
            } }, 'occupations');
          }
          this.em.emit('gm.sync', { [player.uid]: {
            [player.occupation.token]: true
          } }, 'occupations');
        });

        this.em.on('gm.occupation.disclosed', player => {
          player.occupation.availability = false;
          if (player.occupation.onDisclose) player.occupation.onDisclose.call(turncoordinator, player);
        });

        this.em.on('sv.profile.change', (uid, data) => {
          let player = this.players.find(x => x.uid === uid);
          if (player.tokens < data.tokens) {
            rulecoordinator.tokens--;
            player.tokens = data.tokens;
            this.em.emit('gm.got_token', player);
          } else if (player.tokens > data.tokens) {
            rulecoordinator.tokens++;
            player.tokens = data.tokens;
            if (turncoordinator.queue.turns !== 0) {
              this.em.emit('duel.spent_token', player);
            }
          }
        });

        this.em.on('gm.restart', player => {
          this.server.changePlayerStatus(Status.READY, this.user.uid, this.name);
        });

        this.server.subToPool(this.name);
        this.server.subToProfiles(this.name);
        this.server.subToOccupations(this.name);

        this.started = true;
      }

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
