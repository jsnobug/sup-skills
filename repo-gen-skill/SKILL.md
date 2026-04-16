---
name: repo-gen-skill
description: 根据内置 monorepo 模板生成初始化仓库。用于 Codex 需要把自然语言需求归一化为仓库名、目标目录、描述、端口和 client/server/shared 开关，并在生成前回显计划、拒绝向非空目录覆盖写入、随后基于 skill 自带模板执行脚手架生成时。
---

# Repo Gen Skill

按下面流程生成仓库，不要跳步。

## 1. 先读取共享协议
- 先读 [references/generation-contract.md](references/generation-contract.md)。
- 需要自然语言映射样例时，再读 [references/example-prompts.md](references/example-prompts.md)。

## 2. 归一化需求
- 从用户输入中提取这些字段：
  - `repoName`
  - `targetPath`
  - `description`
  - `includeClient`
  - `includeServer`
  - `includeSharedPackage`
  - `serverPort`
- 对缺失字段使用协议中的默认值。
- 只有 `repoName` 或 `targetPath` 缺失且无法从上下文推断时，才追问用户。

## 3. 先回显生成计划
- 在真正写文件前，先输出一段简短的“生成计划摘要”。
- 摘要至少包含：
  - 目标目录
  - 模板名：`template-v1`
  - 归一化后的参数
  - 将保留的主要目录
  - 将删除的主要目录
- 如果用户这一轮已经明确要求“开始生成”“按这个方案执行”，则回显后可直接继续，不需要再次停下来等确认。

## 4. 执行脚手架
- 运行 `node scripts/scaffold.mjs`。
- 传入显式参数，不要依赖交互式输入。
- 示例：

```bash
node scripts/scaffold.mjs \
  --repo-name demo-repo \
  --target D:/workspace/demo-repo \
  --description "demo-repo 初始化仓库" \
  --include-client true \
  --include-server true \
  --include-shared-package true \
  --server-port 3000
```

## 5. 完成后核对
- 核对脚本输出的保留组件列表和目标目录。
- 简要说明生成结果、默认值、以及后续建议的安装命令。
- 如果脚本因目录非空或能力组合非法而失败，直接向用户报告原因，不要绕过限制强行写入。
