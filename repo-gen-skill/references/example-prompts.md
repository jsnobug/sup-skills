# 示例输入

## 示例 1：默认全量模板
### 用户输入
```text
帮我基于这套模板生成一个叫 acme-console 的初始化仓库，放到 D:/work/acme-console
```

### 归一化结果
```json
{
  "repoName": "acme-console",
  "targetPath": "D:/work/acme-console",
  "description": "acme-console 初始化仓库",
  "includeClient": true,
  "includeServer": true,
  "includeSharedPackage": true,
  "serverPort": 3000
}
```

## 示例 2：只保留服务端
### 用户输入
```text
按这个 monorepo 模板给我起一个 server-only 仓库，目录在 D:/tmp/server-only，不要前端，端口改成 3100
```

### 归一化结果
```json
{
  "repoName": "server-only",
  "targetPath": "D:/tmp/server-only",
  "description": "server-only 初始化仓库",
  "includeClient": false,
  "includeServer": true,
  "includeSharedPackage": true,
  "serverPort": 3100
}
```

## 示例 3：移除 shared package
### 用户输入
```text
生成一个 demo-lite 仓库，路径 D:/tmp/demo-lite，保留前后端，但不要 shared types 包
```

### 归一化结果
```json
{
  "repoName": "demo-lite",
  "targetPath": "D:/tmp/demo-lite",
  "description": "demo-lite 初始化仓库",
  "includeClient": true,
  "includeServer": true,
  "includeSharedPackage": false,
  "serverPort": 3000
}
```
