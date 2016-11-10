import Settings from '../world/settings'
import * as animations from './animations'
import EventEmitter from '../core/eventemitter'

export default {
  animate (animationName, ...args) {
    if (animations.hasOwnProperty(animationName) && Settings.ANIMATION) {
      return animations[animationName](EventEmitter.getInstance(), ...args);
    }

    return Promise.resolve();
  }
}
