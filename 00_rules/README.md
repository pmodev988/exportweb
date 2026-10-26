# ExportWeb 工程规则

- 新工程路径与仓库由用户明确指定；按 LGA 编号目录结构初始化，未复制凭据、生产数据或依赖目录。
- 技术基线沿用已提取的 LGA 正式建站模块：Node 24 / Vue、Java 25 / Spring Boot、PostgreSQL 18、MinIO、RabbitMQ。
- 业务执行在 ExportWeb；管理页面、管理员权限、审批、目录、域名治理、订阅和支付在 OPS，遵守 `C:\099_cmn\80OPS\00_rules\OPS-RULE-0001_product-management-boundary_v1.0_20260922.md`。
- tenant 只表示整数服务商；组织 UUID 使用 orgId，运行工作区 UUID 使用 runtimeScopeId。302 单独授权，不借用 301。
- 单代理；共同工作区；Git 通过 rls@Ubuntu-rls-260921；不覆盖或夹带其他成员修改。
- 敏感数据、密钥、依赖及交付工件不入 Git。旧 LGA 迁移不可改写；ExportWeb 在自己的空库初始化。
- 正式页面沿用已确认 LGA 建站设计；本次授权变化为产品边界、导航与独立询盘入口。发布前对照桌面/窄屏、编辑、目标市场、预览和版本恢复，不用编译代替视觉验收。
- 发布由 99rls；默认向前修复，不自动回退或删除业务数据；失败时暂停切换并核对两侧写入。
- 文档 Markdown / HTML 同步。目录保留规则、计划、需求、设计、契约、代码、基础设施、质量、运维、报告、日志、交付等编号。
