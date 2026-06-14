# 如何自定义专属覆写规则

> **本 Fork 与上游的差异提示**（基于 `powerfullz/override-rules`）：
> 1. **发布 Tag 格式**：触发 `Release Artifacts` 工作流需用 `src-vX.Y.Z` 前缀（上游 README 推荐的 `npm version patch` 会打裸 `vX.Y.Z`，触发不了）。
> 2. **资源引用**：`src/constants.ts` 中已新增 `REPO_SLUG` / `REPO_REF` 两个常量，所有规则集与图标 URL 统一指向本仓库；更换仓库或锁定版本只需改这两行。
> 3. **日常调试**：每次推送 `src/**` 改动，`preview.yaml` 会自动构建到 `preview` 分支，无需打 Tag 即可获取最新产物。

本项目的设计初衷是提供一套高度灵活且开箱即用的 Mihomo/Substore 覆写规则。如果默认的代理组、分流规则或参数设定不满足你的需求，你可以轻松 Fork 本仓库并进行定制。

## Fork 并准备开发环境

首先，将本仓库 Fork 到你的 GitHub 账号下，然后克隆到本地：

```bash
git clone https://github.com/你的用户名/override-rules.git
cd override-rules
npm install
```

我们使用 TypeScript 进行源码管理，所有的核心逻辑都在 `src/` 目录中。**请务必不要直接修改根目录下的 `.js` 和 `.yaml` 产物文件**。

## 自定义默认的脚本参数

通过 URL 传递参数（如 `#fakeip=true`）是控制脚本行为的常用方式。如果你希望修改这些参数的默认值（例如，默认开启 IPv6 支持），可以修改 `src/args.ts` 中的 `buildFeatureFlags` 函数，为其解析函数补充或修改默认值参数：

```typescript
// src/args.ts
export function buildFeatureFlags(args: ScriptArgs): FeatureFlags {
    return {
        groupType: parseGroupType(args),
        landing: parseBool(args.landing),
        ipv6Enabled: parseBool(args.ipv6, true), // 例如：传入 true 作为默认值以默认开启 IPv6
        fullConfig: parseBool(args.full),
        keepAliveEnabled: parseBool(args.keepalive),
        fakeIPEnabled: parseBool(args.fakeip, true),
        quicEnabled: parseBool(args.quic),
        regexFilter: parseBool(args.regex),
        tunEnabled: parseBool(args.tun),
        countryThreshold: parseNumber(args.threshold, 0),
    };
}
```

## 调整代理组

如果你需要调整生成的代理组（Proxy Groups），或需要添加新的国家/地区节点分组，请编辑 `src/constants.ts` 和 `src/proxy_groups.ts`。

**添加新的代理组名称：**

```typescript
// src/constants.ts
export const PROXY_GROUPS = {
    // ... 已有代理组 ...
    MY_CUSTOM_GROUP: "自定义代理组",
} as const;
```

**定义新的代理组：**

打开 `src/proxy_groups.ts` 文件，在 `buildProxyGroups` 函数返回的数组中添加你的新代理组：

```typescript
// src/proxy_groups.ts
export function buildProxyGroups({ /* 参数 */ }): ProxyGroup[] {
    return [
        // ... 已有代理组 ...
        {
            name: PROXY_GROUPS.MY_CUSTOM_GROUP,
            icon: `图标链接`, // 代理组的图标，可以使用 url 或者 icon 字符串
            type: "select",
            proxies: defaultProxies, // 可以自行指定代理集合或者用 selectors.ts 中预设的变量
        },
        // ...
    ];
}
```

## 调整国家/地区匹配规则

脚本会根据`countriesMeta`自动生成实际存在的代理组，因此只需修改国家/地区元数据即可。

在 `src/constants.ts` 的 `countriesMeta` 中，你可以修改节点的正则匹配 `pattern` 以及代理组显示的 `icon`。`weight` 用于控制代理组在列表中的排序（越小越靠前）。

```typescript
// src/constants.ts
export const countriesMeta: Record<string, CountryMeta> = {
    // ...
    印度尼西亚: {
        pattern: "印尼|ID|Indonesia|🇮🇩",
        icon: "图标链接",
        weight: 0, // 示例：放在最前面
    },
};
```

## 自定义分流规则 (`rule-providers`和`rules`)

若需要添加新的 Rule Provider（例如引入其他 GitHub 仓库或第三方链接的规则集），请在 `src/rule_providers.ts` 中配置：

