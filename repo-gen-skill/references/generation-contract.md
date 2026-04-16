# 生成协议

## 固定模板
- 模板名固定为 `template-v1`。
- 模板来源固定为 skill 自带的 `assets/template-v1-source/`。
- 首版只支持当前这一套 Bun + Hono + React + shared types monorepo。

## 输入字段
| 字段 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `repoName` | 是 | 无 | 仓库展示名，同时用于派生包名 slug |
| `targetPath` | 是 | 无 | 目标目录 |
| `description` | 否 | `<repoName> 初始化仓库` | 根 `package.json` 和 README 描述 |
| `includeClient` | 否 | `true` | 是否保留 `apps/client` |
| `includeServer` | 否 | `true` | 是否保留 `apps/server` |
| `includeSharedPackage` | 否 | `true` | 是否保留 `packages/types` |
| `serverPort` | 否 | `3000` | 服务端端口，同时用于 README 和前端代理 |

## 归一化规则
- 将 `repoName` 额外派生出 `repoSlug`：
  - 全部转小写。
  - 非字母数字字符替换为 `-`。
  - 收尾多余 `-` 去掉。
- 当保留 shared package 时，包名固定派生为 `@<repoSlug>/types`。
- 若 `description` 缺失，自动补成 `"<repoName> 初始化仓库"`。

## 组合约束
- `includeClient=true` 且 `includeServer=false`：非法。
- `includeClient=false`、`includeServer=false`、`includeSharedPackage=false`：非法。
- 目标目录已存在且非空：非法。

## 执行顺序
1. 解析用户自然语言，得到归一化参数。
2. 输出“生成计划摘要”。
3. 执行 `node scripts/scaffold.mjs ...`。
4. 汇报结果，说明生成了哪些组件，以及建议的启动命令。

## 计划摘要格式
至少覆盖这些信息：

```md
生成计划摘要
- 模板：template-v1
- 目标目录：...
- 仓库名：...
- 描述：...
- serverPort：...
- 保留组件：client / server / shared
- 删除组件：...
```

## 脚本职责
- 复制模板目录。
- 跳过 `pnpm-lock.yaml`。
- 校验目标目录是否可写且为空。
- 根据开关裁剪目录和依赖。
- 改写根 `package.json`、README、端口配置和共享包引用。
- 在移除 `packages/types` 时，把前后端示例改写为本地类型定义。
