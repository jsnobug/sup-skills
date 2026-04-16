import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillRoot = path.resolve(__dirname, '..');
const templateRoot = path.join(skillRoot, 'assets', 'template-v1-source');

const usage = `用法:
  node scripts/scaffold.mjs --repo-name <name> --target <path> [选项]

选项:
  --description <text>
  --include-client <true|false>
  --include-server <true|false>
  --include-shared-package <true|false>
  --server-port <port>
`;

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      throw new Error(`无法识别的参数: ${current}`);
    }

    const key = current.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`参数缺少值: ${current}`);
    }

    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

function parseBoolean(rawValue, defaultValue) {
  if (rawValue === undefined) {
    return defaultValue;
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  throw new Error(`布尔参数只接受 true 或 false，收到: ${rawValue}`);
}

function parsePort(rawValue) {
  if (rawValue === undefined) {
    return 3000;
  }

  const port = Number(rawValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`非法端口: ${rawValue}`);
  }

  return port;
}

function toSlug(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function exists(targetPath) {
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

async function ensureEmptyTarget(targetPath) {
  if (!(await exists(targetPath))) {
    await mkdir(targetPath, { recursive: true });
    return;
  }

  const entries = await readdir(targetPath);
  if (entries.length > 0) {
    throw new Error(`目标目录非空，拒绝写入: ${targetPath}`);
  }
}

async function readJson(targetPath) {
  return JSON.parse(await readFile(targetPath, 'utf8'));
}

async function writeJson(targetPath, value) {
  await writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function shouldCopySource(sourcePath, options) {
  const relativePath = path.relative(templateRoot, sourcePath).replace(/\\/g, '/');

  if (!relativePath) {
    return true;
  }

  if (relativePath === 'pnpm-lock.yaml') {
    return false;
  }

  if (!options.includeClient && (relativePath === 'apps/client' || relativePath.startsWith('apps/client/'))) {
    return false;
  }

  if (!options.includeServer && (relativePath === 'apps/server' || relativePath.startsWith('apps/server/'))) {
    return false;
  }

  if (!options.includeSharedPackage && (relativePath === 'packages/types' || relativePath.startsWith('packages/types/'))) {
    return false;
  }

  return true;
}

function buildTypesSource(typesPackageName) {
  return `export interface DemoMessage {
  id: string;
  title: string;
  content: string;
  source: 'server';
  generatedAt: string;
}

export interface DemoApiResponse {
  ok: true;
  service: 'server';
  message: DemoMessage;
  sharedTypesPackage: '${typesPackageName}';
}
`;
}

function buildServerLocalTypes() {
  return `interface DemoMessage {
  id: string;
  title: string;
  content: string;
  source: 'server';
  generatedAt: string;
}

interface DemoApiResponse {
  ok: true;
  service: 'server';
  message: DemoMessage;
  sharedTypesPackage: null;
}
`;
}

function buildServerIndex({ includeClient, includeSharedPackage, serverPort, typesPackageName }) {
  const imports = [];
  if (includeClient) {
    imports.push(`import { join, normalize } from 'node:path';`);
  }
  if (includeSharedPackage) {
    imports.push(`import type { DemoApiResponse } from '${typesPackageName}';`);
  }
  imports.push(`import { Hono } from 'hono';`);
  const importBlock = `${imports.join('\n')}\n\n`;
  const typeBlock = includeSharedPackage ? '' : `${buildServerLocalTypes()}\n`;
  const clientBlock = includeClient
    ? `
const clientDistDir = join(import.meta.dir, '../../client/dist');

const resolveClientPath = (requestPath: string) => {
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\\/+/, '');
  const normalizedPath = normalize(relativePath).replace(/^(\\.\\.(\\/|\\\\|$))+/, '');
  const filePath = join(clientDistDir, normalizedPath);

  if (!filePath.startsWith(clientDistDir)) {
    return null;
  }

  return filePath;
};

const serveFile = async (filePath: string) => {
  const file = Bun.file(filePath);

  if (!(await file.exists())) {
    return null;
  }

  return new Response(file);
};
`
    : '';
  const sharedValue = includeSharedPackage ? `'${typesPackageName}'` : 'null';
  const clientRoutes = includeClient
    ? `
app.get('*', async (c) => {
  const filePath = resolveClientPath(c.req.path);

  if (filePath) {
    const assetResponse = await serveFile(filePath);

    if (assetResponse) {
      return assetResponse;
    }
  }

  const looksLikeAssetRequest = /\\.[a-z0-9]+$/i.test(c.req.path);
  if (looksLikeAssetRequest) {
    return c.notFound();
  }

  const indexResponse = await serveFile(join(clientDistDir, 'index.html'));
  if (indexResponse) {
    return indexResponse;
  }

  return c.text('未找到 client 构建产物，请先运行 pnpm --filter client build。', 503);
});
`
    : `
app.get('/', (c) => {
  return c.text('服务端初始化仓库已就绪。');
});
`;

  return `${importBlock}${typeBlock}const app = new Hono();
const port = Number(Bun.env.PORT ?? '${serverPort}');

const buildDemoResponse = (): DemoApiResponse => ({
  ok: true,
  service: 'server',
  message: {
    id: 'demo-message',
    title: 'Monorepo 最小闭环已打通',
    content: '${
      includeClient
        ? includeSharedPackage
          ? 'server 提供 API，client 通过共享 types 消费数据，并由 server 托管静态文件。'
          : 'server 提供 API，client 通过本地类型消费数据，并由 server 托管静态文件。'
        : includeSharedPackage
          ? 'server 提供 API，数据结构由共享 types 描述。'
          : 'server 提供 API，数据结构直接定义在服务端。'
    }',
    source: 'server',
    generatedAt: new Date().toISOString(),
  },
  sharedTypesPackage: ${sharedValue},
});
${clientBlock}
app.get('/api/health', (c) => {
  return c.json({ ok: true, port });
});

app.get('/api/demo', (c) => {
  return c.json(buildDemoResponse());
});
${clientRoutes}
export default {
  fetch: app.fetch,
  port,
};
`;
}

function buildClientLocalTypes() {
  return `type DemoMessage = {
  id: string;
  title: string;
  content: string;
  source: 'server';
  generatedAt: string;
};

type DemoApiResponse = {
  ok: true;
  service: 'server';
  message: DemoMessage;
  sharedTypesPackage: null;
};
`;
}

function buildClientApp({ includeSharedPackage, typesPackageName }) {
  const imports = [`import { useEffect, useState } from 'react';`];
  if (includeSharedPackage) {
    imports.push(`import type { DemoApiResponse } from '${typesPackageName}';`);
  }
  imports.push(`import './App.css';`);
  const importBlock = `${imports.join('\n')}\n\n`;
  const typeBlock = includeSharedPackage ? '' : `${buildClientLocalTypes()}\n`;
  const sharedSummary = includeSharedPackage
    ? `共享类型：<code>${typesPackageName}</code>`
    : '本地类型：<code>apps/client/src/App.tsx</code>';
  const heroCopy = includeSharedPackage
    ? '这是一个最小闭环 demo。前端通过 <code>/api/demo</code> 获取数据，接口类型来自同一个 workspace 包。'
    : '这是一个最小闭环 demo。前端通过 <code>/api/demo</code> 获取数据，接口类型直接定义在前端文件中。';
  const successCopy = includeSharedPackage ? '请求成功，前后端共享类型已生效。' : '请求成功，前端本地类型已生效。';

  return `${importBlock}${typeBlock}type DemoState =
  | { status: 'loading' }
  | { status: 'success'; data: DemoApiResponse }
  | { status: 'error'; message: string };

function App() {
  const [state, setState] = useState<DemoState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const loadDemo = async () => {
      try {
        const response = await fetch('/api/demo');

        if (!response.ok) {
          throw new Error(\`请求失败: \${response.status}\`);
        }

        const data = (await response.json()) as DemoApiResponse;
        if (!cancelled) {
          setState({ status: 'success', data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '请求 demo 数据失败',
          });
        }
      }
    };

    void loadDemo();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Bun + Hono + React${includeSharedPackage ? ' + shared types' : ''}</p>
        <h1>Server 提供 API，也托管 Client 静态资源</h1>
        <p className="hero-copy">
          ${heroCopy}
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>当前链路</h2>
          <ul className="list">
            <li>${sharedSummary}</li>
            <li>接口地址：<code>GET /api/demo</code></li>
            <li>静态托管：<code>apps/server</code> 直接返回 <code>apps/client/dist</code></li>
          </ul>
        </article>

        <article className="card">
          <h2>接口状态</h2>
          {state.status === 'loading' && <p className="status loading">正在请求 server...</p>}
          {state.status === 'error' && <p className="status error">{state.message}</p>}
          {state.status === 'success' && (
            <div className="payload">
              <p className="status success">${successCopy}</p>
              <dl className="meta">
                <div>
                  <dt>service</dt>
                  <dd>{state.data.service}</dd>
                </div>
                <div>
                  <dt>title</dt>
                  <dd>{state.data.message.title}</dd>
                </div>
                <div>
                  <dt>generatedAt</dt>
                  <dd>{state.data.message.generatedAt}</dd>
                </div>
              </dl>
              <pre>{JSON.stringify(state.data, null, 2)}</pre>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

export default App;
`;
}

function buildViteConfig(serverPort) {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:${serverPort}',
        changeOrigin: true,
      },
    },
  },
});
`;
}

function buildReadme({ repoName, description, includeClient, includeServer, includeSharedPackage, serverPort, typesPackageName }) {
  const lines = [`# ${repoName}`, '', description, '', '## 结构'];

  if (includeServer) {
    lines.push(`- \`apps/server\`: Bun + Hono，提供 API${includeClient ? '，并托管 `apps/client/dist`' : ''}`);
  }

  if (includeClient) {
    lines.push('- `apps/client`: Vite + React，调用 `/api/demo`');
  }

  if (includeSharedPackage) {
    lines.push(`- \`packages/types\`: 前后端共享接口类型，包名为 \`${typesPackageName}\``);
  }

  if (!includeServer && !includeClient && includeSharedPackage) {
    lines.push('- 当前仓库仅保留 shared types package');
  }

  lines.push('', '## 运行', '1. 安装依赖：`pnpm install`');

  if (includeClient) {
    lines.push('2. 构建前端：`pnpm --filter client build`');
  }

  if (includeServer) {
    lines.push(`${includeClient ? '3' : '2'}. 启动服务：\`pnpm --filter server start\``);
  }

  if (includeServer) {
    lines.push('', '启动后访问：', `- \`http://localhost:${serverPort}/api/health\``, `- \`http://localhost:${serverPort}/api/demo\``);
    if (includeClient) {
      lines.push(`- \`http://localhost:${serverPort}/\``);
    }
  }

  lines.push('', '## 开发模式');

  if (includeServer) {
    lines.push('- 单独启动 server：`pnpm --filter server dev`');
  }

  if (includeClient) {
    lines.push('- 单独启动 client：`pnpm --filter client dev`');
    lines.push('', '`client dev` 已配置 Vite 代理：', `- \`/api/*\` -> \`http://127.0.0.1:${serverPort}\``);
  }

  if (!includeServer && !includeClient && includeSharedPackage) {
    lines.push('- 当前仓库没有可运行应用，只保留共享类型包。');
  }

  return `${lines.join('\n')}\n`;
}

