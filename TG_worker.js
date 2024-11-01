addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const uuid = searchParams.get('uuid')
  const days = parseInt(searchParams.get('days'), 10)

  if (action === 'add' && uuid && !isNaN(days)) {
    let existingUUIDs = await Your_KV_Name_Space.get('UUID')
    let expirationDates = await Your_KV_Name_Space.get('ExpirationDates')
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + days)
    const expirationTimestamp = expirationDate.getTime()
    const uuidEntry = `${uuid}:${expirationTimestamp}`

    if (existingUUIDs) {
      const uuidList = existingUUIDs.split(',')
      if (uuidList.includes(uuid)) {
        return new Response(`کد ${uuid} از قبل وجود دارد`)
      } else {
        existingUUIDs += `,${uuid}`
        expirationDates += `,${uuid}:${expirationTimestamp}`
      }
    } else {
      existingUUIDs = uuid
      expirationDates = `${uuid}:${expirationTimestamp}`
    }
    await Your_KV_Name_Space.put('UUID', existingUUIDs)
    await Your_KV_Name_Space.put('ExpirationDates', expirationDates)
    return new Response(`کد ${uuid} با اعتبار ${days} روز افزوده شد.`)
  } else if (action === 'delete' && uuid) {
    let existingUUIDs = await Your_KV_Name_Space.get('UUID')
    let expirationDates = await Your_KV_Name_Space.get('ExpirationDates')
    if (existingUUIDs) {
      const uuidList = existingUUIDs.split(',').filter(item => item !== uuid)
      const expirationList = expirationDates.split(',').filter(item => !item.startsWith(uuid))
      await Your_KV_Name_Space.put('UUID', uuidList.join(','))
      await Your_KV_Name_Space.put('ExpirationDates', expirationList.join(','))
      return new Response(`کد ${uuid} باموفقیت حذف شد`)
    } else {
      return new Response('هیچ کدی برای حذف یافت نشد', { status: 404 })
    }
  } else if (action === 'list') {
    let existingUUIDs = await Your_KV_Name_Space.get('UUID')
    let expirationDates = await Your_KV_Name_Space.get('ExpirationDates')
    if (existingUUIDs) {
      const uuidList = existingUUIDs.split(',')
      const expirationList = expirationDates.split(',')
      const now = Date.now()
      const result = uuidList.map(uuid => {
        const expirationEntry = expirationList.find(entry => entry.startsWith(uuid))
        if (expirationEntry) {
          const expirationTimestamp = parseInt(expirationEntry.split(':')[1], 10)
          const daysLeft = Math.ceil((expirationTimestamp - now) / (1000 * 60 * 60 * 24))
          return `${uuid} ${expirationTimestamp} ${daysLeft}`
        } else {
          return `${uuid} expiration date not found`
        }
      })
      return new Response(result.join(', '))
    } else {
      return new Response('No UUIDs found', { status: 404 })
    }
  } else if (action === 'cleanup') {
    await cleanupExpiredUUIDs()
    return new Response('Expired UUIDs cleaned up successfully')
  } else if (action === 'edit' && uuid && !isNaN(days)) {
    let existingUUIDs = await Your_KV_Name_Space.get('UUID')
    let expirationDates = await Your_KV_Name_Space.get('ExpirationDates')
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + days)
    const expirationTimestamp = expirationDate.getTime()
    const uuidEntry = `${uuid}:${expirationTimestamp}`

    if (existingUUIDs) {
      const uuidList = existingUUIDs.split(',')
      if (uuidList.includes(uuid)) {
        const expirationList = expirationDates.split(',').map(entry => {
          if (entry.startsWith(uuid)) {
            return uuidEntry
          }
          return entry
        })
        await Your_KV_Name_Space.put('ExpirationDates', expirationList.join(','))
        return new Response(`کد ${uuid} با اعتبار ${days} روز ویرایش شد.`)
      } else {
        return new Response(`کد ${uuid} یافت نشد`, { status: 404 })
      }
    } else {
      return new Response('هیچ کدی برای ویرایش یافت نشد', { status: 404 })
    }
  } else {
    return new Response('Invalid action or missing UUID', { status: 400 })
  }
}

async function cleanupExpiredUUIDs() {
  let existingUUIDs = await Your_KV_Name_Space.get('UUID')
  let expirationDates = await Your_KV_Name_Space.get('ExpirationDates')
  if (existingUUIDs) {
    const now = Date.now()
    const uuidList = existingUUIDs.split(',').filter(uuid => {
      const expirationEntry = expirationDates.split(',').find(entry => entry.startsWith(uuid))
      if (expirationEntry) {
        const expirationTimestamp = parseInt(expirationEntry.split(':')[1], 10)
        return expirationTimestamp > now
      }
      return false
    })
    const expirationList = expirationDates.split(',').filter(entry => {
      const expirationTimestamp = parseInt(entry.split(':')[1], 10)
      return expirationTimestamp > now
    })
    await Your_KV_Name_Space.put('UUID', uuidList.join(','))
    await Your_KV_Name_Space.put('ExpirationDates', expirationList.join(','))
  }
}
