function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/); if (!headerLine) return [];
  const headers = headerLine.split(',').map(value => value.trim());
  return lines.filter(Boolean).map(line => Object.fromEntries(headers.map((header, index) => [header, line.split(',')[index] || ''])));
}
async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}
async function getText(url, headers = {}) {
  const response = await fetch(url, { headers, redirect: 'follow' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}
module.exports = { getJson, getText, parseCsv };
