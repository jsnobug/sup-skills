# Repo Gen Skill 首版实施规格

## 摘要
- 目标：提供一个 `repo-gen-skill`，让 Codex 和 Claude Code 能根据自然语言需求，基于内置 monorepo 模板生成初始化仓库。
- 首版范围：只支持当前这一套 Bun + Hono + React + shared types 的 monorepo 模板族，不做通用模板引擎。
- 交互方式：用户用自然语言描述需求，skill 先归一化出参数并回显生成计划，确认后再执行生成。
- 安全策略：默认拒绝向非空目录写入，不做合并生成，不做覆盖白名单。

## 固定决策
- 模板组织采用整仓模板，不做模块拼装。
- 模板源复制进 `repo-gen-skill` 内部维护，避免运行时强依赖外部目录。
- 兼容策略采用“一套共享规范 + 两个薄适配层”。
- 首版可变项只开放基础元信息和少量开关，不开放技术栈切换。

## 生成规格
### 输入字段
- `repoName`：仓库名，必填。
- `targetPath`：目标目录，必填。
- `description`：仓库描述，选填。
- `includeClient`：是否保留 `apps/client`，默认 `true`。
- `includeServer`：是否保留 `apps/server`，默认 `true`。
- `includeSharedPackage`：是否保留 `packages/types`，默认 `true`。
- `serverPort`：服务端端口，默认 `3000`。

### 默认约束
- `includeClient=true` 时必须同时满足 `includeServer=true`。
- `includeClient=false`、`includeServer=false`、`includeSharedPackage=false` 不允许同时成立。
- 若目标目录已存在，则必须为空目录；非空目录直接拒绝执行。

## 实现方案
### Skill 结构
- `repo-gen-skill/SKILL.md`：Codex 入口与共享工作流说明。
- `repo-gen-skill/CLAUDE.md`：Claude Code 入口说明，复用同一套生成协议。
- `repo-gen-skill/agents/openai.yaml`：Codex/OpenAI UI 元数据。
- `repo-gen-skill/references/generation-contract.md`：参数、约束、执行顺序、输出约定。
- `repo-gen-skill/references/example-prompts.md`：自然语言输入示例与映射结果。
- `repo-gen-skill/scripts/scaffold.mjs`：模板复制、裁剪、替换和 README 生成脚本。
- `repo-gen-skill/assets/template-v1-source/`：内置模板副本。

### 生成行为
- 从 `assets/template-v1-source` 复制模板到目标目录。
- 默认跳过 `pnpm-lock.yaml`，避免保留模板源中的锁文件和包名痕迹。
- 对根 `package.json`、README、端口、shared package 名称和关键源码文件做定向替换。
- 按开关裁剪 `apps/client`、`apps/server`、`packages/types`。
- 当 `includeSharedPackage=false` 时，移除应用对共享包的依赖，并改写为本地类型定义。
- 当 `includeClient=false` 时，服务端改为纯 API 模式，不再托管静态前端资源。

## 验收
- skill 目录通过基础校验，`SKILL.md` frontmatter 和 `agents/openai.yaml` 合法。
- 生成脚本至少验证两类场景：
  - 默认全量模板生成。
  - 裁剪场景，例如仅保留 server 或移除 shared package。
- 生成结果满足以下要求：
  - 不向非空目录覆盖写入。
  - 生成后的 README 与实际仓库能力一致。
  - 端口、包名、依赖引用与开关裁剪结果一致。

## 当前默认值
- `serverPort=3000`
- `includeClient=true`
- `includeServer=true`
- `includeSharedPackage=true`
- `description` 未提供时自动生成“`<repoName>` 初始化仓库”
