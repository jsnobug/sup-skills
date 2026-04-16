# Repo Gen Skill for Claude Code

当用户要求“根据模板生成初始化仓库”“基于现有 monorepo 模板起一个新仓库”时，按这个目录里的共享协议执行。

## 执行顺序
1. 先读 [references/generation-contract.md](references/generation-contract.md)。
2. 需要看自然语言映射样例时，再读 [references/example-prompts.md](references/example-prompts.md)。
3. 先输出“生成计划摘要”，再执行生成。
4. 使用 `node scripts/scaffold.mjs` 完成实际脚手架生成。

## 强约束
- 默认拒绝向非空目录写入。
- `includeClient=true` 时必须同时保留 `includeServer=true`。
- 不要擅自切换技术栈；首版只支持内置 `template-v1`。

## 最小命令模板
```bash
node scripts/scaffold.mjs \
  --repo-name <repo-name> \
  --target <target-path> \
  --description "<description>" \
  --include-client <true|false> \
  --include-server <true|false> \
  --include-shared-package <true|false> \
  --server-port <port>
```