```typescript
// src/rule_providers.ts
export const ruleProviders = {
    // ...
    exampleProvider: {
        type: "http",
        behavior: "domain",
        format: "text",
        interval: 86400,
        url: "https://example.com/custom_rules.txt",
        path: "./ruleset/MyCustomProvider.txt",
    },
};
```

接着，在 `src/rules.ts` 中将流量分配至对应的代理组：

```typescript
// src/rules.ts
import { PROXY_GROUPS } from "./constants";

const baseRules = [
    // ... 其他规则 ...
    `RULE-SET,exampleProvider,${PROXY_GROUPS.MY_CUSTOM_GROUP}`,
    // 如果没有在 constants 中添加新代理组，也可以直接用 PROXY_GROUPS.SELECT 等
];
```

### 使用 GeoSite 数据库

参考[v2fly/domain-list-community](https://github.com/v2fly/domain-list-community)仓库以获取你所需要的域名集合名称，并直接修改`src/rules.ts`即可。

```ts
const baseRules = [
    // ... 其他规则 ...
    `GEOSITE,CATEGORY-PORN,${PROXY_GROUPS.MY_CUSTOM_GROUP}`,    // 示例：添加成人内容集合，GeoSite 规则大小写不敏感。
    // 如果没有在 constants 中添加新代理组，也可以直接用现有的 PROXY_GROUPS.SELECT 等
];
```

## 构建并使用你的定制脚本

在修改完成后，你可以先在本地运行构建命令来验证你的更改是否正确：

```bash
# 格式化并检查代码
npm run format
npm run lint:fix

# 本地验证构建产物（可选）
npm run artifacts
```

**重要**：本项目已经配置了 GitHub Actions 来自动处理构建和发布，所有的产物（包括 `.js` 脚本和 `.yaml` 配置文件）会被自动构建并部署到 `dist`（正式发布）或 `preview`（每次推送 `src/**` 改动）分支。因此，**请勿直接将本地生成的产物推送到主分支**。

请按照以下步骤发布并使用你的定制版本：

1. **启用 GitHub Actions**：由于你使用的是 Fork 后的仓库，请前往你仓库的 **Actions** 标签页，点击 "I understand my workflows, go ahead and enable them" 以启用自动化工作流。
2. **提交并推送源码**：将你修改后的源码（如 `src/` 下的内容）提交并推送到 `main` 分支。
   - 推送后，`preview.yaml` 工作流会**自动触发**，把当次构建产物推送到 `preview` 分支，无需手动操作。这是日常调试和验证的最佳途径。
3. **触发正式发布（可选）**：日常使用 `preview` 分支即可；若希望锁定一个稳定版本到 `dist` 分支，需要创建并推送 **`src-v*` 前缀**的 Tag：
   ```bash
   # 注意前缀必须是 src-，工作流内部会自动剥除该前缀（src-v2.4.4 → v2.4.4）
   git tag src-v2.4.4
   git push origin src-v2.4.4
   ```
   > **注意 Tag 前缀**：触发 `Release Artifacts` 工作流的 Tag 格式为 `src-vX.Y.Z`，**不要**使用裸 `vX.Y.Z`（后者无法触发该工作流）。如需通过 `npm version` 自动管理版本号，请在打 Tag 后手动补一个 `src-` 前缀的同名 Tag。
4. **等待自动构建**：回到 GitHub 仓库的 Actions 页面，等待对应工作流执行完毕。
   - `Deploy Preview` 工作流会把产物推送到 `preview` 分支。
   - `Release Artifacts` 工作流会把产物推送到 `dist` 分支，并创建对应 `vX.Y.Z` 的 Release。
5. **获取并使用定制脚本**：构建成功后，通过 jsDelivr 引用对应分支的覆写脚本（注意将“你的用户名”替换为实际的 GitHub 用户名）。

日常跟随最新改动（推荐使用 `preview` 分支）：

```text
https://cdn.jsdelivr.net/gh/你的用户名/override-rules@preview/convert.min.js
```

稳定版本（`dist` 分支，跟随最近一次 `src-v*` 发布）：

```text
https://cdn.jsdelivr.net/gh/你的用户名/override-rules@dist/convert.min.js
```

若不能接受 jsDelivr 的缓存和更新延迟，则直接使用 Github Raw 链接：

```text
https://raw.githubusercontent.com/你的用户名/override-rules/refs/heads/preview/convert.min.js
https://raw.githubusercontent.com/你的用户名/override-rules/refs/heads/dist/convert.min.js
```


