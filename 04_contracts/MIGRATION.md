# LGA → ExportWeb 组织级建站迁移

## 迁移范围

复制公司/产品、目标市场、网站及页面 ID、设计、语言、公开站点快照、网站版本、素材元数据和网站询盘。剔除获客任务、CRM、销售团队、销售目标、数字员工配置、社媒账号和自动化渠道。询盘原文及状态保留，CRM company_id 重建为 inquiry-{id}，不带出旧客户管理关联。LGA 的原数据不删除。

公司与市场也是 LGA 获客的输入，原工程继续保留；迁出后两个产品独立维护，未实现双向同步。旧站访问在切换前继续由 LGA 已发布快照提供；LGA 新上传素材单独标识 lga-business，防止改写旧站同名素材。

## 工具与步骤（由发布方执行）

1. 保存组织清单、原域名/授权映射、旧应用和数据库/对象备份；验证恢复。暂停该组织两端写入，排空或停止旧网站 IMPORT/EDIT/TRANSLATE/ARTICLE 任务，防止迁移窗口数据漂移。
2. 使用受限账号，`psql -X -qAt -v tenant_id=<服务商整数> -v org_id=<组织UUID> -f 06_infra/migration/export-lga-website.sql` 输出私有 source.json。脚本只读事务；原项目 JSON 包含 LGA 私有字段，导出文件不得发布或提交 Git。
3. `python 06_infra/migration/prepare_import.py source.json <新的私有输出目录> --tenant <整数> --org <UUID>`。生成净化后的 bundle.json、assets.json、import.sql、manifest.json；组织不符、未知顶层字段或不明素材所有权直接拒绝。
4. 按 assets.json 将原 MinIO 对象复制到独立 bucket / exportweb 前缀，逐个核对字节数和 SHA-256。脚本不代替对象传输与校验，不清理原对象。
5. 目标必须是新的 302 工作区；`psql -X -v ON_ERROR_STOP=1 -f import.sql` 在事务内加组织锁，拒绝覆盖已有项目、发布、版本、素材、询盘或任务。保留原版本号、ID 和时间。
6. 验证读取、保存、版本恢复、每个域名/语言公开页、静态资源、询盘表单、源码导出与目标市场；301 权益不能访问 302。核对公司/市场/页面/版本/询盘计数、哈希及素材引用。
7. OPS 登记自己的 302 授权、运行入口及组织域名，RLS 协调代理/DNS/TLS切换。客户验证通过后才部署 LGA 移除建站入口的版本。切换后所有编辑在 ExportWeb 执行。

迁移不自动产生购买、订单、优惠或会员权益。存量用户权益映射须按真实商业记录登记，不能把全量 LGA 用户自动开通为建站会员。

## 验证与失败处理

本地 PostgreSQL 18 合成数据已验证导出→净化→导入、版本/发布/询盘保留、组织隔离、重复拒绝和源数据不变，见 `06_infra/migration/test_postgres_roundtrip.py`。它固定本地 QA 端口和数据库，禁止用于生产。

生产行数、对象哈希和真实用户验收尚未执行。默认暂停切换并向前修；若必须恢复旧应用或路由，先收集新侧写入并人工核对，不回退数据库，不用旧快照覆盖切换后的内容。
