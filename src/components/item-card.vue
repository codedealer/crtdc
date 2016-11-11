<template>
  <div :class="status" class="card-wrapper">
    <div class="item-card {{* card.mark }}" @click.stop="onClick">
      <header>{{* card.name }}</header>
      <div class="item-img {{* card.token }}"></div>
      <div class="description">{{* card.description }}</div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['card'],
  data () {
    return {
      status: {
        selected: false,
        disabled: false
      }
    }
  },
  methods: {
    onClick () {
      if (this.status.disabled) return;
      this.$dispatch('card.selected', this.card);
    }
  },
  events: {
    'card.selected.confirmed' (card) {
      if (card.uid === this.card.uid) this.status.selected = !this.status.selected;
    },
    'card.reset' () {
      this.status.disabled = false;
      this.status.selected = false;
    },
    'card.init' (options) {
      this.status.selected = false;
      if (options.isDuel) {
        if (!this.card.onDuel) this.status.disabled = true;
      } else if (options.excludeCriteria && !options.excludeCriteria(this.card)) {
        this.status.disabled = true;
      }
    }
  }
}
</script>

<style lang="scss">
@import '../settings.scss';
@import '../cards/items.scss';

  .selectable :not(.disabled) .item-card{
    animation: slow-flash .5s infinite alternate;
    cursor: pointer;
  }

  .selected .item-card{
    border-color: $selected !important;
    animation: none !important;
    cursor: default !important;
    box-shadow: 2px 2px 8px fade-out($selected, 0.1);
  }

  .item-card{
    width: $card-width;
    padding: 4px;
    background: #444;
    text-align: center;
    border: 3px solid $black;
    border-radius: 10px;
    height: $item-card-height;
    overflow: hidden;
    background: url(../assets/item-bg.jpg) center top repeat;
    position: relative;
    box-shadow: 4px 4px 15px rgba(14,3,32,0.6);
    header{
      color: #dedede;
      font-size: 16px;
      text-shadow: 1px 2px $black;
    }
    .item-img{
      height: 60px;
      width: 73px;
      margin: -4px auto 0;
    }
    .description{
      font-size: 10px;
      color: #ccc;
    }
    &.green:after,
    &.red:after{
      position: absolute;
      bottom: 5px;
      left: 5px;
      display: block;
      content: '';
      border-radius: 50%;
      width: 12px;
      height: 12px;
      background: #014a05;
      box-shadow: inset 0 1px 4px #53cd56, 2px 2px 6px rgba(0,0,0,0.6);
    }
    &.red:after{
      background: #740013;
      box-shadow: inset 1px 1px 2px #e03d41, 2px 2px 6px rgba(0,0,0,0.6);
    }
  }
</style>
