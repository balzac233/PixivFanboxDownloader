// 生成文件名
import { Result } from './StoreType'
import { EVT } from './EVT'
import { store } from './Store'
import { lang } from './Lang'
import { DateFormat } from './utils/DateFormat'
import { settings } from './setting/Settings'
import { Config } from './Config'

class FileName {

  static customBitSet: number[] = new Array(4).fill(0);

  static {
    FileName.add2CustomBitSet('\\');
    FileName.add2CustomBitSet('/');
    FileName.add2CustomBitSet(':');
    FileName.add2CustomBitSet('?');
    FileName.add2CustomBitSet('"');
    FileName.add2CustomBitSet('<');
    FileName.add2CustomBitSet('>');
    FileName.add2CustomBitSet('*');
    FileName.add2CustomBitSet('|');
    FileName.add2CustomBitSet('~');
  }

  private static add2CustomBitSet(c: string): void {
    const charCode = c.charCodeAt(0);
    FileName.customBitSet[charCode >> 5] |= 1 << (charCode & 31);
  }

  public static containCustomBitSet(c: string): boolean {
    const charCode = c.charCodeAt(0);
    return (FileName.customBitSet[charCode >> 5] & (1 << (charCode & 31))) !== 0;
  }

  public static turnToSafeWindowsStr(s: string): string {
    const charArray = Array.from(s);
    let hasChange = false;
    for (let i = 0; i < charArray.length; i++) {
      const c = charArray[i];
      if (c.charCodeAt(0) < 128 && FileName.containCustomBitSet(c)) {
        charArray[i] = String.fromCharCode(c.charCodeAt(0) + 0xfee0);
        hasChange = true;
      }
    }
    return hasChange ? charArray.join('') : s;
  }

  static notEn: RegExp = /[^a-zA-Z]/
  static charAppear: RegExp = /^[a-zA-Zー・_：\(-\) ／]+$/
  static bookmarkSet: RegExp = /(us|收藏|\+ |\+收)/

  static StringUtilsisBlank(str: string): boolean {
    return null == str || str.trim().length <= 0
  }

