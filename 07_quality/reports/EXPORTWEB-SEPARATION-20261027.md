# 独立建站分离验证报告

2026-10-27，开发侧本地验证。代码分离已完成；生产接入、真实客户迁移和正式页面视觉验收尚未完成。

## 固定来源与产品边界

来源：LGA main `8f3c988fbecc8fb8051fbbf3652a11fbccce1dfb`。独立工程 `C:\098_pmo\06ExportWeb`，远端 `pmodev988/exportweb`，API/Web 0.1.0。初始提取来源见 `04_contracts/LGA-SOURCE-MANIFEST.json`，该清单记录初始复制，不代表后续新增文件清单。

正式 Vue 工作台包括公司及产品、目标市场、多网站编辑、布局模板、语言、素材、版本、导入、源码导出、发布及网站询盘；正式 Java API/Worker 独立运行。构建仅引用本工程内源码和本地复制的公共体验包，无 LGA 路径或运行服务依赖。历史原型依赖文件仅用于抽取样式和目录，不作为业务后台运行。

独立目录 302、OIDC、数据库、对象前缀、队列和运行签名身份。301 权益不授予 302；公司与市场在两个产品中各自保存，未实现双向同步。获客、CRM、数字员工和销售数据不进入迁移后的建站工作区。登录、目录登记和数据导入均不产生购买权益。

## 已完成检查

工具：Windows Node 24.19.0、Java 25、Maven 3.9.16；WSL PostgreSQL 18.6。Git 由 rls@Ubuntu-rls-260921 操作共享源码。

| 范围 | 通过 | 失败 | 跳过 | 说明 |
|---|---:|---:|---:|---|
| ExportWeb 前端 | 52 | 0 | 0 | 11 文件；包含目标市场、网站编辑、询盘保存与失败保留 |
| ExportWeb Java / PostgreSQL | 80 | 0 | 1 | 81 项；真实 MinIO 联验未执行 |
| 迁移 Python | 3 | 0 | 0 | 组织边界、净化、拒绝覆盖 |
| PostgreSQL 迁移往返 | 1 | 0 | 0 | 合成数据；源库只读、版本/发布/询盘保留、目标重复拒绝及 RLS |
| LGA 前端回归 | 71 | 0 | 0 | 14 文件；入口移除、原网站配置保留 |
| LGA Java / PostgreSQL | 102 | 0 | 8 | 110 项；本地公海 1 项、真实基础设施 7 项未执行 |
| OPS Identity 目录与迁移 | 11 | 0 | 0 | V47→V48、编号与组织/服务商不自动赋权 |

ExportWeb 和 LGA 类型检查、正式前端构建及 clean JAR 打包通过。JAR 内全部工作台文件与对应前端构建逐字节一致：ExportWeb 24 文件，LGA 140 文件，无缺失、旧残留或不同字节。初次 ExportWeb 打包发现旧哈希资源残留，已 clean 重建并重新核对。

工件大小、SHA-256、迁移摘要、测试套件及原始 XML 摘要见 [机器可读证据](exportweb-separation-20261027.json)。工件保存在 `21_client/exportweb-api-0.1.0.jar`，不入 Git。

原始日志和 XML：`21_client/qa-exportweb-20261027/`、`21_client/build-web-final.log`、`21_client/build-api-final.log`。复验命令：前端 `npm test` / `npm run build`；后端在本地测试数据库环境执行 `mvn test`；迁移 `python -m unittest discover -s 06_infra/migration -p test_prepare_import.py` 及 WSL `python3 06_infra/migration/test_postgres_roundtrip.py`。端口及合成范围见脚本，禁止直接对生产运行测试。

## 未执行门禁

| 门禁 | 当前状态与影响 | 关闭要求 |
|---|---|---|
| 正式构建与定稿原型同视口对照 | NOT_RUN；本次浏览器未取得本地页面访问，不能将 jsdom/编译当视觉验收 | 桌面、窄屏、三语、主题、身份信息、全部修改页面配对截图及操作记录 |
| 真实 OPS 302 OIDC/授权 | NOT_RUN；无生产运行入口、专用凭据及实际权益 | 独立身份、登录与撤权、跨组织拒绝、301 不可借权 |
| MinIO / RabbitMQ / AIRouter | NOT_RUN；服务代码已分离，真实链路未验 | 独立 bucket/vhost/凭据、任务前后授权、对象写读、AI 策略与失败恢复 |
| 真实客户迁移 | NOT_RUN；只有合成数据证据 | 组织清单、备份恢复、对象逐个哈希、计数、域名、语言、版本和询盘核对 |
| 宣传站商务与域名 | NOT_IMPLEMENTED / NOT_RUN | OPS 支付、会员增购 95 折、服务商域名页面及两个宣传域名接入另行完成 |

不先切断生产 LGA 建站入口。先接入并验收 ExportWeb，再迁移存量网站并切换入口，最后部署 LGA 0.1.24。旧数据和已发布快照保留，失败默认暂停并向前修复。现有 LGA 数字员工仍读历史网站配置，新建站数据与 LGA 数字员工自动同步不在本次实现中。

## 发布申请范围

提交源码、接入表和协调发布准备，状态为 SUBMITTED / 部署门禁未关闭。没有部署、DNS 变更、商户交易、真实客户迁移或自动授权。生产完成状态由 RLS 的后续回执记录。
