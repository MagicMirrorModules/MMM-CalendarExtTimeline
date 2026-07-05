const TimelineUtils = {}

TimelineUtils.round = function (number, precision) {
  const factor = 10 ** precision
  const tempNumber = number * factor
  const roundedTempNumber = Math.round(tempNumber)
  return roundedTempNumber / factor
}

TimelineUtils.readableTextColor = function (color) {
  if (typeof color !== 'string') {
    return '#111'
  }

  let hex = color.trim()
  if (hex[0] === '#') {
    hex = hex.substring(1)
  }

  if (hex.length === 3) {
    hex = hex.split('').map(ch => ch + ch).join('')
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b)
    return luminance > 160 ? '#111' : '#fff'
  }

  return '#111'
}

TimelineUtils.formatByPattern = function (date, pattern, locale) {
  const lang = locale || 'en-US'
  const pad = function (n) {
    return String(n).padStart(2, '0')
  }
  const day = date.getDate()
  let suffix = 'th'
  if (day < 11 || day > 13) {
    suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th'
  }
  const tokens = {
    dddd: new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(date),
    ddd: new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(date),
    MMMM: new Intl.DateTimeFormat(lang, { month: 'long' }).format(date),
    MMM: new Intl.DateTimeFormat(lang, { month: 'short' }).format(date),
    Do: day + suffix,
    DD: pad(day),
    D: String(day),
  }
  return String(pattern || '').replace(/dddd|MMMM|ddd|MMM|Do|DD|D/g, token => tokens[token] || token)
}

