// Server Component — no 'use client' directive
export function ThemeScript(): React.JSX.Element {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('pah-theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored === 'dark' || stored === 'light'
          ? stored
          : (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}
    })();
  `.replace(/</g, '\\u003c')

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
