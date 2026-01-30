#! /usr/bin/env node

const request = require('@warren-bank/node-request').request
const fs      = require('fs')
const path    = require('path')

const enableLog = !process.env.SILENT
const log = (...args) => {
  if (enableLog)
    console.log(...args)
}

const output  = (process.argv.length < 3)
  ? path.join(process.cwd(), 'ca-dot-rtmp.txt')
  : path.resolve(process.argv[2])

const m3u8Urls = []
const rtmpUrls = []

const isUrlOk = async function(url) {
  try {
    const {response} = await request([url, {method: 'HEAD'}])
    return true
  }
  catch(e) {}
  return false
}

const getM3u8Urls = async function() {
  const txtUrl   = 'https://cwwp2.dot.ca.gov/data/d4/cctv/cctvStatusD04.txt'
  let {response} = await request(txtUrl)
  response = response.toString()

  const m3u8UrlRegex = new RegExp('https://wzmedia\\.dot\\.ca\\.gov/[^/]+/[^/]+\\.stream/playlist\\.m3u8', 'g')
  let match
  while(match = m3u8UrlRegex.exec(response)) {
    m3u8Urls.push(match[0])
    log('m3u8:', match[0])
  }
}

const getRtmpUrls = async function() {
  for (const m3u8Url of m3u8Urls) {
    if (await isUrlOk(m3u8Url)) {
      const rtmpUrl = m3u8Url
        .replace('https://wzmedia.dot.ca.gov/', 'rtmp://wzmedia.dot.ca.gov:1935/')
        .replace('.stream/playlist.m3u8', '.stream')

      rtmpUrls.push(rtmpUrl)
      log('rtmp:', rtmpUrl)
    }
  }
}

const main = async function() {
  await getM3u8Urls()
  await getRtmpUrls()

  fs.writeFileSync(
    output,
    rtmpUrls.join("\n"),
    {encoding: 'utf8'}
  )
}

main()
