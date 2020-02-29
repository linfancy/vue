/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  /**
   * mixin:{ 
      data: function () {
        return {
          firstName: 'Walter',
          lastName: 'White',
          alias: 'Heisenberg',
        }
      }
     }
   */
  Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
