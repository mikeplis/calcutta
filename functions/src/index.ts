import { https } from 'firebase-functions'

export const ncaaProxy = https.onRequest(async (req, res) => {
  // req.path will be e.g. "/2026"
  const url = `https://ncaa-api.henrygd.me/brackets/basketball-men/d1${req.path}`
  const upstream = await fetch(url)
  const data = await upstream.json()
  res.json(data)
})
