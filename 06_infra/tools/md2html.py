#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
md2html.py — 把工程 Markdown 文档转成自包含 HTML（带大纲 / 换肤 / 代码高亮）

用法:
    python3 md2html.py <input.md> [input2.md ...]
    python3 md2html.py --all <dir>        # 递归转换目录下全部 .md

输出:
    与输入同目录的同名 .html

特性:
    - 自包含单文件，不加载任何外部资源（离线可读、可直接交付客户）
    - 换肤: 跟随系统 + 手动切换(明/暗/护眼)，选择持久化
    - 左侧大纲 TOC，滚动联动高亮
    - 代码高亮 (Pygments)，明暗两套配色
    - 表格 / 引用 / 任务列表 / 脚注
    - 响应式: 窄屏自动收起大纲
"""
import sys, os, re, io, html

try:
    import markdown
    from markdown.extensions.toc import TocExtension
except ImportError:
    sys.exit("缺少依赖: pip install markdown pygments")

try:
    from pygments.formatters import HtmlFormatter
    PYG_LIGHT = HtmlFormatter(style="default").get_style_defs(".codehilite")
    PYG_DARK  = HtmlFormatter(style="monokai").get_style_defs(".codehilite")
except ImportError:
    PYG_LIGHT = PYG_DARK = ""

TEMPLATE = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
:root{
  --bg:#ffffff; --bg-side:#f7f8fa; --bg-code:#f4f6f8; --bg-hover:#eef1f5;
  --fg:#1c2028; --fg-2:#4d5666; --fg-3:#868f9d;
  --bd:#e2e6ec; --bd-2:#c9d0da; --ac:#2f6fdb; --ac-soft:#e8f0fe;
  --ok:#1f9d5f; --warn:#b3781a; --danger:#d0483d;
}
:root:not([data-theme="light"]):not([data-theme="sepia"]){ color-scheme:light }
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]):not([data-theme="sepia"]){
    color-scheme:dark;
    --bg:#16181d; --bg-side:#1b1e24; --bg-code:#12151a; --bg-hover:#262b33;
    --fg:#e6e9ef; --fg-2:#a8b0bd; --fg-3:#6b7482;
    --bd:#2b3038; --bd-2:#3a414c; --ac:#5b9dff; --ac-soft:#1e3354;
    --ok:#4ec98a; --warn:#e8b552; --danger:#f0736a;
  }
}
[data-theme="dark"]{
  color-scheme:dark;
  --bg:#16181d; --bg-side:#1b1e24; --bg-code:#12151a; --bg-hover:#262b33;
  --fg:#e6e9ef; --fg-2:#a8b0bd; --fg-3:#6b7482;
  --bd:#2b3038; --bd-2:#3a414c; --ac:#5b9dff; --ac-soft:#1e3354;
  --ok:#4ec98a; --warn:#e8b552; --danger:#f0736a;
}
[data-theme="sepia"]{
  color-scheme:light;
  --bg:#f9f3e7; --bg-side:#f2ead9; --bg-code:#efe6d3; --bg-hover:#ece0c9;
  --fg:#3a3228; --fg-2:#6b5f4d; --fg-3:#968873;
  --bd:#ded2ba; --bd-2:#c9b995; --ac:#a0702a; --ac-soft:#f0e2c8;
  --ok:#5f7d3a; --warn:#a8791f; --danger:#b04a36;
}
*,*::before,*::after{box-sizing:border-box}
body{
  margin:0; background:var(--bg); color:var(--fg);
  font:15px/1.75 "Segoe UI","Microsoft YaHei UI","Yu Gothic UI",system-ui,-apple-system,sans-serif;
}
img{max-width:100%}
[hidden]{display:none!important}
.wrap{display:flex;min-height:100vh;align-items:flex-start}

/* 大纲 */
.toc{
  position:sticky; top:0; align-self:flex-start; flex:0 0 268px; width:268px; max-height:100vh;
  overflow-y:auto; padding:22px 12px 40px; background:var(--bg-side);
  border-right:1px solid var(--bd); font-size:13px;
}
.toc .tt{font-size:11px;letter-spacing:.9px;text-transform:uppercase;color:var(--fg-3);
  font-weight:700;padding:0 10px 10px}
.toc ul{list-style:none;margin:0;padding:0}
.toc li a{
  display:block;padding:4px 10px;border-radius:6px;color:var(--fg-2);text-decoration:none;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.toc li a:hover{background:var(--bg-hover);color:var(--fg)}
.toc li a.active{background:var(--ac-soft);color:var(--ac);font-weight:600}
.toc ul ul a{padding-left:24px;font-size:12.5px}
.toc ul ul ul a{padding-left:40px;font-size:12.5px;color:var(--fg-3)}

/* 正文 */
.main{flex:1;min-width:0;display:flex;justify-content:center;padding:0 28px}
.doc{width:100%;max-width:860px;padding:34px 0 90px}
.bar{
  display:flex;align-items:center;gap:8px;margin-bottom:26px;padding-bottom:14px;
  border-bottom:1px solid var(--bd);
}
.bar .sp{flex:1}
.bar button{
  font:inherit;font-size:12px;padding:4px 11px;border-radius:6px;cursor:pointer;
  background:var(--bg-side);border:1px solid var(--bd);color:var(--fg-2);
}
.bar button:hover{border-color:var(--bd-2);color:var(--fg)}
.bar button[aria-pressed="true"]{background:var(--ac);border-color:var(--ac);color:#fff;font-weight:600}
.bar .tocbtn{display:none}

h1,h2,h3,h4{line-height:1.35;scroll-margin-top:20px}
h1{font-size:1.95em;margin:0 0 20px;padding-bottom:12px;border-bottom:2px solid var(--bd)}
h2{font-size:1.45em;margin:42px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--bd)}
h3{font-size:1.18em;margin:30px 0 11px}
h4{font-size:1.04em;margin:22px 0 9px;color:var(--fg-2)}
p{margin:0 0 15px}
ul,ol{margin:0 0 15px;padding-left:26px}
li{margin-bottom:6px}
li>ul,li>ol{margin-top:6px}
a{color:var(--ac)}
hr{border:none;border-top:1px solid var(--bd);margin:34px 0}
blockquote{
  margin:0 0 15px;padding:10px 18px;border-left:3px solid var(--ac);
  background:var(--bg-side);border-radius:0 8px 8px 0;color:var(--fg-2);
}
blockquote p:last-child{margin-bottom:0}
strong{font-weight:650;color:var(--fg)}

table{border-collapse:collapse;width:100%;margin:0 0 18px;font-size:.93em;display:table}
.tablewrap{overflow-x:auto;margin:0 0 18px}
.tablewrap table{margin:0}
th,td{border:1px solid var(--bd);padding:8px 12px;text-align:left;vertical-align:top}
th{background:var(--bg-side);font-weight:650;white-space:nowrap}
tr:nth-child(even) td{background:color-mix(in srgb,var(--bg-side) 45%,transparent)}

code{background:var(--bg-code);padding:2px 6px;border-radius:4px;font-size:.87em;
  font-family:"Cascadia Code",Consolas,"Courier New",monospace}
pre{background:var(--bg-code);border:1px solid var(--bd);border-radius:8px;
  padding:14px 16px;overflow-x:auto;margin:0 0 18px;line-height:1.6}
pre code{background:none;padding:0;font-size:12.8px}
.codehilite{background:var(--bg-code);border:1px solid var(--bd);border-radius:8px;
  margin:0 0 18px;overflow-x:auto}
.codehilite pre{border:none;margin:0;background:none}

footer{margin-top:60px;padding-top:18px;border-top:1px solid var(--bd);
  font-size:12px;color:var(--fg-3)}

@media (max-width:1080px){
  .toc{position:fixed;left:0;top:0;bottom:0;z-index:20;box-shadow:0 0 40px rgba(0,0,0,.25)}
  .toc[hidden]{display:none}
  .bar .tocbtn{display:inline-block}
  .main{padding:0 18px}
}
@media print{
  .toc,.bar{display:none}
  .main{padding:0}
  body{font-size:11pt}
}
</style>
<style id="pyg-light">__PYG_LIGHT__</style>
<style id="pyg-dark" media="not all">__PYG_DARK__</style>
</head>
<body>
<div class="wrap">
  <nav class="toc" id="toc">
    <div class="tt">目录</div>
    __TOC__
  </nav>
  <div class="main">
    <article class="doc">
      <div class="bar">
        <button class="tocbtn" id="tocBtn">☰ 目录</button>
        <span class="sp"></span>
        <button data-t="auto"  aria-pressed="true">跟随系统</button>
        <button data-t="light" aria-pressed="false">明亮</button>
        <button data-t="dark"  aria-pressed="false">暗色</button>
        <button data-t="sepia" aria-pressed="false">护眼</button>
        <button id="printBtn">🖨 打印</button>
      </div>
      __BODY__
      <footer>__FOOTER__</footer>
    </article>
  </div>
</div>
<script>
(function(){
  var root=document.documentElement, KEY="fde-doc-theme";
  var pygDark=document.getElementById("pyg-dark"), pygLight=document.getElementById("pyg-light");
  function syncPyg(){
    var t=root.getAttribute("data-theme");
    var dark = t==="dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches);
    pygDark.media = dark ? "all" : "not all";
    pygLight.media = dark ? "not all" : "all";
  }
  function setTheme(t){
    if(t==="auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme",t);
    [].forEach.call(document.querySelectorAll("[data-t]"),function(b){
      b.setAttribute("aria-pressed", String(b.dataset.t===t));
    });
    try{ localStorage.setItem(KEY,t); }catch(e){}
    syncPyg();
  }
  try{ var s=localStorage.getItem(KEY); if(s) setTheme(s); else syncPyg(); }catch(e){ syncPyg(); }
  [].forEach.call(document.querySelectorAll("[data-t]"),function(b){
    b.onclick=function(){ setTheme(b.dataset.t); };
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncPyg);

  document.getElementById("printBtn").onclick=function(){ window.print(); };
  var toc=document.getElementById("toc"), tb=document.getElementById("tocBtn");
  if(tb) tb.onclick=function(){ toc.hidden=!toc.hidden; };
  if(window.innerWidth<=1080 && toc) toc.hidden=true;

  // 表格横向滚动包裹
  [].forEach.call(document.querySelectorAll(".doc table"),function(t){
    if(t.parentNode.classList.contains("tablewrap")) return;
    var w=document.createElement("div"); w.className="tablewrap";
    t.parentNode.insertBefore(w,t); w.appendChild(t);
  });

  // 大纲滚动联动
  var links=[].slice.call(document.querySelectorAll(".toc a"));
  var heads=links.map(function(a){ return document.getElementById(a.getAttribute("href").slice(1)); })
                 .filter(Boolean);
  if(heads.length){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        links.forEach(function(a){
          a.classList.toggle("active", a.getAttribute("href").slice(1)===e.target.id);
        });
      });
    },{rootMargin:"0px 0px -72% 0px",threshold:0});
    heads.forEach(function(h){ io.observe(h); });
  }
})();
</script>
</body>
</html>
"""

