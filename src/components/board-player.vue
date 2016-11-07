<template>
  <div class="board-player-container" :class="status" @click.stop="onClick">
    <div class="board-player-picture" :class="player.character.imgClass">
      <div class="board-player-picture-cards">{{ player.hand.length }}</div>
      <div class="board-player-picture-tokens" v-show="player.tokens">{{ player.tokens }}</div>
    </div>
    <div class="board-player-info" :class="allegianceClass">
      <div class="board-player-name">{{ status.self ? 'Вы' : player.character.name }}</div>
      <div class="board-player-delimeter"></div>
      <div class="board-player-occupation">{{ showOccupation ? player.occupation.name : '???' }}</div>
    </div>
  </div>
</template>

<script>
import EventEmitter from '../core/eventemitter'

export default {
  props: ['player', 'user'],
  ready () {
    this.em.on('turn.new', queue => {
      if (this.player.uid === queue.uid) this.status.active = true;
      else this.status.active = false;

      this.status.selected = false;
      this.status.selectable = false;
      this.status['duel-active'] = false;
      this.status['duel-ready'] = false;
    });

    this.em.on('fun.team', player => {
      if (player.uid === this.player.uid && !this.team) {
        this.em.emit('log', 'a', `${player.character.name} перешел в братство без знамен!`);

        this.team = true;
      }
    });

    this.em.on('gm.win', () => { this.gameFinished = true; });
  },
  data () {
    return {
      em: EventEmitter.getInstance(),
      gameFinished: false,
      team: false,
      status: {
        active: false,
        selectable: false,
        selected: false,
        self: this.player.uid === this.user.uid,
        'duel-active': false,
        'duel-ready': false
      }
    }
  },
  computed: {
    showAllegiance () {
      if (this.gameFinished) return true;
      if (this.player.uid === this.user.uid) return true;

      return this.user.known.findIndex(x => x.uid === this.player.uid) >= 0;
    },
    showOccupation () {
      if (this.gameFinished) return true;
      if (this.player.uid === this.user.uid) return true;

      return this.player.occupation.disclosed;
    },
    allegianceClass () {
      let primaryClass = this.player.allegiance.cssClass;
      let teamClass = 'bannerless';

      let o = {
        [primaryClass]: false,
        [teamClass]: false
      }

      if (this.showAllegiance) o[primaryClass] = true;
      if (this.team) o[teamClass] = true;
      if (this.team && this.player.uid === this.user.uid) o[primaryClass] = false;

      return o;
    }
  },
  methods: {
    onClick () {
      if (this.status.selectable && !this.status.selected) {
        this.status.selected = true;
        this.status.selectable = false;
        this.$dispatch('b.select-target', this.player);
      } else if (!this.status.selectable) {
        this.$dispatch('b.change-target', this.player);
      }
    }
  },
  events: {
    'b.selectable.init' (exclude) {
      this.status.selectable = !exclude.find(x => x.uid === this.player.uid);
      this.status.selected = false;
    },
    'b.selectable.close' () { this.status.selectable = false; },
    'b.duel.init' (poolObject) {
      if (this.player.uid !== poolObject.uid && this.player.uid !== poolObject.actionObject.callee) {
        this.status['duel-active'] = true;
      }
    }
  }
}
</script>

<style lang="scss">
@import '../settings.scss';
@import '../cards/characters.scss';

$board-shadow: inset -1px 1px 1px rgba(255,255,255,0.7), inset 1px -1px 1px rgba(0,0,0,0.8);

@keyframes slow-flash-board{
  from{
    box-shadow: $board-shadow, 0 0 7px fade-out($select, 0.1);
  }
  to{
    box-shadow: $board-shadow, 0 0 7px $selected;
  }
}