async function configureRootPackage(targetPath, options) {
  const packageJsonPath = path.join(targetPath, 'package.json');
  const packageJson = await readJson(packageJsonPath);

  packageJson.name = options.repoSlug;
  packageJson.description = options.description;

  if (!options.includeClient) {
    delete packageJson.scripts['build:demo'];
  }

  if (!options.includeServer) {
    delete packageJson.scripts['start:demo'];
  }

  await writeJson(packageJsonPath, packageJson);
}

async function configureTypesPackage(targetPath, options) {
  if (!options.includeSharedPackage) {
    return;
  }

  const packageJsonPath = path.join(targetPath, 'packages', 'types', 'package.json');
  const packageJson = await readJson(packageJsonPath);
  packageJson.name = options.typesPackageName;
  await writeJson(packageJsonPath, packageJson);

  await writeFile(
    path.join(targetPath, 'packages', 'types', 'src', 'index.ts'),
    buildTypesSource(options.typesPackageName),
    'utf8',
  );
}

async function configureServer(targetPath, options) {
  const serverPath = path.join(targetPath, 'apps', 'server');

  if (!options.includeServer) {
    return;
  }

  const packageJsonPath = path.join(serverPath, 'package.json');
  const packageJson = await readJson(packageJsonPath);
  if (options.includeSharedPackage) {
    packageJson.dependencies[options.typesPackageName] = 'workspace:*';
    delete packageJson.dependencies['@monorepo-templates/types'];
  } else {
    delete packageJson.dependencies['@monorepo-templates/types'];
  }
  await writeJson(packageJsonPath, packageJson);

  await writeFile(
    path.join(serverPath, 'src', 'index.ts'),
    buildServerIndex(options),
    'utf8',
  );
}

