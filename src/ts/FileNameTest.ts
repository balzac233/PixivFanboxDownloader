// 生成文件名

class FileNameTest {

  static customBitSet: number[] = new Array(4).fill(0);

  static {
    FileNameTest.add2CustomBitSet('\\');
    FileNameTest.add2CustomBitSet('/');
    FileNameTest.add2CustomBitSet(':');
    FileNameTest.add2CustomBitSet('?');
    FileNameTest.add2CustomBitSet('"');
    FileNameTest.add2CustomBitSet('<');
    FileNameTest.add2CustomBitSet('>');
    FileNameTest.add2CustomBitSet('*');
    FileNameTest.add2CustomBitSet('|');
    FileNameTest.add2CustomBitSet('~');
  }

  private static add2CustomBitSet(c: string): void {
    const charCode = c.charCodeAt(0);
    FileNameTest.customBitSet[charCode >> 5] |= 1 << (charCode & 31);
  }

  public static containCustomBitSet(c: string): boolean {
    const charCode = c.charCodeAt(0);
    return (FileNameTest.customBitSet[charCode >> 5] & (1 << (charCode & 31))) !== 0;
  }

  public static turnToSafeWindowsStr(s: string): string {
    const charArray = Array.from(s);
    let hasChange = false;
    for (let i = 0; i < charArray.length; i++) {
      const c = charArray[i];
      if (c.charCodeAt(0) < 128 && FileNameTest.containCustomBitSet(c)) {
        charArray[i] = String.fromCharCode(c.charCodeAt(0) + 0xfee0);
        hasChange = true;
      }
    }
    return hasChange ? charArray.join('') : s;
  }
}

// 测试代码
const safeStr = FileNameTest.turnToSafeWindowsStr('rgsdg\\rsgserg/srgdsrg:dsrgdrsg?rgd');
console.log(safeStr);