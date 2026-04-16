# Repo Gen Skill 分发与安装

## 目标
- 目标：让其他人可以稳定拿到 `repo-gen-skill`，并在 Codex 或 Claude Code 中直接使用。
- 推荐分发方式：以 Git 仓库为唯一真源，不走单独压缩包手工传播。

## 推荐分发模型
### 方案一：GitHub 仓库分发
- 把 `repo-gen-skill/` 提交到公开仓库，或提交到某个仓库的固定子目录。
- 这是最稳妥的主方案，因为：
  - Codex 可以通过 GitHub 路径安装 skill。
  - Claude Code 用户也可以直接 clone 后安装到本地 skill 目录。
  - 后续版本升级、回滚和协作审查都更清晰。

### 方案二：项目内共享
- 如果这个 skill 只服务某一个代码仓库，可以把它复制到项目内的 `.claude/skills/repo-gen-skill/`。
- 这种方式更适合 Claude Code 的项目级共享，不适合作为 Codex 的主分发方式。

## Codex 用户安装
### 官方推荐路径
- Codex 侧更适合走 `skill-installer` + GitHub 路径安装。
- 典型安装思路：

```bash
python <skill-installer>/scripts/install-skill-from-github.py --repo <owner>/<repo> --path <path/to/repo-gen-skill>
```

- 如果你的 skill 仓库根目录就叫 `repo-gen-skill`，可以理解为：

```bash
python <skill-installer>/scripts/install-skill-from-github.py --repo <owner>/<repo> --path repo-gen-skill
```

- 安装完成后，skill 会进入本地 `~/.codex/skills/repo-gen-skill`。
- 安装后建议重启 Codex。

### 本仓库附带脚本安装
- 如果使用者已经 clone 了当前仓库，也可以直接运行：

```bash
node repo-gen-skill/scripts/install-skill.mjs --codex
```

- 默认目标目录：

```text
~/.codex/skills/repo-gen-skill
```

## Claude Code 用户安装
### 个人级安装
- 适合个人长期复用：

```bash
node repo-gen-skill/scripts/install-skill.mjs --claude-user
```

- 默认目标目录：

```text
~/.claude/skills/repo-gen-skill
```

### 项目级安装
- 适合把 skill 随项目一起分发给团队：

```bash
node repo-gen-skill/scripts/install-skill.mjs --claude-project D:/your-project
```

- 安装后目标目录会是：

```text
<your-project>/.claude/skills/repo-gen-skill
```

### 项目仓库直接提交
- 也可以直接把 `repo-gen-skill/` 复制为：

```text
<your-project>/.claude/skills/repo-gen-skill/
```

- 然后把这个目录一起提交到 Git。
- 这样团队成员拉取项目后，Claude Code 就能在这个项目中发现该 skill。

## 一键安装脚本
本仓库提供：

```text
repo-gen-skill/scripts/install-skill.mjs
```

支持这些参数：
- `--codex`：安装到 Codex 个人目录。
- `--claude-user`：安装到 Claude Code 个人目录。
- `--claude-project <path>`：安装到指定项目的 `.claude/skills/` 下。
- `--force`：目标已存在时先删除再覆盖安装。

默认行为：
- 如果不传任何目标参数，脚本会默认安装到：
  - `~/.codex/skills/repo-gen-skill`
  - `~/.claude/skills/repo-gen-skill`

示例：

```bash
node repo-gen-skill/scripts/install-skill.mjs
node repo-gen-skill/scripts/install-skill.mjs --codex --force
node repo-gen-skill/scripts/install-skill.mjs --claude-user --claude-project D:/work/demo --force
```

## 推荐发布流程
1. 把 `repo-gen-skill/` 和相关 `docs/` 提交到 Git 仓库。
2. 在仓库首页或团队文档中给出安装命令。
3. 对 Codex 用户，优先提供 GitHub 安装方式。
4. 对 Claude Code 用户，优先提供项目级安装或个人级安装方式。
5. 每次更新 skill 后，用新版本覆盖安装。

## 使用建议
- 如果你的目标是“让别人都能复用”，优先用 GitHub 仓库作为统一入口。
- 如果你的目标是“团队内某项目固定使用”，优先用 `.claude/skills/` 项目内分发。
- 如果你后面要做更强的发现能力，再考虑整理成独立仓库，并补一个更明确的版本发布节奏。