  static findDeleteStrList(shortOne: string, longOne: string): string[] {
    if (shortOne.length > longOne.length) {
      return FileName.findDeleteStrList(longOne, shortOne)
    }
    let extraParts = []

    let j = 0
    for (let i = 0; i < shortOne.length && j < longOne.length;) {
      if (shortOne.charAt(i) === longOne.charAt(j)) {
        i++
        j++
      } else {
        //  ================================  客制化内容start
        // || shortOne.charAt(i) == ','  这个是客制化内容 , 因为我偶尔会加上一个,
        // 所以小串如果逗号之后的内容和大串一样 , 那么跳过这个逗号
        if (i + 1 < shortOne.length && shortOne.charAt(i + 1) === longOne.charAt(j)) {
          i += 2
          j++
          continue
        }
        //  ================================  客制化内容end
//                System.out.println("不同i:" + shortOne.charAt(i));
        // 记录从当前位置到下一个匹配位置之前的子串
        let start = j
        while (j < longOne.length && shortOne.charAt(i) !== longOne.charAt(j)) {
//                    System.out.println("不同j:" + longOne.charAt(j));
          j++
        }
        extraParts.push(longOne.substring(start, j))
      }
    }
    // 如果str2还有剩余的部分，也添加到结果中
    if (j < longOne.length) {
      extraParts.push(longOne.substring(j))
    }
    return extraParts
  }

// 重复tag和收藏数量信息
  static buildNewName(result: string) {
    var originStr = result
    // let originLength = result.length;
    console.log(' 开始构建建议的重命名 : ' + originStr)
    console.log(' 原文件名的长度 : ' + originStr.length)
    let pNum = null
    let pNumIndex = result.indexOf('_p')
    if (pNumIndex > 0) {
      let finish = pNumIndex + 1
      while (++finish < result.length && result.charAt(finish) >= '0' && result.charAt(finish) <= '9')
        if (finish > pNumIndex + 2) {
          pNum = result.substring(pNumIndex, finish)
          result = result.substring(0, pNumIndex) + result.substring(finish)
        }
    }
    const ext = result.substring(result.lastIndexOf('.'), result.length)
    console.log('拓展名 : ' + ext)
    result = result.substring(0, result.lastIndexOf('.'))

    const split = result.split(',')
    const set = new Set()
    const sj = []

    const removed = []

    for (let i = 0; i < split.length; i++) {
      let ss: string = split[i]
      // 代码结构暂时不整理了 末尾肯定要加tail , 然后 , 因为剪切和跳过的地方就两个 , 这两个地方记得补一下_width串就好了 ,
      // 然后把他 _width前面加上 , (也就是StringJoiner干的)
      // 1 - 检测 _width[ 标记 , 因为这个不是逗号隔开的,拿出来再放进StringJoiner
      let tail = null
      // 这里_width[放在逗号截取之后的子串内部查询是更好的 , 这样还能少计算一些情况
      // 如果遇到_width[ 和 _压缩率[ 没有粘在一起的情况 , 那么就有点难受了
      if (ss.includes('_width[')) {
        let indexOf_width = ss.indexOf('_width[')
        tail = ss.substring(indexOf_width)
        ss = ss.substring(0, indexOf_width)
      } else if (ss.includes('_压缩率[')) {
        let indexOf_width = ss.indexOf('_压缩率[')
        tail = ss.substring(indexOf_width)
        ss = ss.substring(0, indexOf_width)
      }
      // 这里是为了去掉一些英文tag , 不过只去掉那种好几个英文单词的短语 , 欧美画师加tag喜欢多个单词然后空格隔开 ,
      // 单个英文单词一般都是游戏名或者动漫名 , fgo,nikke,blueArchive 啥的
      if (FileName.notEn.test(ss) && ss.match(FileName.charAppear)) {
        console.log(' 检测到非纯英文单词 且 没有日文的词组或短语(一般是英文短语) , 去掉 : ' + ss)
        removed.push(ss)
        ss = ''
      }

      if (!FileName.StringUtilsisBlank(ss)) {
        // \d{3,}(users入り|收藏|users加入书籤|\+ bookmarks)
        for (let i = 0; i < ss.length; i++) {
          // 这个是检测是不是有收藏信息
          if (ss.charAt(i) >= '0' && ss.charAt(i) <= '9') {
            // console.log(ss.charAt(i) + " 符合 ss.charAt(i) >= '0' && ss.charAt(i) <= '9' ")
            let numStart = i
            while (++i < ss.length && ss.charAt(i) >= '0' && ss.charAt(i) <= '9')
              // 需要有 2个以上的数字 ,然后后面至少得有两个字符 ,
              if (i - numStart > 2 && i < ss.length - 1) {
                var sAfterNum = ss.substring(i, i + 2)
                if (FileName.bookmarkSet.test(sAfterNum)) {
                  console.log(' 去除了收藏数字相关的尾缀 : ' + ss.substring(numStart, ss.length) + ' , 剩下的tag内容 : ' + ss.substring(0, numStart))
                  // removed.push("后缀:" + ss.substring(numStart));
                  ss = ss.substring(0, numStart)
                  break
                }
              }
          } else {
            // console.log(ss.charAt(i) + " 不符合 ss.charAt(i) >= '0' && ss.charAt(i) <= '9' ")
          }
        }
        // 有时候有空格 , 去掉
        ss = ss.trim()
        if (!set.has(ss)) {
          // console.log(' 暂未出现的tag : ' + ss);
          set.add(ss)
          sj.push(ss)
        } else {
          // console.log(' 已经出现的tag : ' + ss);
          removed.push(ss)
        }
      } else {
        // console.log(" 空的 , 不要 : " + ss)
      }
      if (null != tail) {
        sj.push(tail)
      }

    }
    if (null != pNum) {
      sj.push(pNum)
    }

    result = sj.join(',') + ext
    console.log(' 构建建议的重命名完毕 : ' + result)
    console.log(' 构建后文件名长度 : ' + result.length)
    let diff: string[] = FileName.findDeleteStrList(originStr, result)
    console.log(' [不完全准确,仅供参考]去掉的部分[字符串对比得出] ' + diff.join(' === '))
    if (removed != null && removed.length > 0) {
      console.log(' [不完全准确,仅供参考]去掉的部分[实际的某个tag] : ' + removed.join(' --- '))
    }
    return result
  }