def convert(path):
    src = io.open(path, encoding="utf-8").read()
    md = markdown.Markdown(extensions=[
        "extra", "sane_lists", "attr_list", "admonition", "md_in_html",
        "codehilite", TocExtension(toc_depth="2-4", permalink=False),
    ], extension_configs={"codehilite": {"guess_lang": False}})
    body = md.convert(src)
    toc = getattr(md, "toc", "") or ""

    m = re.search(r"^#\s+(.+)$", src, re.M)
    title = m.group(1).strip() if m else os.path.splitext(os.path.basename(path))[0]

    out = (TEMPLATE
           .replace("__TITLE__", html.escape(title))
           .replace("__TOC__", toc)
           .replace("__BODY__", body)
           .replace("__PYG_LIGHT__", PYG_LIGHT)
           .replace("__PYG_DARK__", PYG_DARK)
           .replace("__FOOTER__", html.escape(
               "%s · 由 06_infra/tools/md2html.py 从同名 Markdown 生成，请勿直接编辑 HTML"
               % os.path.basename(path))))

    dst = os.path.splitext(path)[0] + ".html"
    io.open(dst, "w", encoding="utf-8").write(out)
    return dst, len(out.encode("utf-8"))

def main(argv):
    if not argv:
        sys.exit(__doc__)
    targets = []
    if argv[0] == "--all":
        root = argv[1] if len(argv) > 1 else "."
        for dp, _, fns in os.walk(root):
            for fn in fns:
                if fn.lower().endswith(".md"):
                    targets.append(os.path.join(dp, fn))
    else:
        targets = argv
    if not targets:
        sys.exit("没有找到 .md 文件")
    for t in targets:
        dst, n = convert(t)
        print("  [OK] %s  ->  %s  (%.1f KB)" % (os.path.basename(t), os.path.basename(dst), n/1024))

if __name__ == "__main__":
    main(sys.argv[1:])
