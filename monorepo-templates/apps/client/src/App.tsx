import { useEffect, useState } from 'react';
import type { DemoApiResponse } from '@monorepo-templates/types';
import './App.css';

type DemoState =
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
          throw new Error(`请求失败: ${response.status}`);
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
        <p className="eyebrow">Bun + Hono + React + shared types</p>
        <h1>Server 提供 API，也托管 Client 静态资源</h1>
        <p className="hero-copy">
          这是一个最小闭环 demo。前端通过 <code>/api/demo</code> 获取数据，接口类型来自
          同一个 workspace 包。
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>当前链路</h2>
          <ul className="list">
            <li>共享类型：<code>@monorepo-templates/types</code></li>
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
              <p className="status success">请求成功，前后端共享类型已生效。</p>
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