  static dealWithTagList(split: string[], sep: string, set: Set<string>) {

    console.log(' ============================================================================================== ')
    console.log(' set已有的内容 : ')
    console.log(set)

    var sj: string[] = []
    if (split == null || split.length <= 0) {
      return sj
    }
    var originStr = split.join(sep)
    // let originLength = result.length;
    console.log(' 开始构建建议的重命名 , 原tag串 : ')
    console.log(originStr)
    // printPerLine(result, 100);
    console.log(' 原tag串的长度 : ' + originStr.length)
    var removed = []
    // const set = new Set();
    for (let i = 0; i < split.length; i++) {
      let ss: string = split[i]
      // 代码结构暂时不整理了 末尾肯定要加tail , 然后 , 因为剪切和跳过的地方就两个 , 这两个地方记得补一下_width串就好了 ,
      // 然后把他 _width前面加上 , (也就是StringJoiner干的)
      // 1 - 检测 _width[ 标记 , 因为这个不是逗号隔开的,拿出来再放进StringJoiner
      let tail = null
      // 这里_width[放在逗号截取之后的子串内部查询是更好的 , 这样还能少计算一些情况
      // 如果遇到_width[ 和 _压缩率[ 没有粘在一起的情况 , 那么就有点难受了
      if (ss.includes('_width[')) {
        let indexOf_width = ss.indexOf('_width[')
        tail = ss.substring(indexOf_width)
        ss = ss.substring(0, indexOf_width)
      } else if (ss.includes('_压缩率[')) {
        let indexOf_width = ss.indexOf('_压缩率[')
        tail = ss.substring(indexOf_width)
        ss = ss.substring(0, indexOf_width)
      }
      // 这里是为了去掉一些英文tag , 不过只去掉那种好几个英文单词的短语 , 欧美画师加tag喜欢多个单词然后空格隔开 ,
      // 单个英文单词一般都是游戏名或者动漫名 , fgo,nikke,blueArchive 啥的
      if (FileName.notEn.test(ss) && ss.match(FileName.charAppear)) {
        console.log(' 检测到非纯英文单词 且 没有日文的词组或短语(一般是英文短语) , 去掉 : ' + ss)
        removed.push(ss)
        ss = ''
      }

      if (!FileName.StringUtilsisBlank(ss)) {
        // \d{3,}(users入り|收藏|users加入书籤|\+ bookmarks)
        for (let i = 0; i < ss.length; i++) {
          // 这个是检测是不是有收藏信息
          if (ss.charAt(i) >= '0' && ss.charAt(i) <= '9') {
            // console.log(ss.charAt(i) + " 符合 ss.charAt(i) >= '0' && ss.charAt(i) <= '9' ")
            let numStart = i
            while (++i < ss.length && ss.charAt(i) >= '0' && ss.charAt(i) <= '9')
              // 需要有 2个以上的数字 ,然后后面至少得有两个字符 ,
              if (i - numStart > 2 && i < ss.length - 1) {
                var sAfterNum = ss.substring(i, i + 2)
                if (FileName.bookmarkSet.test(sAfterNum)) {
                  var removedTag = ss.substring(numStart, ss.length)
                  console.log(' 去除了收藏数字相关的尾缀 : ' + ss.substring(numStart, ss.length) + ' , 剩下的tag内容 : ' + ss.substring(0, numStart))
                  removed.push(ss.substring(numStart, ss.length))
                  // removed.push("后缀:" + ss.substring(numStart));
                  ss = ss.substring(0, numStart)
                  break
                }
              }
          } else {
            // console.log(ss.charAt(i) + " 不符合 ss.charAt(i) >= '0' && ss.charAt(i) <= '9' ")
          }
        }
        // 有时候有空格 , 去掉
        ss = ss.trim()
        if (!set.has(ss)) {
          // console.log(' 暂未出现的tag : ' + ss);
          set.add(ss)
          sj.push(ss)
        } else {
          // console.log(' 已经出现的tag : ' + ss);
          removed.push(ss)
        }
      } else {
        // console.log(" 空的 , 不要 : " + ss)
      }
      if (null != tail) {
        sj.push(tail)
      }
    }

    var afterStr = sj.join(sep)

    console.log(' 构建建议的tag完毕 , 现tag串 : ')
    console.log(afterStr)
    console.log(' 构建后tag串长度 : ' + afterStr.length)
    let diff = FileName.findDeleteStrList(afterStr, originStr)
    console.log(' [不完全准确,仅供参考]去掉的部分[字符串对比得出] ' + diff.join(' === '))
    if (removed != null && removed.length > 0) {
      console.log(' [不完全准确,仅供参考]去掉的部分[实际的某个tag] : ' + removed.join(' --- '))
    }
    return sj.join(sep)
  }

