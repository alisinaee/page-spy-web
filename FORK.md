# Fork setup and upstream updates

This checkout tracks the official project through the `upstream` remote and
stores fork-owned changes in `alisinaee/page-spy-web` through the `origin`
remote.

## Remotes

```bash
rtk git remote -v
```

Expected remotes:

```text
origin    https://github.com/alisinaee/page-spy-web.git
upstream  https://github.com/HuolalaTech/page-spy-web.git
```

## Customization

Fork-owned values live in `.env`:

```dotenv
VITE_BRAND_NAME=PageSpy
VITE_GITHUB_HOMEPAGE=https://github.com/alisinaee
VITE_GITHUB_REPO=https://github.com/alisinaee/page-spy-web
```

`VITE_BRAND_NAME` controls the browser title and panel name. The GitHub values
control footer links, issue reporting, and the stars badge. SDK, plugin, and
documentation links intentionally remain pointed at the official upstream
project.

The upstream logo and color palette stay intact until a replacement logo and
brand colors are supplied. To rename only this fork, change `VITE_BRAND_NAME`
in `.env`, then rebuild.

For machine-only API or branding overrides, use `.env.local`. That file is
ignored by Git:

```dotenv
VITE_BRAND_NAME=My PageSpy
VITE_API_BASE=http://192.168.1.4:6752
```

After changing `.env` or `.env.local`, rebuild the client. Environment values
are compiled into the generated assets at build time.

## Fetch upstream updates

Keep fork-only work committed before syncing. Then run:

```bash
rtk git fetch upstream
rtk git switch main
rtk git log --oneline HEAD..upstream/main
rtk git diff --stat HEAD..upstream/main
rtk git merge --ff-only upstream/main
```

If the first merge cannot fast-forward because both repositories have commits,
merge upstream explicitly and resolve conflicts:

```bash
rtk git merge upstream/main
```

Do not use `rtk git reset --hard` on the fork branch. It can remove fork-only
work.

Validate every sync:

```bash
rtk yarn install --frozen-lockfile
rtk yarn lint
rtk yarn build:client
```

Push to the fork only after those checks and the smoke test pass:

```bash
rtk git push origin main
```

## Build the local panel

`Dockerfile` builds the web client and embeds it into the Go backend, so a
separate `rtk yarn build:client` step is not required for Docker builds.

```bash
rtk docker build -t page-spy-fork:local .
```

To replace an existing local test container while keeping its named volumes:

```bash
rtk docker rm -f pagespy-fork-test
rtk docker run -d \
  --name pagespy-fork-test \
  --restart unless-stopped \
  -p 6753:6752 \
  -v pagespy-fork-data:/app/data \
  -v pagespy-fork-log:/app/log \
  page-spy-fork:local
```

Open the panel at <http://localhost:6753>.

## Simplest device smoke test

Start the small test page from the repository root:

```bash
rtk python3 -m http.server 3000 --bind 0.0.0.0 --directory smoke-test
```

On the computer, open:

```text
http://localhost:3000/?panel=6753
```

On a phone connected to the same Wi-Fi, open:

```text
http://192.168.1.4:3000/?panel=6753
```

The page loads the PageSpy SDK from port `6753`, joins with project
`local-fork-test`, and shows connection status. Open the panel's online-debug
page, select `local-fork-test`, then press **Send test log**. The message
`PageSpy test log` should appear in the panel Console tab.

Use `panel=6752` to run the same page against an official upstream container.
