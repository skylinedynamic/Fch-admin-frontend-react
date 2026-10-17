# Partner link previews (Open Graph) — Nginx SSI

Link previews (WhatsApp, Facebook, LinkedIn, Slack, iMessage) read the raw HTML
and never run JavaScript. So the partner's title, description, Open Graph and
Twitter tags, and favicon are put into `index.html` by Nginx as it serves the page.
It uses an SSI include of the API's `GET /api/portal-meta`.

- `index.html` has a `portal_meta_default` block (the packaged Four Corner Funding
  tags) and `<!--# include virtual="/__portal-meta" ... -->`.
- With SSI off, the block is plain HTML, so the defaults are served as before.
- With SSI on, Nginx replaces the include with the API's fragment for the
  requesting domain. If the API call fails or times out, Nginx serves the defaults
  instead.
- The API picks the partner by domain, the same way as `/api/branding.css`.
  - White-label partner: its own name, slogan, logo (`og:image`) and favicon.
  - Host, other partners, unknown domains: the host's brand.

## Server change

Caddy terminates TLS and passes every request to Nginx with the visitor's domain
in `Host`:
- `partner.fourcornerfunding.com` goes straight to `127.0.0.1:3001`.
- Custom domains go to the `saas-router` server (`127.0.0.1:8080`). It resolves
  the tenant and proxies to `3001` (partner) or `3002` (borrower), keeping `Host`.

So **only this portal's own server block changes**: `/etc/nginx/sites-available/admin-internal`
(`listen 127.0.0.1:3001`). Caddy and `saas-router` stay as they are.

Add `ssi on;` at server level, and the `location` next to the others:

```nginx
server {
    listen 127.0.0.1:3001;
    ...

    ssi on;

    location / {
        try_files $uri /index.html;
    }

    location = /__portal-meta {
        internal;
        proxy_pass http://127.0.0.1:8081/api/portal-meta?portal=partner;
        proxy_set_header Host api.fourcornerfunding.com;
        proxy_set_header X-Portal-Host $host;
        proxy_connect_timeout 2s;
        proxy_read_timeout 5s;
    }

    # the existing static-asset location stays as it is
}
```

- The include calls the API on `127.0.0.1:8081` directly, not back through Caddy.
- `Host api.fourcornerfunding.com` is the Host Caddy sends that server too.
- SSI only touches HTML, so the long-cached JS/CSS/images are served unchanged.
- If the API is down or slow, the page is still served with the default tags,
  after at most the timeouts above.

Then run `sudo nginx -t && sudo systemctl reload nginx`.

Checked against a replica of this exact setup: Caddy's Host passed through,
saas-router with `auth_request`, and both portal blocks.
- `app.pentagonfundinggroup.com`, `admin.pentagonfundinggroup.com` and
  `exodias.fourcornerfunding.com` (through the router), and both main domains,
  each got their own tags.
- Deep links and crawler user agents got them too.
- With the API down, the page was served with the defaults.

## Check

```bash
curl -s https://<partner-domain>/login | grep -E '<title>|og:'
```

You should see one `<title>`, the partner's `og:title` and `og:image`, and no
`<!--#` left in the output.

Previews are cached by each service. To refresh a link already shared, use
Facebook's Sharing Debugger or LinkedIn's Post Inspector. WhatsApp only refreshes
for new messages, after its own cache expires.

## Tests

- API: `tests/Feature/Branding/PortalMetaTest.php`, `tests/Unit/Branding/PortalMetaTest.php` (fch-api)
- `tests/index-html.test.ts`, `tests/utils/portalMeta.test.ts`, `tests/components/Layout/AuthPortalMeta.test.tsx`
- `e2e/login-portal-meta.spec.ts`. Its SSI case runs when `E2E_SSI_BASE_URL`
  points at an Nginx serving this build with the config above.