  constructor() {
    window.addEventListener(EVT.list.previewFileName, () => {
      this.previewFileName()
    })
  }


// 用正则过滤不安全的字符，（Chrome 和 Windows 不允许做文件名的字符）
  // 不安全的字符，这里多数是控制字符，需要替换掉
  private unsafeStr = new RegExp(
    /[\u0001-\u001f\u007f-\u009f\u00ad\u0600-\u0605\u061c\u06dd\u070f\u08e2\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufdd0-\ufdef\ufeff\ufff9-\ufffb\ufffe\uffff]/g
  )
  // 一些需要替换成全角字符的符号，左边是正则表达式的字符
  private fullWidthDict: string[][] = [
    ['\\\\', '＼'],
    ['/', '／'],
    [':', '：'],
    ['\\?', '？'],
    ['"', '＂'],
    ['<', '＜'],
    ['>', '＞'],
    ['\\*', '＊'],
    ['\\|', '｜'],
    ['~', '～']
  ]

  // 把一些特殊字符替换成全角字符
  private replaceUnsafeStr(str: string) {
    str = str.replace(this.unsafeStr, '')
    for (let index = 0; index < this.fullWidthDict.length; index++) {
      const rule = this.fullWidthDict[index]
      const reg = new RegExp(rule[0], 'g')
      str = str.replace(reg, rule[1])
    }
    return str
  }

  // 生成 {index} 标记的值
  private createIndex(data: Result) {
    let index = data.index.toString()
    // 处理在前面填充 0 的情况
    return settings.zeroPadding
      ? index.padStart(settings.zeroPaddingLength, '0')
      : index
  }

  private getNameRule(data: Result) {
    if (Config.fileType.image.includes(data.ext.toLowerCase())) {
      return settings.userSetName || Config.defaultNameRule
    } else {
      return settings.nameruleForNonImages || Config.defaultNameRuleForNonImages
    }
  }