.board-player-container{
  padding: 10px 10px 0;
  text-align: center;
  .bannerless{
    background: linear-gradient(135deg, rgba(39,163,43,1) 0%,rgba(19,78,21,0) 75%,rgba(0,0,0,0) 100%), url(../assets/metal.jpg) center;
  }
  .order{
    background: linear-gradient(135deg, rgba(26,150,186,1) 0%,rgba(12,72,89,0) 75%,rgba(0,0,0,0) 100%), url(../assets/metal.jpg) center;
  }
  .brotherhood{
    background: linear-gradient(135deg, rgba(202,47,58,1) 0%,rgba(97,23,28,0) 75%,rgba(0,0,0,0) 100%), url(../assets/metal.jpg) center;
  }
  &.self{
    .board-player-picture{
      border-color: #eee;
    }
    .board-player-name{
      color: $fullyellow;
    }
  }
  &.active{
    .board-player-picture{
      border-color: $active;
      box-shadow: 0 0 7px fade-out($active, 0.1);
    }
    .board-player-info{
      box-shadow: $board-shadow, 0 0 7px fade-out($active, 0.1);
      /*color: lighten($active, 10);*/
    }
  }
  &.selectable{
    .board-player-picture{
      border-color: $select;
      box-shadow: 0 0 7px fade-out($select, 0.1);
      animation: slow-flash .5s infinite alternate;
    }
    .board-player-info{
      /*turn on only on small screen cuz it looks like shite
      animation: slow-flash-board .5s infinite alternate;*/
      box-shadow: $board-shadow, 0 0 7px fade-out($select, 0.1);
    }
  }
  &.selected{
    border: none;
    box-shadow: none;
    .board-player-picture{
      border-color: $selected;
      box-shadow: 0 0 7px fade-out($selected, 0.1);
    }
    .board-player-info{
      box-shadow: $board-shadow, 0 0 7px fade-out($selected, 0.1);
    }
  }
  &.duel-active{
    .board-player-picture{
      animation: slow-flash-duel .5s infinite alternate;
    }
    .board-player-info{
      /*turn on only on small screen cuz it looks like shite
      animation: slow-flash-board .5s infinite alternate;*/
      box-shadow: $board-shadow, 0 0 7px fade-out($order-primary, 0.1);
    }
  }
  &.duel-ready{
    .board-player-picture{
      border-color: $order-primary;
      box-shadow: 0 0 7px fade-out($order-primary, 0.1);
    }
    .board-player-info{
      box-shadow: $board-shadow, 0 0 7px fade-out($order-primary, 0.1);
    }
  }
}

.board-player-picture{
  position: relative;
  margin: 0 auto;
  height: 90px;
  width: 90px;
  border-radius: 50%;
  cursor: pointer;
  border: 4px solid $dark-gray;
}

.board-player-picture-cards,
.board-player-picture-tokens {
  position: absolute;
  width: 20px;
  height: 20px;
  padding-top: 2px;
  font-size: 12px;
  color: $yellow;
  border-radius: 50%;
}

.board-player-picture-cards{
  top: 0;
  right: 0;
  box-shadow: -1px 2px 1px rgba(0,0,0,0.8);
  background: #4c5e98;
}

.board-player-picture-tokens{
  bottom: 0;
  right: 0;
  box-shadow: -1px -2px 1px rgba(0,0,0,0.8);
  background: #6b1212;
}

.board-player-delimeter{
  background: radial-gradient(ellipse at center, rgba(0,0,0,1) 0%,rgba(0,0,0,0) 80%);
  width: 90%;
  margin: 1px auto;
  height: 1px;
  position: relative;
  &:after{
    content: '';
    display: block;
    width: 70%;
    height: 1px;
    position: absolute;
    top: 1px;
    left: 0;
    right: 0;
    margin: auto;
    background: radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%,rgba(0,0,0,0) 80%);
  }
}

.board-player-info{
  margin-top: 3px;
  color: #eee;
  background: url(../assets/metal.jpg) center;
  text-align: center;
  font-size: 12px;
  padding: 0 10px 2px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: $board-shadow;
  /*clip-path: polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%);*/
}

.board-player-name,
.board-player-occupation{
  text-shadow: -1px 1px 0px #333, 0 0 10px rgba(0,0,0,1);
}

.board-player-occupation{
  color: mintcream;
}
</style>
