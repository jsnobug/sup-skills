import { join, normalize } from 'node:path';
import type { DemoApiResponse } from '@monorepo-templates/types';
import { Hono } from 'hono';

const app = new Hono();
const clientDistDir = join(import.meta.dir, '../../client/dist');

const buildDemoResponse = (): DemoApiResponse => ({
  ok: true,
  service: 'server',
  message: {
    id: 'demo-message',
    title: 'Monorepo 最小闭环已打通',
    content: 'server 提供 API，client 通过共享 types 消费数据，并由 server 托管静态文件。',
    source: 'server',
    generatedAt: new Date().toISOString(),
  },
  sharedTypesPackage: '@monorepo-templates/types',
});

const resolveClientPath = (requestPath: string) => {
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const normalizedPath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
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

app.get('/api/health', (c) => {
  return c.json({ ok: true });
});

app.get('/api/demo', (c) => {
  return c.json(buildDemoResponse());
});

app.get('*', async (c) => {
  const filePath = resolveClientPath(c.req.path);

  if (filePath) {
    const assetResponse = await serveFile(filePath);

    if (assetResponse) {
      return assetResponse;
    }
  }

  const looksLikeAssetRequest = /\.[a-z0-9]+$/i.test(c.req.path);
  if (looksLikeAssetRequest) {
    return c.notFound();
  }

  const indexResponse = await serveFile(join(clientDistDir, 'index.html'));
  if (indexResponse) {
    return indexResponse;
  }

  return c.text('未找到 client 构建产物，请先运行 `pnpm --filter client build`。', 503);
});

export default app;
