# ExportWeb · 独立网站

独立建站工程，包含公司及产品、目标市场、网站编辑、模板、语言、素材、内容版本、发布、源码导出和网站询盘。

- 工作区：`C:\098_pmo\06ExportWeb`；仓库：https://github.com/pmodev988/exportweb
- 业务前端：`05_code/exportweb-web`；业务服务与后台任务：`05_code/exportweb-api`。
- 管理、身份、目录、域名和商务由统一 OPS 提供；本产品使用独立的 302 身份。购买 LGA 不自动获得建站权限。
- 从 LGA `8f3c988fbecc8fb8051fbbf3652a11fbccce1dfb` 提取并适配；构建和运行不访问 LGA 工程目录、数据库或消息队列。

## 构建

Node 24、Java 25、Maven 3.9.16。先在 `05_code/exportweb-web` 执行 `npm ci --ignore-scripts --no-audit --no-fund`、`npm run build`；再在 `05_code/exportweb-api` 执行 `mvn -B -ntp clean package -DskipTests`。Web 打包进 JAR。可用 `06_infra/wsl/build-product.sh`。

产物放 `21_client`，不提交 Git。运行前依照[接入契约](04_contracts/EXPORTWEB-RUNTIME.md)配置独立数据库、身份、存储和队列。

## 交接

- [分离与迁移](04_contracts/MIGRATION.md)
- [验证报告](07_quality/reports/EXPORTWEB-SEPARATION-20261027.md)
- [迭代状态](01_plan/iterations/IT-001/ACT.md)

当前为已构建、已做本地回归的源码交付；生产接入、客户数据迁移及正式页面对照验收尚未完成。发布由 99rls 协调，不能先撤下 LGA 的建站功能再准备新产品。
