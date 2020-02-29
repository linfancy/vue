/* @flow */

import config from '../config'
import { warn } from './debug'
import { set } from '../observer/index'
import { unicodeRegExp } from './lang'
import { nativeWatch, hasSymbol } from './env'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * option 重写策略
 * Option overwriting strategies are functions that handle
 * 用于合并一个父option与子option的值
 * how to merge a parent option value and a child option
 * value into the final value.
 */
//config.js中定义了strats的类型为 optionMergeStrategies: { [key: string]: Function };
const strats = config.optionMergeStrategies

/**
 * Options with restrictions 限制规定
 */
if (process.env.NODE_ENV !== 'production') {
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 * mergeData的逻辑是，如果from对象中有to对象里没有的属性，则调用set方法，（这里的set就是Vue.$set，先可以简单理解为对象设置属性。之后会细讲）如果from和to中有相同的key值，且key对应的value是对象，则会递归调用mergeData方法，否则以to的值为准，最后返回to对象。
 */
function mergeData (to: Object, from: ?Object): Object {
  if (!from) return to
  let key, toVal, fromVal

  const keys = hasSymbol
    ? Reflect.ownKeys(from)
    : Object.keys(from)

  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    // in case the object is already observed...
    if (key === '__ob__') continue
    toVal = to[key]
    fromVal = from[key]
    if (!hasOwn(to, key)) {
      set(to, key, fromVal)
    } else if (
      toVal !== fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data
 * 
 */
export function mergeDataOrFn (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  /**
   * 如果新建实例时传入的options上有data属性，则调用mergeData方法合并实例上的data属性和其构造函数options上的data属性（如果有的话）
   * 第二种情况，当前调用mergeOptions操作的不是vm实例（即通过Vue.extend/Vue.component调用了mergeOptions方法）
   */
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn () {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    return function mergedInstanceDataFn () {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )

      return parentVal
    }
    return mergeDataOrFn(parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
}

/**
 * Hooks and props are merged as arrays.
 * (1) child options上不存在该属性，parent options上存在,则返回parent上的属性。
 * （2）child和parent都存在该属性，则返回concat之后的属性
 * （3）child上存在该属性，parent不存在，且child上的该属性是Array，则直接返回child上的该属性
 * (4) child上存在该属性，parent不存在，且child上的该属性不是Array，则把该属性先转换成Array,再返回。
 */
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal

  /**
   * 如果存在该挂钩事件，则去除原有的
   */
  return res
    ? dedupeHooks(res)
    : res
}
//挂钩去重
function dedupeHooks (hooks) {
  const res = []
  for (let i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i])
    }
  }
  return res
}
/**
 * 0:"beforeCreate"
1:"created"
2:"beforeMount"
3:"mounted"
4:"beforeUpdate"
5:"updated"
6:"beforeDestroy"
7:"destroyed"
8:"activated"
9:"deactivated"
10:"errorCaptured"
11:"serverPrefetch"
 */
LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
function mergeAssets (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  const res = Object.create(parentVal || null)
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    return extend(res, childVal)
  } else {
    return res
  }
}

/**
 * 0:"component"
  1:"directive"
  2:"filter"

  * components/directives/filters这几个属性的处理逻辑如下

 */
ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */
strats.watch = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  return ret
}

/**
 * Other object hashes.
 * props,methods,inject,computed等属性的合并策略。
 * 如果child options上这些属性存在，则先判断它们是不是对象。
（1）如果parent options上没有该属性，则直接返回child options上的该属性
（2）如果parent options和child options都有，则合并parent options和child options并生成一个新的对象。(如果parent和child上有同名属性，合并后的以child options上的为准)
 */
strats.props =
strats.methods =
strats.inject =
strats.computed = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  if (childVal && process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = Object.create(null)
  extend(ret, parentVal)
  if (childVal) extend(ret, childVal)
  return ret
}
strats.provide = mergeDataOrFn

/**
 * Default strategy.
 * defaultStrat的逻辑是，如果child上该属性值存在时，就取child上的该属性值，如果不存在，则取parent上的该属性值。
 */
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Validate component names
 */
function checkComponents (options: Object) {
  for (const key in options.components) {
    validateComponentName(key)
  }
}
/**
 * 包含数字，字母，下划线，连接符，并且以字母开头
  是否和html标签名称或svg标签名称相同
  是否和关键字名称相同，如undefined, infinity等
 */
export function validateComponentName (name: string) {
  if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'should conform to valid custom element name in html5 specification.'
    )
  }
  /**
   * ????????
   * isBuiltInTag(name)这个不知道在干嘛
   */
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
function normalizeProps (options: Object, vm: ?Component) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}

/**
 * Normalize all injections into Object-based format
 * provide 和 inject 这对选项需要一起使用，以允许一个祖先组件向其所有子孙后代注入一个依赖，不论组件层次有多深，并在起上下游关系成立的时间里始终生效。
 */
