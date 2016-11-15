<template>
  <div class="i-player-lobby-container">
    <header>
      <h1>Пассажиры</h1>
      <span>{{ options.canStart ? headerTexts[1] : headerTexts[0] }}</span>
    </header>
    <ul class="i-player-lobby">
      <template v-for="player in options.players">
        <li class="{{player.status}}">{{* cut(player.uid) }}</li>
      </template>
    </ul>
  </div>
</template>

<script>
import {cutUid} from '../core/utils'

export default {
  props: ['options'],
  data () {
    return {
      headerTexts: [
        'Ожидаем заполнения кареты',
        'Игра начнется, когда все будут готовы'
      ],
      cut: cutUid
    }
  }
}
</script>

<style lang="scss">
@import '../settings.scss';

.i-player-lobby{
  margin-top: 10px;
  padding-left: 20px;
  list-style: none;
  color: $system-gray;
  li{
    margin-bottom: 5px;
    &:before{
      content: '\2610';
      padding-right: 3px;
      color: lighten($system-gray, 30%);
    }
    &.ready{
      color: lighten($system-gray, 30%);
    }
    &.ready:before{
      content: '\2611';
    }
  }
}

@media (max-height: 670px) {
  .i-player-lobby li {
    margin-bottom: 0;
    font-size: 14px;
  }
}
</style>
