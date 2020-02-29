/* @flow */

import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'
/**
 *  createCompilerCreator 函数的返回值并且传递了 baseCompile 函数作为参数，也就说通过 createCompilerCreator 函数创建编译器。
 * 调用createCompilerCreator 就会返回一个函数，这个函数就是createCompiler，调用createCompiler就可以创建一个编译器。
 * @param {*} baseCompile 
 */
export function createCompilerCreator (baseCompile: Function): Function {
  return function createCompiler (baseOptions: CompilerOptions) {
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      /**
       * var baseOptions = {
          expectHTML: true,
          modules: modules$1,
          directives: directives$1, //directives 值是三个属性 (model、text、html) 的对象，且属性的值都是函数。
          isPreTag: isPreTag, //isPreTag 它是一个函数，其作用是通过给定的标签名字检查标签是否是 'pre' 标签。
          isUnaryTag: isUnaryTag,//isUnaryTag 是一个通过makeMap生成的函数，该函数的作用是检测给定的标签是否是一元标签。
          mustUseProp: mustUseProp,//mustUseProp 它是一个函数，其作用是用来检测一个属性在标签中是否要使用props进行绑定。
          canBeLeftOpenTag: canBeLeftOpenTag, //canBeLeftOpenTag 一个使用makeMap生成的函数，它的作用是检测非一元标签，但却可以自己补全并闭合的标签。比如 div 标签是一个双标签，你需要这样使用<div> text </div>，但是你依然可以省略闭合标签，直接这样写：<div> text ，且浏览器会自动补全。但是有些标签你不可以这样用，它们是严格的双标签。
          isReservedTag: isReservedTag, //isReservedTag 它是一个函数，其作用是检查给定的标签是否是保留的标签。
          getTagNamespace: getTagNamespace,//getTagNamespace 它也是一个函数，其作用是获取元素(标签)的命名空间。
          staticKeys: genStaticKeys(modules$1) //staticKeys 它的值是通过以 modules 为参数调用 genStaticKeys 函数的返回值得到的。 其作用是根据编译器选项的 modules 选项生成一个静态键字符串。
        };
       */
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []
      /**
       * {msg 错误或提示的信息
          tip 用来标示 msg 是错误还是提示。
          } 
          warn选项主要用在编译过程中的错误和提示收集，如果收集的信息是错误信息就将错误信息添加到前面定义的errors数组里，如果是提示信息就将其添加到 tips 数组里。
       */
      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg)
      }
      /**
       * 这段代码检查 options 是否存在，这里的 options 就是使用编译器编译模板时传递的选项参数，或者可以简单理解为调用 compileToFunctions 函数时传递的选项参数。
       * 而baseOptions理解为编译器的默认选项或者基本选项，options 是用来提供定制能力的扩展选项。而上面这段代码的作用，就是将 options 对象混合到 finalOptions 中。
       * 两个特殊的属性处理：
       * modules: 如果 options.modules 存在，就在 finalOptions 对象上添加 modules 属性，其值为 baseOptions.modules 和 options.modules 这两个数组合并后的新数组。
       * directives: 对于directives 采用原型链的原理实现扩展属性对基本属性的覆盖。
       */
      if (options) {
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // $flow-disable-line
          const leadingSpaceLength = template.match(/^\s*/)[0].length

          warn = (msg, range, tip) => {
            const data: WarningMessage = { msg }
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength
              }
            }
            (tip ? tips : errors).push(data)
          }
        }
        // merge custom modules
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      finalOptions.warn = warn
      /**
       * 上面的代码调用了 baseCompile 函数，并分别将字符串模板(template)，以及最终的编译器选项(finalOptions)传递了过去。
       * compiled 是 baseCompile 对模板的编译结果
       * 所以上面这段代码的作用是用来通过抽象语法树来检查模板中是否存在错误表达式的，
       * 通过 detectErrors 函数实现，将compiled.ast 作为参数传递给 detectErrors 函数，
       * 该函数最终返回一个数组，该数组中包含了所有错误的收集，最终通过这句代码将错误添加到errors。
       * 将收集到的错误(errors)和提示(tips)添加到compiled上并返回。
       * 
       * baseCompile 函数是在 createCompilerCreator 函数调用时传递的实参。
       */
      const compiled = baseCompile(template.trim(), finalOptions)
      if (process.env.NODE_ENV !== 'production') {
        detectErrors(compiled.ast, warn)
      }
      compiled.errors = errors
      compiled.tips = tips
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