Module.register('MMM-CalendarExtTimeline', {
  defaults: {
    type: 'static', // "static", "dynamic"
    refresh_interval_sec: 60,
    table_title_format: 'ddd, MMM Do',
    begin_hour: 8,
    end_hour: 20,
    fromNow: 0,
    time_display_section_count: 6,
    calendars: [],
    source: 'CALENDAR', // "CALENDAR" or "CALEXT2"
  },

  start() {
    this.events = []
    if (this.config.refresh_interval_sec < 60) {
      this.config.refresh_interval_sec = 60
    }
    this.names = this.config.calendars
  },

  getStyles() {
    return ['MMM-CalendarExtTimeline.css']
  },

  getDom() {
    const lang = (typeof config !== 'undefined' && config.language) ? config.language : 'en-US'
    const is24Hour = config && Number(config.timeFormat) === 24
    const titleFormatter = new Intl.DateTimeFormat(lang, { weekday: 'short', month: 'short', day: 'numeric' })
    const timeFormatter = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: !is24Hour })
    const titleFormatPattern = this.config.table_title_format

    if (this.config.type == 'dynamic') {
      this.startTime = new Date()
      this.startTime.setMinutes(0, 0, 0)
      this.endTime = new Date(this.startTime)
      this.endTime.setHours(this.endTime.getHours() + this.config.end_hour)
    }
    else {
      this.startTime = new Date()
      this.startTime.setHours(this.config.begin_hour, 0, 0, 0)
      this.startTime.setDate(this.startTime.getDate() + this.config.fromNow)
      this.endTime = new Date()
      this.endTime.setHours(this.config.end_hour, 0, 0, 0)
      this.endTime.setDate(this.endTime.getDate() + this.config.fromNow)
    }
    this.hour_diff_sec = Math.round(
      ((this.endTime - this.startTime) / 1000)
      / this.config.time_display_section_count,
    )

    const wrapper = document.createElement('div')
    wrapper.className = 'timeline timelineModule'
    wrapper.id = 'MMM-CalendarExtTimeline'
    const frameTable = document.createElement('table')
    frameTable.className = 'frameTable'

    const frameHeader = document.createElement('thead')
    const frameHeaderRow = document.createElement('tr')
    const headerTitleCell = document.createElement('th')
    let resolvedTitle = titleFormatter.format(this.startTime)
    if (typeof titleFormatPattern === 'string' && titleFormatPattern.trim() !== '') {
      resolvedTitle = TimelineUtils.formatByPattern(this.startTime, titleFormatPattern, lang) || resolvedTitle
    }
    headerTitleCell.textContent = resolvedTitle
    headerTitleCell.className = 'titleCol'
    const headerTimeCell = document.createElement('th')
    headerTimeCell.className = 'timeCol'
    // Var holder = document.createElement("div")
    // Holder.className = "holder"
    // HeaderTimeCell.appendChild(holder)

    const hourTable = document.createElement('table')
    const httr = document.createElement('tr')

    let st = new Date(this.startTime)
    for (let i = 0; i < this.config.time_display_section_count; i++) {
      const td = document.createElement('td')
      const p = document.createElement('p')
      p.innerHTML = timeFormatter.format(st)
      st = new Date(st.getTime() + this.hour_diff_sec * 1000)
      td.appendChild(p)
      httr.appendChild(td)
    }
    hourTable.appendChild(httr)
    headerTimeCell.appendChild(hourTable)

    const curTime = new Date()

    if (curTime >= this.startTime && curTime <= this.endTime) {
      const curTimeline = document.createElement('div')
      curTimeline.className = 'current_timeline'
      const gap = (this.endTime - this.startTime) / 1000
      const curgap = (curTime - this.startTime) / 1000
      const position = TimelineUtils.round(curgap * 100 / gap, 2)
      curTimeline.style.left = `${position}%`
      headerTimeCell.appendChild(curTimeline)
    }

    frameHeaderRow.appendChild(headerTitleCell)
    frameHeaderRow.appendChild(headerTimeCell)
    frameHeader.appendChild(frameHeaderRow)
    frameTable.appendChild(frameHeader)

    const frameBody = document.createElement('tbody')
    let rowIndex = 0
    const self = this
    this.names.forEach((name) => {
      const row = document.createElement('tr')
      const nameCell = document.createElement('td')
      nameCell.className = `calendar calendar_${rowIndex}`
      nameCell.innerHTML = name
      const scheduleCell = document.createElement('td')
      scheduleCell.className = `schedules schedules_${rowIndex}`
      let holder = document.createElement('div')
      holder.className = 'holder'

      holder = self.makeEvents(name, holder)
      scheduleCell.appendChild(holder)

      rowIndex++
      row.appendChild(nameCell)
      row.appendChild(scheduleCell)
      frameBody.appendChild(row)
    })
    frameTable.appendChild(frameBody)
    wrapper.appendChild(frameTable)
    return wrapper
  },

  notificationReceived(notification, payload) {
    if (notification == 'CALENDAR_EVENTS') {
      this.updateContentFromCalendarEvents(payload)
    }
    if (notification == 'DOM_OBJECTS_CREATED') {
      this.updateDom()
      const self = this
      setInterval(() => {
        if (self.config.source == 'CALEXT2') {
          self.updateRequest2()
        }
        self.updateDom()
      }, this.config.refresh_interval_sec * 1000)
    }

    if (notification == 'CALEXT2_CALENDAR_MODIFIED') {
      const self2 = this
      setTimeout(() => {
        self2.updateRequest2()
      }, 1000)
    }
  },

  makeEvents(name, parentDom) {
    const startMs = this.startTime.getTime()
    const endMs = this.endTime.getTime()
    const totalGap = endMs - startMs
    const stack = [[]]
    const self = this
    this.events.forEach((e) => {
      const eName = e.name
      if (eName) {
        if (eName == name) {
          const eStart = e.startDate
          const eEnd = e.endDate
          let isValid = false
          if (eStart >= startMs && eStart < endMs) {
            e.startInView = true
            isValid = true
          }
          if (eEnd > startMs && eEnd <= endMs) {
            e.endInView = true
            isValid = true
          }
          if (eStart <= startMs && eEnd >= endMs) {
            e.overView = true
            isValid = true
          }
          if (isValid) {
            let isPushed = false
            for (let j = 0; j < stack.length; j++) {
              const s = stack[j]
              let fitToStack = true
              for (let i = 0; i < s.length; i++) {
                const ee = s[i]
                const isCrossed = !(eStart > ee.endDate || eEnd < ee.startDate)
                if (isCrossed) {
                  fitToStack = false
                  break
                }
              }
              if (fitToStack) {
                s.push(e)
                isPushed = true
                break
              }
            }
            if (!isPushed) {
              const newStack = []
              newStack.push(e)
              stack.push(newStack)
            }
          }
        }
      }
    })
    stack.forEach((s) => {
      const line = document.createElement('div')
      line.className = 'eventPositionLine'
      if (self.config.source == 'CALEXT2') { line.className += ' CX2' }
      s.forEach((e) => {
        let eStart = e.startDate
        let eEnd = e.endDate
        if (eStart < startMs) {
          eStart = startMs
        }
        if (eEnd > endMs) {
          eEnd = endMs
        }
        const gap = eEnd - eStart
        const width = `${TimelineUtils.round(gap * 100 / totalGap, 2)}%`

        const startPosition = eStart - startMs
        const position = `${TimelineUtils.round(startPosition * 100 / totalGap, 2)}%`

        const ev = document.createElement('div')
        ev.className = 'event '
        ev.className += e.styleName
        if (e.color) {
          ev.style.backgroundColor = e.color
          ev.style.borderColor = e.color
          ev.style.color = TimelineUtils.readableTextColor(e.color)
        }
        if (e.bgColor) {
          ev.style.backgroundColor = e.bgColor
        }
        ev.style.width = width
        ev.style.left = position
        ev.innerHTML = e.title
        if (e.startInView) {
          ev.className += ' startHere'
        }
        if (e.endInView) {
          ev.className += ' endHere'
        }
        if (e.fullDayEvent) {
          ev.className += ' fulldayevent'
        }
        line.appendChild(ev)
      })
      parentDom.appendChild(line)
    })
    return parentDom
  },

  updateContent(payload = null) {
    if (payload != null) {
      if (payload.message == 'SCHEDULE_FOUND') {
        this.events = payload.events
        this.events.sort((a, b) => {
          if (a.startTime == b.startTime) {
            return a.endTime - b.endTime
          }

          return a.startTime - b.startTime
        })
      }
      this.updateDom()
    }
  },
  updateContentFromCalendarEvents(events) {
    if (!Array.isArray(events)) {
      return
    }
    const configuredNames = Array.isArray(this.config.calendars) ? this.config.calendars.slice() : []
    const discoveredNames = []
    this.events = events
      .map((event) => {
        const calendarName = event.calendarName || event.name || 'calendar'
        const startDate = parseInt(event.startDate, 10)
        const endDate = parseInt(event.endDate, 10)
        if (discoveredNames.indexOf(calendarName) < 0) {
          discoveredNames.push(calendarName)
        }
        return {
          name: calendarName,
          title: event.title,
          startDate,
          endDate,
          fullDayEvent: Boolean(event.fullDayEvent),
          styleName: event.styleName || '',
          color: event.color || '',
          bgColor: event.bgColor || '',
        }
      })
      .filter(event => event.name && event.title && Number.isFinite(event.startDate) && Number.isFinite(event.endDate))
    if (this.config.source == 'CALENDAR') {
      this.names = configuredNames.length > 0 ? configuredNames : (discoveredNames.length > 0 ? discoveredNames : ['calendar'])
      discoveredNames.forEach((name) => {
        if (this.names.indexOf(name) < 0) {
          this.names.push(name)
        }
      })
    }
    this.events.sort((a, b) => {
      if (a.startDate == b.startDate) {
        return a.endDate - b.endDate
      }

      return a.startDate - b.startDate
    })
    this.updateDom()
  },
  updateRequest2() {
    const payload = {
      filter: (e) => {
        const fromDate = new Date()
        fromDate.setHours(0, 0, 0, 0)
        fromDate.setDate(fromDate.getDate() + this.config.fromNow)
        const toDate = new Date()
        toDate.setHours(23, 59, 59, 999)
        toDate.setDate(toDate.getDate() + this.config.fromNow)
        const from = Math.floor(fromDate.getTime() / 1000)
        const to = Math.floor(toDate.getTime() / 1000)
        if (this.names.indexOf(e.calendarName) < 0) { return false }
        if (e.startDate > to || e.endDate < from) { return false }
        return true
      },
      callback: (events) => {
        if (events.length > 0) {
          for (let i = 0; i < events.length; i++) {
            events[i].name = events[i].calendarName
            events[i].startDate = events[i].startDate * 1000
            events[i].endDate = events[i].endDate * 1000
            events[i].styleName = events[i].className

            if (typeof this.config.transform === 'function') {
              const ev = { ...events[i] }
              events[i] = this.config.transform(ev)
            }
          }
          const payload = {
            message: 'SCHEDULE_FOUND',
            events,
          }
          this.updateContent(payload)
        }
      },
    }
    this.sendNotification('CALEXT2_EVENT_QUERY', payload)
  },
})
