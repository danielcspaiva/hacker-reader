import { getLoginPageStyles } from './login-webview-styles';

export const clearCookieIntervalScript =
  'window.__hnCookieInterval && clearInterval(window.__hnCookieInterval); window.__hnCookieInterval = null; true;';

export interface CookieExtractionMessage {
  type: 'COOKIES_EXTRACTED';
  cookies: string;
  cookieMap: Record<string, string>;
  user?: string;
  timestamp: number;
}

export function getLoginPageScript(): string {
  const lightStyles = JSON.stringify(getLoginPageStyles(false));
  const darkStyles = JSON.stringify(getLoginPageStyles(true));

  return `
    (function() {
      const LIGHT_STYLES = ${lightStyles};
      const DARK_STYLES = ${darkStyles};
      const STYLE_ID = '__hn_login_styles';

      const ensureStyleTag = (css) => {
        const existing = document.getElementById(STYLE_ID);
        if (existing) {
          existing.textContent = css;
          return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
      };

      const applyPlaceholders = () => {
        const usernameInputs = document.querySelectorAll('input[name="acct"]');
        const passwordInputs = document.querySelectorAll('input[name="pw"]');
        usernameInputs.forEach(input => {
          if (!input.getAttribute('placeholder')) {
            input.setAttribute('placeholder', 'Username');
          }
        });
        passwordInputs.forEach(input => {
          if (!input.getAttribute('placeholder')) {
            input.setAttribute('placeholder', 'Password');
          }
        });

        const labelCells = Array.from(document.querySelectorAll('td'));
        labelCells.forEach(cell => {
          const value = cell.textContent ? cell.textContent.trim().toLowerCase() : '';
          if (value === 'username:' || value === 'password:') {
            cell.style.display = 'none';
          }
        });
      };

      const parseCookies = (cookieString) => {
        return cookieString.split(';').reduce((acc, cookie) => {
          const [key, ...rest] = cookie.split('=');
          if (!key) {
            return acc;
          }
          const value = rest.join('=').trim();
          if (key.trim()) {
            acc[key.trim()] = value;
          }
          return acc;
        }, {});
      };

      const postCookies = () => {
        const cookies = document.cookie || '';
        const cookieMap = parseCookies(cookies);
        const payload = {
          type: 'COOKIES_EXTRACTED',
          cookies,
          cookieMap,
          user: cookieMap.user || undefined,
          timestamp: Date.now(),
        };

        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      };

      const setupCookieInterval = () => {
        if (window.__hnCookieInterval) {
          clearInterval(window.__hnCookieInterval);
        }
        postCookies();
        window.__hnCookieInterval = setInterval(postCookies, 1500);
      };

      try {
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const css = isDarkMode ? DARK_STYLES : LIGHT_STYLES;

        applyPlaceholders();
        ensureStyleTag(css);
        setupCookieInterval();
      } catch (error) {
        console.error('HN login styling error:', error);
      }

      true;
    })();
  `;
}
