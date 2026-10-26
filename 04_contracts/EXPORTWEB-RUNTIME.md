# ExportWeb 运行接入

## 身份与边界

目录 302，OIDC client `exportweb-web`，callback `/login/oauth2/code/exportweb`；运行签名 consumer 为字符串 `302`，载荷产品编号为数字 302。通过现有 OPS `/internal/v2/runtime/service-domain-resolve` 和组织授权契约核验真实服务商、组织及 runtimeScopeId。每次业务请求和任务执行核验授权；没有有效 302 权益即拒绝。只对组织用户开放。

运行端不设管理后台，不保存订单或商户密钥。独立建站单独购买，有效会员增购享 95 折的商业规则由 OPS 核验后授予 302，不能在前端或迁移时赋权。当前新增 OPS V48 只登记目录，不授予任何会员、服务商或组织权益。

## 部署

API `exportweb-api.service`，worker `exportweb-worker.service`，均使用 `exportweb-api-0.1.0.jar`。API 回环端口 8098，工作台 `/workspace/`，健康检查 `/health`，公开网站 `/` 与 `/p/**`，询盘 `/inquiry`。systemd 样例位于 `06_infra/systemd`，尚未安装到生产。

独立 PostgreSQL 18 数据库与运行账号，禁止 superuser / BYPASSRLS；Flyway V1–V6，另有 Spring Session 迁移。所有 exportweb_* 业务表按服务商/组织隔离。不得把程序接到 LGA 生产库。

独立 MinIO bucket / 凭据，键前缀 `exportweb/{tenantId}/{orgId}/{assetId}`；独立 RabbitMQ vhost / 凭据，队列 `exportweb.business`。不使用默认 guest 凭据投产。部署中使用自己的 OIDC secret、Identity 签名文件和 AIRouter 服务凭据，不复用 LGA 身份。

## 配置

完整名称见 `05_code/exportweb-api/src/main/resources/application.properties`。必填：EXPORTWEB_DATABASE_URL / USER / PASSWORD、EXPORTWEB_OIDC_SECRET、EXPORTWEB_IDENTITY_ISSUER / INTERNAL_URL / KEY_FILE、EXPORTWEB_MEDIA_ENDPOINT / BUCKET / CREDENTIALS_FILE、EXPORTWEB_QUEUE_ADDRESS / USER / PASSWORD / VHOST。AI 功能还需 EXPORTWEB_AIR_URL / CREDENTIALS_DIRECTORY。所有秘密由 RLS 安全下发，不入 Git。

可选限额：EXPORTWEB_PORT、MEDIA_MAX、IMPORT_MAX_PAGES / BYTES、EXPORT_MAX_ASSET_BYTES / TOTAL_BYTES / SECONDS、INQUIRY_MAX_PER_HOUR。健康检查不替代真实授权、素材、AI 或发布测试。

## 域名

2026-10-27 用户最终确认：

| 地址 | 用途 |
|---|---|
| `l3.pmo.dev` | 302 / export-web 独立建站服务，工作台路径 `/workspace/` |
| `web.export.pmo.dev` | 独立站宣传网站 |
| `ai.export.pmo.dev` | LGA 宣传网站 |

OPS Identity V49 将 302 的目录名称更新为 export-web、默认子域名更新为 l3，服务类型为服务、计费方式为月租和用量、是否投产及支持 AIRouter 标记为是。目录保存子域名标签；默认根域名 pmo.dev 对应完整运行地址 l3.pmo.dev。

302 的共享运行入口 `l3.pmo.dev`、组织精确域名、证书和 OIDC 回调 `https://l3.pmo.dev/login/oauth2/code/exportweb` 由 OPS 平台指派及 RLS 接入。两个宣传域名不绑定为工作台或客户网站。目录默认值与投产标记不代表域名已指派或已部署，不自动授予服务商、组织或会员权益；运行端继续使用 OPS 下发的实际入口，不硬编码跳转。

## 发布前门禁

真实 302 OIDC / 授权拒绝与通过、MinIO 写读、RabbitMQ 执行、AIRouter 策略执行、正式页面对照、迁移校验和域名切换均待完成。当前仅提交接入与发布准备，不标记已上线。