function normalizeInject (options: Object, vm: ?Component) {
  const inject = options.inject
  if (!inject) return
  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

/**
 * Normalize raw function directives into object format.
 */
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

function assertObjectType (name: string, value: any, vm: ?Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 * 该函数用于 Vue.mixin
 * mergeoptions方法是要合并构造函数和传入的options这两个对象。
 * 自定义选项将使用默认策略，即简单地覆盖已有值。如果想让自定义选项以自定义逻辑合并，可以向 Vue.config.optionMergeStrategies 添加一个函数：
  Vue.config.optionMergeStrategies.myOption = function (toVal, fromVal) {
    // 返回合并后的值
  }
 */
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  if (process.env.NODE_ENV !== 'production') {
    //就是检查组件，内部遍历了传入的child的components属性检查组件名字是否规范。
    /**
     * 组件名称不可为html tag名称，
     * 使用 kebab-case(短横线分隔命名) 定义一个组件时，你也必须在引用这个自定义元素时使用 kebab-case，例如 <my-component-name>
     * 使用 PascalCase(首字母大写命名) 定义一个组件时，你在引用这个自定义元素时两种命名法都可以使用。也就是说 <my-component-name> 和 <MyComponentName> 都是可接受的。
     */
    checkComponents(child)
  }

  if (typeof child === 'function') {
    child = child.options
  }
  // options中的props,inject,directives属性转换成对象的形式

  // 统一props格式
  normalizeProps(child, vm)

  // 统一inject的格式
  normalizeInject(child, vm)

  // 统一directives的格式：自定义指令
  /**
   * 注册一个全局自定义指令 `v-focus`
    Vue.directive('focus', {
      // 当被绑定的元素插入到 DOM 中时……
      inserted: function (el) {
        // 聚焦元素
        el.focus()
      }
    })
    * normalizeDirectives构造函数会把这个指令传入的参数，最终转换成下面这种形式
    * Vue.directive('color', function (el, binding) {
        el.style.backgroundColor = binding.value
      })
    * color: {
        bind: function (el, binding) {
          el.style.backgroundColor = binding.value
        },
        update: function (el, binding) {
          el.style.backgroundColor = binding.value
        }
      }
   */
  normalizeDirectives(child)

  // Apply extends and mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.
  /**
   * 当传入的options里有mixin或者extends属性时，再次调用mergeOptions方法合并mixins和extends里的内容到实例的构造函数options上（即parent options）比如下面这种情况
   * 就会把传入的mounted, created钩子处理函数，还有methods方法提出来去和parent options做合并处理。
   * 弄明白了这点我们继续回到mergeOptions的代码
   * const childComponent = Vue.component('child', {
          ...
          mixins: [myMixin],
          extends: myComponent
          ...
    })
    const myMixin = {
          created: function () {
            this.hello()
          },
          methods: {
            hello: function () {
              console.log('hello from mixin')
          }
        }
      }
    const myComponent = {
          mounted: function () {
            this.goodbye()
          },
          methods: {
            goodbye: function () {
              console.log('goodbye from mixin')
            }
        }
      }
   */
  if (!child._base) {
    // 如果存在child.extends
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }

    //如果存在child.mixins
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }
  // 针对不同的键值，采用不同的merge策略
  //采取了对不同的field采取不同的策略，Vue提供了一个strats对象，其本身就是一个hook,如果strats有提供特殊的逻辑，就走strats,否则走默认merge逻辑。
  const options = {}
  let key
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  /**
   * activated:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      beforeCreate:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      beforeDestroy:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      beforeMount:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      beforeUpdate:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      components:function mergeAssets (\n    parentVal,\n    childVal,\n    vm,\n    key\n  ) { … }
      computed:function (\n    parentVal,\n    childVal,\n    vm,\n    key\n  ) { … }
      created:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      data:function (\n    parentVal,\n    childVal,\n    vm\n  ) { … }
      deactivated:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      destroyed:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      directives:function mergeAssets (\n    parentVal,\n    childVal,\n    vm,\n    key\n  ) { … }
      el:function (parent, child, vm, key) { … }
      errorCaptured:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      filters:function mergeAssets (\n    parentVal,\n    childVal,\n    vm,\n    key\n  ) { … }
      inject:function (\n    parentVal,\n    childVal,\n    vm,\n    key\n  ) { … }
      methods:function (\n    parentVal,\n    childVal,\n    vm,\n    key\n  ) { … }
      mounted:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      props:function (\n    parentVal,\n    childVal,\n    vm,\n    key\n  ) { … }
      propsData:function (parent, child, vm, key) { … }
      provide:function mergeDataOrFn (\n    parentVal,\n    childVal,\n    vm\n  ) { … }
      serverPrefetch:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      updated:function mergeHook (\n    parentVal,\n    childVal\n  ) { … }
      watch:function (\n    parentVal,\n    childVal,\n    vm,\n    key\n  ) { … }
   * @param {*} key 
   */
  function mergeField (key) {
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // check local registration variations first
  if (hasOwn(assets, id)) return assets[id]
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
