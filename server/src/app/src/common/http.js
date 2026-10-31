// All requests are local and carry the header required by the API's CSRF guard.
async function get(url) {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { 'X-VPDS-Request': '1', Accept: 'application/json' }
  })
  const text = await response.text()
  let body
  try {
    body = text ? JSON.parse(text) : {}
  } catch (error) {
    if (response.ok) throw new Error('服务器返回了无效的 JSON')
    body = {}
  }
  if (!response.ok) {
    const error = new Error(body.stderr || body.message || response.statusText || `HTTP ${response.status}`)
    error.status = response.status
    error.body = body
    throw error
  }
  return { status: response.status, statusText: response.statusText, body }
}

export default { get }
