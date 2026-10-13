import type { InviteValidationResult } from '../../invites/application/invites.service';

export interface InviteLandingPageInput {
  credential: string;
  result: InviteValidationResult;
  appScheme: string;
  nonce: string;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

export function renderInviteLandingPage(input: InviteLandingPageInput): string {
  const { result, nonce } = input;
  const credential = encodeURIComponent(input.credential);
  const deepLink = `${input.appScheme}://join/${credential}`;
  const title = result.valid
    ? `Join "${escapeHtml(result.listName ?? 'a list')}" on Listix`
    : 'Listix invitation';
  const body = result.valid
    ? `<h1>${title}</h1>
       <p>${result.memberCount}/${result.maxMembers} members</p>
       <a class="primary" id="open" href="${escapeHtml(deepLink)}">Open in app</a>
       <button id="copy" data-code="${escapeHtml(input.credential)}">Copy code</button>`
    : `<h1>${title}</h1><p class="error">${escapeHtml(result.message ?? 'This invitation is not valid.')}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta name="theme-color" content="#059669">
  <style nonce="${nonce}">
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 16px; }
    main { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; max-width: 420px; width: 100%; text-align: center; }
    a, button { display: block; width: 100%; padding: 12px; margin-top: 12px; border-radius: 10px; border: 1px solid #a7f3d0; background: #ecfdf5; color: #047857; font-size: 16px; text-decoration: none; cursor: pointer; }
    .primary { background: #059669; color: #fff; border: none; }
    .error { color: #b91c1c; }
    @media (prefers-color-scheme: dark) { body { background: #090d16; color: #f8fafc; } main { background: #111827; border-color: #334155; } }
  </style>
</head>
<body>
  <main>
    ${body}
  </main>
  <script nonce="${nonce}">
    const open = document.getElementById('open');
    const copy = document.getElementById('copy');
    if (open) { window.location.href = open.href; }
    if (copy) {
      copy.addEventListener('click', () => {
        navigator.clipboard.writeText(copy.dataset.code).then(() => { copy.textContent = 'Copied!'; });
      });
    }
  </script>
</body>
</html>`;
}