  // 生成文件名，传入参数为图片信息
  public getFileName(data: Result) {
    let result = this.getNameRule(data)

    // 配置所有命名标记
    const cfg = {
      '{postid}': {
        value: data.postId,
        safe: true
      },
      '{post_id}': {
        value: data.postId,
        safe: true
      },
      '{title}': {
        value: data.title,
        safe: false
      },
      '{name}': {
        value: data.name,
        safe: false
      },
      '{ext}': {
        value: data.ext,
        safe: false
      },
      '{index}': {
        value: this.createIndex(data),
        safe: false
      },
      '{tags}': {
        value: data.tags,
        safe: false
      },
      '{date}': {
        value: DateFormat.format(data.date, settings.dateFormat),
        safe: false
      },
      '{task_date}': {
        value: DateFormat.format(store.date, settings.dateFormat),
        prefix: '',
        safe: false
      },
      '{fee}': {
        value: data.fee,
        safe: true
      },
      '{user}': {
        value: data.user,
        safe: false
      },
      '{create_id}': {
        value: data.createID,
        safe: true
      },
      '{uid}': {
        value: data.uid,
        safe: true
      },
      '{user_id}': {
        value: data.uid,
        safe: true
      }
    }

    // 替换命名规则里的特殊字符
    result = this.replaceUnsafeStr(result)
    // 上一步会把斜线 / 替换成全角的斜线 ／，这里再替换回来，否则就不能建立文件夹了
    result = result.replace(/／/g, '/')

    // 把命名规则的标记替换成实际值
    for (const [key, val] of Object.entries(cfg)) {
      // 只有当标记有值时才会进行替换，所以没有值的标记会原样保留
      if (result.includes(key) && val.value !== '' && val.value !== null) {
        let once = String(val.value)

        // 处理标记值中的特殊字符
        if (!val.safe) {
          once = this.replaceUnsafeStr(once)
        }

        result = result.replace(new RegExp(key, 'g'), once) // 将标记替换成最终值，如果有重复的标记，全部替换
      }
    }

    // 处理空值，连续的 '//'。 有时候两个斜线中间的字段是空值，最后就变成两个斜线挨在一起了
    result = result.replace(/undefined/g, '').replace(/\/{2,9}/, '/')

    // 对每一层路径进行处理
    let tempArr = result.split('/')
    tempArr.forEach((str, index, arr) => {
      // 替换路径首尾的空格
      // 把每层路径头尾的 . 变成全角的．因为 Chrome 不允许头尾使用 .
      arr[index] = str.trim().replace(/^\./g, '．').replace(/\.$/g, '．')
    })
    result = tempArr.join('/')

    // 去掉头尾的 /
    if (result.startsWith('/')) {
      result = result.replace('/', '')
    }
    if (result.endsWith('/')) {
      result = result.substr(0, result.length - 1)
    }

    // 添加后缀名
    result += '.' + data.ext
    // 去掉收藏数量,然后给tag去重
    result = FileName.buildNewName(result)
    return result
  }

  // 预览文件名
  private previewFileName() {
    if (store.result.length === 0) {
      return alert(lang.transl('_没有数据可供使用'))
    }

    // 使用数组储存和拼接字符串，提高性能
    const resultArr: string[] = []
    let result = ''

    const length = store.result.length
    if (length < Config.outputMax) {
      for (let i = 0; i < length; i++) {
        const data = store.result[i]
        // 为生成的文件名添加颜色
        const fullName = this.getFileName(data)
        const part = fullName.split('/')
        const length = part.length
        for (let i = 0; i < length; i++) {
          const str = part[i]
          if (i < length - 1) {
            // 如果不是最后一项，说明是文件夹名，添加颜色
            part[i] = `<span class='color666'>${str}</span>`
          } else {
            // 最后一项，是文件名，添加颜色
            part[i] = `<span class='color000'>${str}</span>`
          }
        }
        const fullNameHtml = part.join('/')

        // 保存本条结果
        const nowResult = `<p class='result'>${fullNameHtml}</p>`
        resultArr.push(nowResult)
      }

      // 拼接所有结果
      result = resultArr.join('')
    } else {
      // 不生成 html 标签，只生成纯文本，保存为 txt 文件
      for (let i = 0; i < length; i++) {
        const data = store.result[i]
        const fullName = this.getFileName(data)
        resultArr.push(fullName)
      }

      result = resultArr.join('\n')
    }

    EVT.fire('output', {
      content: result,
      title: '_预览文件名'
    })
  }
}

const fileName = new FileName()
export { fileName }
