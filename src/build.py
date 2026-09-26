#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 src/ 下的模板与资源合并成一个单文件 HTML。

用法:  python build.py
输出:  今天干嘛.html (同时复制到桌面)
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
OUT_NAME = "今天干嘛.html"
OUT = os.path.join(HERE, OUT_NAME)
DESKTOP = os.path.join(os.path.expanduser("~"), "Desktop")


def read(name):
    with open(os.path.join(SRC, name), "r", encoding="utf-8") as f:
        return f.read()


def main():
    tpl = read("tpl.html")
    parts = {
        "/*CSS*/": read("style.css"),
        "/*POOL*/": read("pool.js"),
        "/*IDEAS*/": read("ideas.js"),
        "/*APP*/": read("app.js"),
    }
    for token, content in parts.items():
        if token not in tpl:
            print("!! 模板里找不到占位符 " + token)
            return 1
        tpl = tpl.replace(token, content, 1)

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(tpl)

    size = os.path.getsize(OUT)
    print("已生成: " + OUT)
    print("体积: %.1f KB" % (size / 1024.0))

    if os.path.isdir(DESKTOP):
        dst = os.path.join(DESKTOP, OUT_NAME)
        shutil.copyfile(OUT, dst)
        print("已复制到桌面: " + dst)
    else:
        print("!! 桌面目录不存在: " + DESKTOP)

    # 顺便统计条目数
    pool = read("pool.js")
    ideas = read("ideas.js")
    print("内容池条目: 约 %d 条" % pool.count('\n["'))
    print("灵感条目:   约 %d 条" % ideas.count('\n["'))
    return 0


if __name__ == "__main__":
    sys.exit(main())