async function configureClient(targetPath, options) {
  const clientPath = path.join(targetPath, 'apps', 'client');

  if (!options.includeClient) {
    return;
  }

  const packageJsonPath = path.join(clientPath, 'package.json');
  const packageJson = await readJson(packageJsonPath);
  if (options.includeSharedPackage) {
    packageJson.dependencies[options.typesPackageName] = 'workspace:*';
    delete packageJson.dependencies['@monorepo-templates/types'];
  } else {
    delete packageJson.dependencies['@monorepo-templates/types'];
  }
  await writeJson(packageJsonPath, packageJson);

  await writeFile(path.join(clientPath, 'src', 'App.tsx'), buildClientApp(options), 'utf8');
  await writeFile(path.join(clientPath, 'vite.config.ts'), buildViteConfig(options.serverPort), 'utf8');
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0 || rawArgs.includes('--help')) {
    console.log(usage);
    return;
  }

  const parsed = parseArgs(rawArgs);
  const repoName = parsed['repo-name']?.trim();
  const targetPath = parsed.target ? path.resolve(parsed.target) : '';

  if (!repoName) {
    throw new Error('缺少 --repo-name');
  }

  if (!targetPath) {
    throw new Error('缺少 --target');
  }

  const repoSlug = toSlug(repoName);
  if (!repoSlug) {
    throw new Error(`repo-name 无法归一化为合法 slug: ${repoName}`);
  }

  const options = {
    repoName,
    repoSlug,
    targetPath,
    description: parsed.description?.trim() || `${repoName} 初始化仓库`,
    includeClient: parseBoolean(parsed['include-client'], true),
    includeServer: parseBoolean(parsed['include-server'], true),
    includeSharedPackage: parseBoolean(parsed['include-shared-package'], true),
    serverPort: parsePort(parsed['server-port']),
    typesPackageName: `@${repoSlug}/types`,
  };

  if (options.includeClient && !options.includeServer) {
    throw new Error('include-client=true 时必须同时保留 include-server=true');
  }

  if (!options.includeClient && !options.includeServer && !options.includeSharedPackage) {
    throw new Error('至少保留一个组件，不能把 client/server/shared 全部关闭');
  }

  if (!(await exists(templateRoot))) {
    throw new Error(`模板目录不存在: ${templateRoot}`);
  }

  await ensureEmptyTarget(targetPath);
  const templateEntries = await readdir(templateRoot);
  for (const entry of templateEntries) {
    await cp(path.join(templateRoot, entry), path.join(targetPath, entry), {
      recursive: true,
      errorOnExist: false,
      filter: (sourcePath) => shouldCopySource(sourcePath, options),
    });
  }

  await configureRootPackage(targetPath, options);
  await configureTypesPackage(targetPath, options);
  await configureServer(targetPath, options);
  await configureClient(targetPath, options);
  await writeFile(path.join(targetPath, 'README.md'), buildReadme(options), 'utf8');

  const kept = [];
  const removed = [];

  if (options.includeClient) {
    kept.push('client');
  } else {
    removed.push('client');
  }

  if (options.includeServer) {
    kept.push('server');
  } else {
    removed.push('server');
  }

  if (options.includeSharedPackage) {
    kept.push('shared');
  } else {
    removed.push('shared');
  }

  console.log(JSON.stringify({
    ok: true,
    template: 'template-v1',
    targetPath,
    repoSlug,
    kept,
    removed,
    serverPort: options.serverPort,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[repo-gen-skill] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
