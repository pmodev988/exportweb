独立展示网站 / Standalone display website

本 ZIP 包含所选发布语言的全部公开页面、网站样式与脚本、图片、视频及视频封面。展示资源使用包内相对路径，不需要 独立建站 账号、平台接口或数据库即可访问。
联系方式沿用网站中选定的邮箱、电话及其他联系链接。打开邮箱软件、拨打电话或访问外部联系服务需要相应应用/网络。
不包含询盘收集、AI 接待、编辑后台或数据库。下载不等于已经上线。
隐藏页面和未选择的语言不公开。publication.json 记录实际语言、页面、文件 SHA-256 及导出版本；不含账号、密钥或业务工作区。

常用的五个场景

1. 本机查看
   将整个 ZIP 解压到一个文件夹，再打开 index.html。切勿直接在压缩包内打开单个 HTML。
   检查菜单、详情、语言切换、图片和视频。部分浏览器对本机媒体有限制，可使用已有的网站服务预览。

2. 部署到我们自己的 server
   为本站创建独立目录，上传整个解压后的文件夹。
   由管理员将网站域名的站点根目录设置为包含 index.html 的目录，默认首页设为 index.html。
   完成域名解析、HTTPS 证书及网站服务接入。这个静态站不需要运行 独立建站 后台。
   访问 https://你的网站域名/，检查各语言页面和媒体；以实际访问为上线依据。

3. 部署到其他网站空间或子目录
   上传全部文件和目录，保持目录结构；可放在网站根目录或指定子目录。
   使用静态文件服务，不要把所有地址重写成首页。服务器应提供正确的 HTML、CSS、JavaScript、图片、MP4/WebM 内容类型，并支持视频范围请求。
   不要只上传 index.html；assets、各语言目录及样式/脚本文件都是网站的一部分。

4. 更新与恢复
   在编辑器保存当前网站后重新下载 ZIP。
   解压到新的版本目录，检查后由管理员将网站根目录切换到新目录。
   保留上一版目录，发现问题可切回。不要在上传未完成时覆盖正在访问的目录。

5. 下载失败或媒体缺失
   导出会指出具体页面和素材；在“内容详情”中上传或替换后重试。
   未读取媒体占位、YouTube/Vimeo 等播放器不能充当本地视频，请换成有权使用的 MP4/WebM 文件。
   过大文件应先压缩，上限由部署配置控制。不要把缺文件的包称为完整版。
   成功导出后，断开外部网络仍可浏览包内页面和媒体；外部通讯链接按其正常方式打开。

平台托管是另一条方式：管理员完成组织网站域名登记、解析、HTTPS 和入口配置后，在编辑器点击“发布网站/更新网站”，无需手工上传本 ZIP。

English quick start: Extract all files. Serve the directory containing index.html as a static website (root or subdirectory), with HTTPS and correct media MIME types/range requests. Keep every language directory and assets. No platform account, API or database is required for the display pages. Email, telephone and external contact links retain their normal behavior. No inquiry/AI backend is included. Downloading does not deploy the site. Verify file checksums in publication.json; upload updates into a new directory before switching the document root.
