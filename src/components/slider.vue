<template>
  <div class="slider-wrapper">
    <div class="nav-arrow"  @click.stop="slide(true)" v-show="needNav">&vltri;</div>
    <div class="slider-container">
      <div class="cards-container" :style="{ width: sliderWidth + 'px', transform: 'translateX(' + displacement + 'px)' }" :class="status">
        <component v-for="card in cards" :is="componentName" :card="card"></component>
      </div>
    </div>
    <div class="nav-arrow" @click.stop="slide(false)" v-show="needNav">&vrtri;</div>
  </div>
</template>

<script>
import itemCard from './item-card.vue'
import occupationCard from './occupation-card.vue'

export default {
  props: ['cards', 'componentName'],
  data () {
    return {
      displacement: 0,
      status: {
        selectable: false
      },
      options: {}
    }
  },
  computed: {
    sliderWidth () { return this.cards.length * 170 },
    slideLimit () {
      let limit = this.sliderWidth - this.$el.offsetWidth + 40;
      return limit < 0 ? 0 : limit;
    },
    needNav () { return this.sliderWidth > this.$el.offsetWidth }
  },
  methods: {
    slide (toLeft) {
      let delta = 380;
      let d;
      if (toLeft) {
        d = this.displacement + delta;
        this.displacement = d > 0 ? 0 : d;
      } else {
        d = this.displacement - delta;
        this.displacement = d + this.slideLimit < 0 ? -(this.slideLimit) : d;
      }
    }
  },
  events: {
    'slider.reset' () {
      this.displacement = 0;
      this.status.selectable = false;
    },
    'slider.select' (options) {
      this.options = options;
      this.status.selectable = true;
      this.$broadcast('card.init', options);
    },
    'slider.selected' () {
      this.status.selectable = false;
      this.$broadcast('card.reset');
    },
    'card.selected' (card) {
      if (this.status.selectable) this.$broadcast('card.selected.confirmed', card);
      return this.status.selectable; //propagate up
    }
  },
  components: {
    itemCard,
    occupationCard
  }
}
</script>

<style lang="scss">
@import '../settings.scss';
  .slider-wrapper{
    position: relative;
    max-height: $item-card-height + 20px;
  }
  .slider-container{
    overflow: hidden;
    margin: 5px 40px;
  }
  .cards-container{
    overflow: hidden;
    transition: all .4s ease-in-out;
    > div {
      float: left;
      margin-left: 10px;
      margin-bottom: 10px;
    }
  }
  .nav-arrow{
      position: absolute;
      width: 30px;
      height: 30px;
      line-height: 30px;
      font-size: 39px;
      cursor: pointer;
      color: $yellow;
      z-index: 10;
      &:hover{
        color: #fff;
      }
      top: calc(50% - 30px);
      left: 20px;
      &:last-of-type{
        right: 3px;
        left: auto;
      }
    }
</style>
