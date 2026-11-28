#!/usr/bin/env python3
"""重新生成 v3 标题字体子集（思源黑体 / Noto Sans SC，Black 900，SIL OFL 1.1）。

用法：
  pip install fonttools brotli
  python3 scripts/build-display-font.py /path/to/NotoSansSC[wght].ttf

源字体来自 https://github.com/google/fonts/tree/main/ofl/notosanssc 。
脚本收集 v3/ 下所有源码里出现的字符（加上 ASCII 与常用全角标点），
固定字重为 900 并裁成 v3/assets/fonts/starfall-display-900.woff2。
新增文案后重新运行即可；子集外的字会自动回退到系统字体。
"""
import glob, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V3 = os.path.join(ROOT, "v3")
OUT = os.path.join(V3, "assets", "fonts", "starfall-display-900.woff2")

def collect():
    text = ""
    for pattern in ("*.js", "*.html", "*.css", "*.json"):
        for path in glob.glob(os.path.join(V3, pattern)):
            with open(path, encoding="utf-8", errors="ignore") as f:
                text += f.read()
    chars = {c for c in text if ord(c) > 0x2000}
    chars |= {chr(i) for i in range(0x20, 0x7F)}
    chars |= set("，。、；：？！“”‘’（）《》〈〉【】—…·～％＋－×÷￥")
    return "".join(sorted(chars))

def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    source = sys.argv[1]
    with tempfile.TemporaryDirectory() as tmp:
        chars = os.path.join(tmp, "chars.txt")
        with open(chars, "w", encoding="utf-8") as f:
            f.write(collect())
        fixed = os.path.join(tmp, "fixed.ttf")
        subprocess.run(["fonttools", "varLib.instancer", "-q", source, "wght=900", "-o", fixed], check=True)
        subprocess.run(["pyftsubset", fixed, f"--text-file={chars}", "--flavor=woff2", "--layout-features=kern,palt,liga", f"--output-file={OUT}"], check=True)
    print(OUT, os.path.getsize(OUT), "bytes")

if __name__ == "__main__":
    main()
