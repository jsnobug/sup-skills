import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillRoot = path.resolve(__dirname, '..');
const skillName = path.basename(skillRoot);

const usage = `用法:
  node repo-gen-skill/scripts/install-skill.mjs [选项]

选项:
  --codex                         安装到 Codex 个人技能目录
  --claude-user                   安装到 Claude Code 个人技能目录
  --claude-project <path>         安装到指定项目的 .claude/skills 目录
  --force                         目标已存在时覆盖安装
  --help                          显示帮助

默认行为:
  不传安装目标时，默认同时安装到 Codex 和 Claude Code 的个人技能目录。
`;

function parseArgs(argv) {
  const parsed = {
    codex: false,
    claudeUser: false,
    force: false,
    claudeProjects: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    switch (current) {
      case '--codex':
        parsed.codex = true;
        break;
      case '--claude-user':
        parsed.claudeUser = true;
        break;
      case '--force':
        parsed.force = true;
        break;
      case '--claude-project': {
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) {
          throw new Error('参数缺少值: --claude-project');
        }
        parsed.claudeProjects.push(path.resolve(value));
        index += 1;
        break;
      }
      case '--help':
        parsed.help = true;
        break;
      default:
        throw new Error(`无法识别的参数: ${current}`);
    }
  }

  return parsed;
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function ensureSkillSource() {
  const skillFile = path.join(skillRoot, 'SKILL.md');
  if (!(await pathExists(skillFile))) {
    throw new Error(`未找到技能入口文件: ${skillFile}`);
  }

  const content = await readFile(skillFile, 'utf8');
  if (!content.includes('name: repo-gen-skill')) {
    throw new Error(`技能源目录异常，未识别到 repo-gen-skill: ${skillFile}`);
  }
}

function buildTargets(options) {
  const targets = [];
  const codexHome = process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), '.codex');
  const claudeHome = path.join(os.homedir(), '.claude');

  const installToCodex = options.codex || (!options.codex && !options.claudeUser && options.claudeProjects.length === 0);
  const installToClaudeUser =
    options.claudeUser || (!options.codex && !options.claudeUser && options.claudeProjects.length === 0);

  if (installToCodex) {
    targets.push({
      label: 'codex-user',
      path: path.join(codexHome, 'skills', skillName),
    });
  }

  if (installToClaudeUser) {
    targets.push({
      label: 'claude-user',
      path: path.join(claudeHome, 'skills', skillName),
    });
  }

  for (const projectPath of options.claudeProjects) {
    targets.push({
      label: `claude-project:${projectPath}`,
      path: path.join(projectPath, '.claude', 'skills', skillName),
    });
  }

  return targets;
}

async function installTarget(target, force) {
  const parentPath = path.dirname(target.path);

  await mkdir(parentPath, { recursive: true });

  if (await pathExists(target.path)) {
    if (!force) {
      throw new Error(`目标已存在，请先删除或追加 --force: ${target.path}`);
    }

    await rm(target.path, { recursive: true, force: true });
  }

  await cp(skillRoot, target.path, { recursive: true });
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log(usage);
    return;
  }

  await ensureSkillSource();

  const targets = buildTargets(parsed);
  const results = [];

  for (const target of targets) {
    await installTarget(target, parsed.force);
    results.push({
      target: target.label,
      path: target.path,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        skillName,
        installed: results,
        next: [
          'Codex 安装后建议重启应用以重新加载技能目录。',
          'Claude Code 如果技能根目录在当前会话启动后才首次创建，建议重启当前会话。',
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`[repo-gen-skill:install] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
