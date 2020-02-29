/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   * 将"component", "directive", "filter" 设置为全局api
   * Vue.component, Vue.directive, Vue.filter
   */
  ASSET_TYPES.forEach(type => {
    /**
     * Vue.component('modal', {
        template: '#modal-template'
      });
      id:modal; type: component; definition: {template: '#modal-template'}
     * 
     */
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        // this === Vue
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          /**
           * 检查组件名称是否合格
           */
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          /**
           * 传入的definition={template: "#modal-template", name: "modal"}
           * 返回的是VueComponent方法
           * 原definition放在definition.extendOptions中
           * 在global-api/index.js中，将Vue挂在了Vue.options的_base上：Vue.options._base = Vue
           * ???????
           * 为什么这么写
           */
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        //将合并了传入Vue.component(options)里的options，合并Vue原型的属性，存放到Vue.options.components上
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
