/* @flow */

import { noop, extend } from 'shared/util'
import { warn as baseWarn, tip } from 'core/util/debug'
import { generateCodeFrame } from './codeframe'

type CompiledFunctionResult = {
  render: Function;
  staticRenderFns: Array<Function>;
};

function createFunction (code, errors) {
  try {
    return new Function(code)
  } catch (err) {
    errors.push({ err, code })
    return noop
  }
}

export function createCompileToFunctionFn (compile: Function): Function {
  const cache = Object.create(null)

  return function compileToFunctions (
    template: string,
    options?: CompilerOptions,
    vm?: Component
  ): CompiledFunctionResult {
    options = extend({}, options) //通过extend 把 options 配置对象上的属性扩展一份到新对象上
    const warn = options.warn || baseWarn
    delete options.warn

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      // detect possible CSP restriction
      /**
       *  try catch 语句块对 new Function('return 1') 这句代码进行错误捕获，
       * 如果有错误发生且错误的内容中包含如 'unsafe-eval' 或者 'CSP' 这些字样的信息时就会给出一个警告。
       * CSP全称Content Security Policy ,可以直接翻译为内容安全策略,说白了,就是为了页面内容安全而制定的一系列防护策略. 通过CSP所约束的的规责指定可信的内容来源（这里的内容可以指脚本、图片、iframe、fton、style等等可能的远程的资源）。通过CSP协定，让WEB处于一个安全的运行环境中。
       * 如果你的策略比较严格，那么 new Function() 将会受到影响，从而不能够使用。但是将模板字符串编译成渲染函数又依赖 new Function()，所以解决方案有两个：
       * 1、放宽你的CSP策略 2、预编译
       */
      try {
        new Function('return 1')
      } catch (e) {
        if (e.toString().match(/unsafe-eval|CSP/)) {
          warn(
            'It seems you are using the standalone build of Vue.js in an ' +
            'environment with Content Security Policy that prohibits unsafe-eval. ' +
            'The template compiler cannot work in this environment. Consider ' +
            'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
            'templates into render functions.'
          )
        }
      }
    }

    // check cache
    /**
     * options.delimiters这个选项是改变纯文本插入分隔符，
     * 如果options.delimiters存在，则使用String 方法将其转换成字符串并与 template 拼接作为 key 的值，否则直接使用 template 字符串作为 key 的值，然后判断 cache[key] 是否存在，如果存在直接返回cache[key]。
     */
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template
    if (cache[key]) {
      return cache[key]
    }

    // compile 是引用了来自 createCompileToFunctionFn 函数的形参稍后会重点来介绍它
    /**
     * 在使用 compile 函数对模板进行编译后会返回一个结果 compiled，
     * 返回结果 compiled 是一个对象且这个对象可能包含两个属性 errors 和 tips 。
     * 这两个属性分别包含了编译过程中的错误和提示信息。
     * 这段代码的作用就是用来检查使用 compile 对模板进行编译的过程中是否存在错误和提示的，如果存在那么需要将其打印出来。
     */
    const compiled = compile(template, options)

    // check compilation errors/tips
    if (process.env.NODE_ENV !== 'production') {
      if (compiled.errors && compiled.errors.length) {
        if (options.outputSourceRange) {
          compiled.errors.forEach(e => {
            warn(
              `Error compiling template:\n\n${e.msg}\n\n` +
              generateCodeFrame(template, e.start, e.end),
              vm
            )
          })
        } else {
          warn(
            `Error compiling template:\n\n${template}\n\n` +
            compiled.errors.map(e => `- ${e}`).join('\n') + '\n',
            vm
          )
        }
      }
      if (compiled.tips && compiled.tips.length) {
        if (options.outputSourceRange) {
          compiled.tips.forEach(e => tip(e.msg, vm))
        } else {
          compiled.tips.forEach(msg => tip(msg, vm))
        }
      }
    }

    // turn code into functions
    const res = {}
    const fnGenErrors = []
    /**
     * createFunction 函数接收两个参数，
     * 第一个参数 code 为函数体字符串，
     * 该字符串将通过new Function(code) 的方式创建为函数。
     * 第二个参数 errors 是一个数组，作用是当采用 new Function(code) 创建函数发生错误时用来收集错误的。
     */
    res.render = createFunction(compiled.render, fnGenErrors)
    /**
     * res.staticRenderFns 是一个函数数组，
     * 是通过对compiled.staticRenderFns遍历生成的，
     * 这说明：compiled 除了包含 render 字符串外，
     * 还包含一个字符串数组staticRenderFns ，且这个字符串数组最终也通过 createFunction 转为函数。
     * staticRenderFns 的主要作用是渲染优化，我们后面详细讲解。
     */
    res.staticRenderFns = compiled.staticRenderFns.map(code => {
      return createFunction(code, fnGenErrors)
    })

    // check function generation errors.
    // this should only happen if there is a bug in the compiler itself.
    // mostly for codegen development use
    /* istanbul ignore if */
    //这段代码主要的作用是用来打印在生成渲染函数过程中的错误,返回结果的同时将结果缓存
    if (process.env.NODE_ENV !== 'production') {
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn(
          `Failed to generate render function:\n\n` +
          fnGenErrors.map(({ err, code }) => `${err.toString()} in\n\n${code}\n`).join('\n'),
          vm
        )
      }
    }

    return (cache[key] = res)
  }
}
