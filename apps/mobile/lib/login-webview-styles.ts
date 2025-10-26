/**
 * Generates CSS used to restyle the Hacker News login form inside the WebView.
 * We keep everything in TypeScript so tests can assert on the generated output.
 */
export function getLoginPageStyles(isDarkMode: boolean): string {
  const colors = {
    backgroundPrimary: isDarkMode ? '#000000' : '#ffffff',
    backgroundSecondary: isDarkMode ? '#1c1c1e' : '#f9f9f9',
    border: isDarkMode ? '#38383a' : '#e0e0e0',
    focusBorder: '#ff6600',
    textPrimary: isDarkMode ? '#ffffff' : '#000000',
    textSecondary: isDarkMode ? '#8e8e93' : '#666666',
    inputText: isDarkMode ? '#ffffff' : '#000000',
    buttonBackground: '#ff6600',
    buttonActive: '#cc5200',
    link: '#ff6600',
  };

  const focusShadow = isDarkMode ? 'box-shadow: 0 0 0 4px rgba(255, 102, 0, 0.1) !important;' : '';

  return `
    :root {
      --bg-primary: ${colors.backgroundPrimary};
      --bg-secondary: ${colors.backgroundSecondary};
      --border-color: ${colors.border};
      --border-focus: ${colors.focusBorder};
      --text-primary: ${colors.textPrimary};
      --text-secondary: ${colors.textSecondary};
      --input-text: ${colors.inputText};
      --button-bg: ${colors.buttonBackground};
      --button-bg-active: ${colors.buttonActive};
      --link-color: ${colors.link};
    }

    body > center > table:first-child,
    body > center > table > tbody > tr:first-child {
      display: none !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
      background: var(--bg-primary) !important;
      padding: 20px !important;
      margin: 0 !important;
      color: var(--text-primary) !important;
    }

    body > center {
      width: 100% !important;
      max-width: 100% !important;
      display: block !important;
    }

    body > center > table {
      width: 100% !important;
      border: none !important;
      background: var(--bg-primary) !important;
    }

    form {
      margin: 20px 0 !important;
    }

    table {
      border-spacing: 0 !important;
      border-collapse: separate !important;
      width: 100% !important;
    }

    tr {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    td {
      padding: 0 !important;
    }

    td:first-child {
      display: none !important;
    }

    td:last-child {
      display: block !important;
      width: 100% !important;
      padding: 0 !important;
    }

    input[type="text"],
    input[type="password"] {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 14px 16px !important;
      font-size: 17px !important;
      border: 1px solid var(--border-color) !important;
      border-radius: 10px !important;
      background: var(--bg-secondary) !important;
      color: var(--input-text) !important;
      margin: 8px 0 !important;
      box-sizing: border-box !important;
      -webkit-appearance: none !important;
      transition: all 0.2s ease !important;
    }

    input[type="text"]::placeholder,
    input[type="password"]::placeholder {
      color: var(--text-secondary) !important;
      opacity: 1 !important;
    }

    input[type="text"]:focus,
    input[type="password"]:focus {
      outline: none !important;
      border-color: var(--border-focus) !important;
      background: var(--bg-primary) !important;
      ${focusShadow}
    }

    input[type="submit"] {
      display: block !important;
      width: 100% !important;
      padding: 15px !important;
      font-size: 17px !important;
      font-weight: 600 !important;
      color: #ffffff !important;
      background: var(--button-bg) !important;
      border: none !important;
      border-radius: 10px !important;
      margin: 16px 0 !important;
      cursor: pointer !important;
      -webkit-appearance: none !important;
      transition: all 0.2s ease !important;
      box-sizing: border-box !important;
    }

    input[type="submit"]:active {
      background: var(--button-bg-active) !important;
      transform: scale(0.98) !important;
    }

    b {
      font-size: 28px !important;
      font-weight: 700 !important;
      color: var(--text-primary) !important;
      display: block !important;
      margin: 32px 0 20px 0 !important;
    }

    b:first-of-type {
      margin-top: 0 !important;
    }

    a {
      color: var(--link-color) !important;
      text-decoration: none !important;
      font-size: 16px !important;
      display: inline-block !important;
      margin: 16px 0 !important;
    }

    br {
      display: none !important;
    }

    center {
      text-align: left !important;
    }

    tr[style*="height"] {
      height: 8px !important;
    }

    form + b {
      border-top: 1px solid var(--border-color) !important;
      padding-top: 32px !important;
    }
  `;
}
