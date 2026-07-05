var TimelineUtils = {}

TimelineUtils.round = function(number, precision) {
	var factor = Math.pow(10, precision)
	var tempNumber = number * factor
	var roundedTempNumber = Math.round(tempNumber)
	return roundedTempNumber / factor
}

TimelineUtils.readableTextColor = function(color) {
	if (typeof color !== "string") {
		return "#111"
	}

	var hex = color.trim()
	if (hex[0] === "#") {
		hex = hex.substring(1)
	}

	if (hex.length === 3) {
		hex = hex.split("").map(function(ch) {
			return ch + ch
		}).join("")
	}

	if (/^[0-9a-fA-F]{6}$/.test(hex)) {
		var r = parseInt(hex.substring(0, 2), 16)
		var g = parseInt(hex.substring(2, 4), 16)
		var b = parseInt(hex.substring(4, 6), 16)
		var luminance = (0.299 * r) + (0.587 * g) + (0.114 * b)
		return luminance > 160 ? "#111" : "#fff"
	}

	return "#111"
}

TimelineUtils.formatByPattern = function(date, pattern, locale) {
	var lang = locale || "en-US"
	var pad = function(n) { return String(n).padStart(2, "0") }
	var day = date.getDate()
	var suffix = "th"
	if (day < 11 || day > 13) {
		suffix = { 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th"
	}
	var tokens = {
		dddd: new Intl.DateTimeFormat(lang, { weekday: "long" }).format(date),
		ddd: new Intl.DateTimeFormat(lang, { weekday: "short" }).format(date),
		MMMM: new Intl.DateTimeFormat(lang, { month: "long" }).format(date),
		MMM: new Intl.DateTimeFormat(lang, { month: "short" }).format(date),
		Do: day + suffix,
		DD: pad(day),
		D: String(day)
	}
	return String(pattern || "").replace(/dddd|MMMM|ddd|MMM|Do|DD|D/g, function(token) {
		return tokens[token] || token
	})
}

Module.register("MMM-CalendarExtTimeline",{
	defaults: {
		type: "static", // "static", "dynamic"
		refresh_interval_sec: 60,
		table_title_format: "ddd, MMM Do",
		begin_hour: 8,
		end_hour: 20,
		fromNow: 0,
		time_display_section_count: 6,
		calendars: [],
		source: "CALENDAR", // "CALENDAR" or "CALEXT2"
	},

	start: function() {
		this.events = []
		if (this.config.refresh_interval_sec < 60) {
			this.config.refresh_interval_sec = 60
		}
		this.names = this.config.calendars
	},

	getStyles: function() {
		return ["MMM-CalendarExtTimeline.css"]
	},

	getDom: function() {
		var lang = (typeof config !== "undefined" && config.language) ? config.language : "en-US"
		var is24Hour = config && Number(config.timeFormat) === 24
		var titleFormatter = new Intl.DateTimeFormat(lang, { weekday: "short", month: "short", day: "numeric" })
		var timeFormatter = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", hour12: !is24Hour })
		var titleFormatPattern = this.config.table_title_format

		if (this.config.type == "dynamic") {
			this.startTime = new Date()
			this.startTime.setMinutes(0, 0, 0)
			this.endTime = new Date(this.startTime)
			this.endTime.setHours(this.endTime.getHours() + this.config.end_hour)
		} else {
			this.startTime = new Date()
			this.startTime.setHours(this.config.begin_hour, 0, 0, 0)
			this.startTime.setDate(this.startTime.getDate() + this.config.fromNow)
			this.endTime = new Date()
			this.endTime.setHours(this.config.end_hour, 0, 0, 0)
			this.endTime.setDate(this.endTime.getDate() + this.config.fromNow)
		}
		this.hour_diff_sec = Math.round(
			((this.endTime - this.startTime) / 1000)
			/ this.config.time_display_section_count
		)

		var wrapper = document.createElement("div")
		wrapper.className = "timeline timelineModule"
		wrapper.id = "MMM-CalendarExtTimeline"
		var frameTable = document.createElement("table")
		frameTable.className = "frameTable"

		var frameHeader = document.createElement("thead")
		var frameHeaderRow = document.createElement("tr")
		var headerTitleCell = document.createElement("th")
		var resolvedTitle = titleFormatter.format(this.startTime)
		if (typeof titleFormatPattern === "string" && titleFormatPattern.trim() !== "") {
			resolvedTitle = TimelineUtils.formatByPattern(this.startTime, titleFormatPattern, lang) || resolvedTitle
		}
		headerTitleCell.textContent = resolvedTitle
		headerTitleCell.className = "titleCol"
		var headerTimeCell = document.createElement("th")
		headerTimeCell.className = "timeCol"
		//var holder = document.createElement("div")
		//holder.className = "holder"
		//headerTimeCell.appendChild(holder)

		var hourTable = document.createElement("table")
		var httr = document.createElement("tr")

		var i = 0
		var st = new Date(this.startTime)
		for(i=0; i<this.config.time_display_section_count; i++) {
			var td = document.createElement("td")
			var p = document.createElement("p")
			p.innerHTML = timeFormatter.format(st)
			st = new Date(st.getTime() + this.hour_diff_sec * 1000)
			td.appendChild(p)
			httr.appendChild(td)
		}
		hourTable.appendChild(httr)
		headerTimeCell.appendChild(hourTable)

		var curTime = new Date()

		if (curTime >= this.startTime && curTime <= this.endTime) {
			curTimeline = document.createElement("div")
			curTimeline.className = "current_timeline"
			var gap = (this.endTime - this.startTime) / 1000
			var curgap = (curTime - this.startTime) / 1000
			var position = TimelineUtils.round(curgap * 100/gap, 2)
			curTimeline.style.left = position + "%"
			headerTimeCell.appendChild(curTimeline)
		}

		frameHeaderRow.appendChild(headerTitleCell)
		frameHeaderRow.appendChild(headerTimeCell)
		frameHeader.appendChild(frameHeaderRow)
		frameTable.appendChild(frameHeader)

		var frameBody = document.createElement("tbody")
		var i = 0
		var self = this
		this.names.forEach(function(name){
			var row = document.createElement("tr")
			var nameCell = document.createElement("td")
			nameCell.className = "calendar calendar_" + i
			nameCell.innerHTML = name
			var scheduleCell = document.createElement("td")
			scheduleCell.className = "schedules schedules_" + i
			var holder = document.createElement("div")
			holder.className = "holder"

			holder = self.makeEvents(name, holder)
			scheduleCell.appendChild(holder)

			i++
			row.appendChild(nameCell)
			row.appendChild(scheduleCell)
			frameBody.appendChild(row)
		})
		frameTable.appendChild(frameBody)
		wrapper.appendChild(frameTable)
		return wrapper
	},

	notificationReceived: function(notification, payload, sender) {
		if (notification == "CALENDAR_EVENTS") {
			this.updateContentFromCalendarEvents(payload)
		}
		if (notification == "DOM_OBJECTS_CREATED") {
			this.updateDom()
			var self = this
			setInterval(function(){
				if (self.config.source == "CALEXT2") {
					self.updateRequest2()
				}
				self.updateDom()
			}, this.config.refresh_interval_sec * 1000)
		}

		if (notification == "CALEXT2_CALENDAR_MODIFIED") {
			var self = this
			setTimeout(function(){
				self.updateRequest2()
			}, 1000)
		}
	},

	makeEvents: function(name, parentDom) {
		var startMs = this.startTime.getTime()
		var endMs = this.endTime.getTime()
		var totalGap = endMs - startMs
		var events = []
		var stack = [[]]
		var self = this
		this.events.forEach(function(e) {
			var eName = e.name
			if (eName) {
				if (eName == name) {
					var eStart = e.startDate
					var eEnd = e.endDate
					var isValid = false
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
						var isPushed = false
						for(var j=0; j<stack.length; j++) {
							var s = stack[j]
							var fitToStack = true
							for(var i=0; i<s.length; i++) {
								var ee = s[i]
								var isCrossed = !(eStart > ee.endDate || eEnd < ee.startDate)
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
							var s = []
							s.push(e)
							stack.push(s)
						}
					}
				}
			}
		})
		stack.forEach(function(s) {
			var line = document.createElement("div")
			line.className = "eventPositionLine"
			if (self.config.source == "CALEXT2") line.className += " CX2"
			s.forEach(function(e) {
				var eStart = e.startDate
				var eEnd = e.endDate
				if (eStart < startMs) {
					eStart = startMs
				}
				if (eEnd > endMs) {
					eEnd = endMs
				}
				var gap = eEnd - eStart
				var width = TimelineUtils.round(gap * 100 / totalGap, 2) + "%"

				var startPosition = eStart - startMs
				var position = TimelineUtils.round(startPosition * 100 / totalGap, 2) + "%"

				var ev = document.createElement("div")
				ev.className = "event "
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
					ev.className += " startHere"
				}
				if (e.endInView) {
					ev.className += " endHere"
				}
				if (e.fullDayEvent) {
					ev.className += " fulldayevent"
				}
				line.appendChild(ev)
			})
			parentDom.appendChild(line)
		})
		return parentDom
	},

	updateContent: function(payload=null) {
		if (payload != null) {
			if(payload.message == "SCHEDULE_FOUND") {
				this.events = payload.events
				this.events.sort(function(a, b){
					if (a.startTime == b.startTime) {
						return a.endTime - b.endTime
					} else {
						return a.startTime - b.startTime
					}
				})
			}
			this.updateDom()
		}
	},
	updateContentFromCalendarEvents: function(events) {
		if (!Array.isArray(events)) {
			return
		}
		var configuredNames = Array.isArray(this.config.calendars) ? this.config.calendars.slice() : []
		var discoveredNames = []
		this.events = events
			.map(function(event) {
				var calendarName = event.calendarName || event.name || "calendar"
				var startDate = parseInt(event.startDate, 10)
				var endDate = parseInt(event.endDate, 10)
				if (discoveredNames.indexOf(calendarName) < 0) {
					discoveredNames.push(calendarName)
				}
				return {
					name: calendarName,
					title: event.title,
					startDate: startDate,
					endDate: endDate,
					fullDayEvent: !!event.fullDayEvent,
					styleName: event.styleName || "",
					color: event.color || "",
					bgColor: event.bgColor || ""
				}
			})
			.filter(function(event) {
				return event.name && event.title && Number.isFinite(event.startDate) && Number.isFinite(event.endDate)
			})
		if (this.config.source == "CALENDAR") {
			this.names = configuredNames.length > 0 ? configuredNames : (discoveredNames.length > 0 ? discoveredNames : ["calendar"])
			discoveredNames.forEach((name) => {
				if (this.names.indexOf(name) < 0) {
					this.names.push(name)
				}
			})
		}
		this.events.sort(function(a, b){
			if (a.startDate == b.startDate) {
				return a.endDate - b.endDate
			} else {
				return a.startDate - b.startDate
			}
		})
		this.updateDom()
	},
	updateRequest2: function() {
		var payload = {
			filter: (e) => {
				var fromDate = new Date()
				fromDate.setHours(0, 0, 0, 0)
				fromDate.setDate(fromDate.getDate() + this.config.fromNow)
				var toDate = new Date()
				toDate.setHours(23, 59, 59, 999)
				toDate.setDate(toDate.getDate() + this.config.fromNow)
				var from = Math.floor(fromDate.getTime() / 1000)
				var to = Math.floor(toDate.getTime() / 1000)
				if (this.names.indexOf(e.calendarName) < 0) return false
				if (e.startDate > to || e.endDate < from) return false
				return true
			},
			callback: (events) => {
				if (events.length > 0) {
					for (i = 0; i < events.length; i++) {
						events[i].name = events[i].calendarName
						events[i].startDate = events[i].startDate * 1000
						events[i].endDate = events[i].endDate * 1000
						events[i].styleName = events[i].className

						if (typeof this.config.transform == "function") {
							var ev = Object.assign({}, events[i])
							events[i] = this.config.transform(ev)
						}
					}
					var payload = {
						message: "SCHEDULE_FOUND",
						events: events
					}
					this.updateContent(payload)
				}
			}
		}
		this.sendNotification("CALEXT2_EVENT_QUERY", payload)
	}
})
