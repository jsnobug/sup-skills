# Monorepo 最小闭环 Demo

## 结构
- `apps/server`: Bun + Hono，提供 API，并托管 `apps/client/dist`
- `apps/client`: Vite + React，调用 `/api/demo`
- `packages/types`: 前后端共享接口类型

## 运行
1. 安装依赖：`pnpm install`
2. 构建前端：`pnpm build:demo`
3. 启动服务：`pnpm start:demo`

启动后访问：
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/demo`
- `http://localhost:3000/`

如果 `server` 启动时发现没有前端构建产物，会返回 `503` 并提示先执行 `pnpm --filter client build`。

## 开发模式
- 单独启动 server：`pnpm --filter server dev`
- 单独启动 client：`pnpm --filter client dev`

`client dev` 已配置 Vite 代理：
- `/api/*` -> `http://127.0.0.1:3000`

也就是说，开发时前端仍然直接请求 `/api/demo`，但会由 Vite 转发到本地 `server`。如果 `server` 没启动，代理请求会失败。
