#! /usr/bin/env node

const request = require('@warren-bank/node-request').request
const fs      = require('fs')
const path    = require('path')

const enableLog = !process.env.SILENT
const log = (...args) => {
  if (enableLog)
    console.log(...args)
}

const output = (process.argv.length < 3)
  ? path.join(process.cwd(), 'ca-dot-rtmp.txt')
  : path.resolve(process.argv[2])

const region_id = (process.argv.length < 4)
  ? null
  : parseInt(process.argv[3], 10)

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

const getTxtUrl = (rid) => `https://cwwp2.dot.ca.gov/data/d${rid}/cctv/cctvStatusD${(rid < 10) ? '0' : ''}${rid}.txt`

const getM3u8Urls = async function() {
  const txtUrls = []

  if ((typeof region_id === 'number') && !isNaN(region_id)) {
    txtUrls.push(
      getTxtUrl(region_id)
    )
  }
  else {
    for (let i=1; i<=20; i++) {
      txtUrls.push(
        getTxtUrl(i)
      )
    }
  }

  const m3u8UrlRegex = new RegExp('https://wzmedia\\.dot\\.ca\\.gov/[^/]+/[^/]+\\.stream/playlist\\.m3u8', 'g')

  for (let txtUrl of txtUrls) {
    try {
      let {response} = await request(txtUrl)
      response = response.toString()
      log('200:', txtUrl)

      let match
      while(match = m3u8UrlRegex.exec(response)) {
        m3u8Urls.push(match[0])
        log('m3u8:', match[0])
      }
    }
    catch(e) {
      log('404:', txtUrl)
    }
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
