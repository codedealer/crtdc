import firebase from 'firebase'
import config from '../server-config/db-config.json'
import EventEmitter from './eventemitter'
import Status from '../player/status'

export default class Server {
  // sort of sigleton implementation
  constructor() {
    if (Server.prototype._Instance) return Server.prototype._Instance;

    Server.prototype._Instance = this;

    let app = firebase.initializeApp(config);

    this.db = firebase.database(app);
    this.em = EventEmitter.getInstance();

    this.createUser = function() {
      let ref = this.db.ref();
      let d = new Date().toUTCString();

      let promiseRef = ref.child('users').push({
        lastLogin: d
      });

      return {
        uid: promiseRef.key,
        lastLogin: d
      }
    }

    this.gameExists = function(gameName) {
      return this.db.ref('games').child(gameName).once('value');
    }

    this.joinSimple = function(user, gameName) {
      let ref = this.db.ref(`games/${gameName}`);

      ref.once('value').then(snapshot => {
        let data = snapshot.val();

        if (data === null) throw 'Game is not found';

        //if this is first player
        //clear chat log from prev games
        if (!data.players || Object.keys(data.players).length === 0) {
          this.em.emit('chat.flush.deferred');
        }

        let cond = !data.started &&
                  (!data.players || !data.players.hasOwnProperty(user.uid));

        if (cond || (data.players && data.players.hasOwnProperty(user.uid))) {
          ref.child('players').update({ [(() => user.uid)()]: Status.IDLE }).then(() => {
            let playersRef = ref.child('players');

            playersRef.on('child_added', this.onPlayerJoin, this);
            playersRef.on('child_changed', this.onPlayerStatusChange, this);
            playersRef.on('child_removed', this.onPlayerLeave, this);

            ref.child('updated').on('value', snapshot => { this.em.emit('sv.game_update_date', snapshot.val()); });

            playersRef.child(user.uid).onDisconnect().set(null);
          });
        }
      });
    }

    this.changePlayerStatus = function(status, uid, gameName) {
      let ref = this.db.ref(`games/${gameName}/players/${uid}`);

      ref.set(status);
    }

    this.onPlayerJoin = function(snapshot) {
      this.em.emit('sv.player_join', snapshot.key, snapshot.val());
    }

    this.onPlayerStatusChange = function(snapshot) {
      this.em.emit('sv.player_status', snapshot.key, snapshot.val());
    }

    this.onPlayerLeave = function(snapshot) {
      this.em.emit('sv.player_leave', snapshot.key);
    }
  }
  static getInstance() {
    return new Server();
  }
  isSelfHost (user, gameName) {
    return new Promise((resolve, reject) => {
      let query = this.db.ref(`games/${gameName}/players`).orderByKey();

      query.once('value').then(snapshot => {
        snapshot.forEach(childSnapshot => {
          resolve(childSnapshot.key === user.uid);

          return true;
        });
      });
    });
  }
  startGame (gameObject, gameName) {
    let dataToUpdate = {};
    let timestamp = new Date().getTime();

    let playerStatues = {};

    gameObject.players.forEach(x => { playerStatues[x.uid] = Status.INGAME })

    dataToUpdate = {
      [`games/${gameName}`]: {
        players: playerStatues,
        started: gameObject.started,
        status: gameObject.status,
        updated: timestamp
      }
    }

    let hands = {};
    let profiles = {};
    let occupations = {};

    gameObject.players.forEach(player => {
      let hand = {};
      let profile = {};

      //build hand
      player.hand.forEach(card => { hand[card.uid] = true });
      hands[player.uid] = hand;

      //build profile
      profile.tokens = player.tokens;
      profile.allegiance = player.allegiance.org;
      profile.character = player.character.imgClass;

      profiles[player.uid] = profile;

      //build occupations
      occupations[player.uid] = { [player.occupation.token]: player.occupation.disclosed }

      //save link to game in user profile
      dataToUpdate[`users/${player.uid}/games/${gameName}`] = timestamp;
    });

    let deck = {};

    gameObject.deck.forEach((card, i) => {
      deck[card.uid] = i;
    });

    let occupationPool = {};

    gameObject.occupationPool.forEach((card, i) => {
      occupationPool[card.token] = true;
    });

    dataToUpdate[gameName] = {
      seed: gameObject.seed,
      turn: gameObject.turn,
      pool: gameObject.pool,
      profiles,
      hands,
      occupations,
      deck,
      occupationPool
    }

    this.db.ref().update(dataToUpdate);
  }
  getGameObject (gameName) {
    return new Promise((resolve, reject) => {
      this.db.ref(gameName).once('value').then(snapshot => {
        let data = snapshot.val();

        if (data === null) reject('Game is not found');
        else resolve(data);
      });
    });
  }
  subToPool (gameName) {
    this.db.ref(`${gameName}/pool`).on('child_changed', (snapshot) => {
      this.em.emit('pool.change', snapshot.key, snapshot.val());
    });
  }
  subToProfiles (gameName) {
    this.db.ref(`${gameName}/profiles`).on('child_changed', (snapshot) => {
      this.em.emit('sv.profile.change', snapshot.key, snapshot.val());
    });
  }
  subToOccupations (gameName) {
    this.db.ref(`${gameName}/occupations`).on('child_changed', (snapshot) => {
      this.em.emit('sv.occupation.change', snapshot.key, snapshot.val());
    });
  }
  pubToPool (gameName, uid, actionObject) {
    return this.db.ref(`${gameName}/pool/${uid}`).update(actionObject);
  }
  syncGameObject(gameName, gameObject, path = false) {
    let refPath = path === false ? gameName : (gameName + '/' + path);
    return this.db.ref(refPath).update(gameObject);
  }
}
