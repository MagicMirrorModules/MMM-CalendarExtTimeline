const config = {
  address: "0.0.0.0",
  ipWhitelist: [],
  logLevel: ["INFO", "LOG", "WARN", "ERROR", "DEBUG"],
  modules: [
    {
      module: "clock",
      position: "top_left"
    },
    {
      module: "calendar",
      position: "top_right",
      config: {
        calendars: [
          {
            name: "mull",
            url: "http://localhost:8080/modules/MMM-CalendarExtTimeline/demo.ics",
            color: "#4CAF50"
          },
          {
            name: "test",
            url: "http://localhost:8080/modules/MMM-CalendarExtTimeline/demo-test.ics",
            color: "#F0B400"
          }
        ],
        showSymbol: true,
        broadcastPastEvents: true,
        maximumNumberOfDays: 60,
        maximumEntries: 50,
        sliceMultiDayEvents: true,
        hideDuplicates: false
      }
    },
    {
      module: "MMM-CalendarExtTimeline",
      position: "bottom_bar",
      config: {
        type: "static",
        refresh_interval_sec: 60,
        table_title_format: "ddd, MMM Do",
        begin_hour: 0,
        end_hour: 23,
        fromNow: 0,
        time_display_section_count: 12,
        calendars: ["mull", "test"],
        source: "CALENDAR"
      }
    }
  ]
}

/** ************* DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") {
  module.exports = config
}
