const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const test = require('node:test')

const moduleSource = readFileSync(
  new URL('../MMM-CalendarExtTimeline.js', `file://${__filename}`),
  'utf8',
)

const createElement = tagName => ({
  append(...children) {
    this.children.push(...children)
  },
  appendChild(child) {
    this.children.push(child)
  },
  children: [],
  style: {},
  tagName,
})

const loadModule = (config = {}) => {
  let definition
  const context = {
    document: { createElement },
    Module: {
      register: (_name, moduleDefinition) => {
        definition = moduleDefinition
      },
    },
  }
  runInNewContext(
    `${moduleSource}\nglobalThis.__timelineUtils = TimelineUtils;`,
    context,
  )
  return {
    module: Object.assign(Object.create(definition), { config }),
    utils: context.__timelineUtils,
  }
}

test('round rounds values to the requested precision', () => {
  const { utils } = loadModule()

  assert.equal(utils.round(12.345, 2), 12.35)
  assert.equal(utils.round(12.344, 2), 12.34)
})

test('readable text color supports shorthand and full hex colors', () => {
  const { utils } = loadModule()

  assert.equal(utils.readableTextColor('#fff'), '#111')
  assert.equal(utils.readableTextColor('000000'), '#fff')
  assert.equal(utils.readableTextColor('invalid'), '#111')
})

test('formatByPattern formats date tokens and locale-specific names', () => {
  const { utils } = loadModule()
  const date = new Date(2024, 0, 1)

  assert.equal(utils.formatByPattern(date, 'dddd, MMMM Do (DD)', 'en-US'), 'Monday, January 1st (01)')
  assert.equal(utils.formatByPattern(date, 'MMMM', 'de-DE'), 'Januar')
})

test('calendar events are normalized, invalid entries filtered, and sorted', () => {
  const { module } = loadModule({ calendars: [], source: 'CALENDAR' })
  module.updateDom = () => {}

  module.updateContentFromCalendarEvents([
    { calendarName: 'Work', title: 'Later', startDate: '2000', endDate: '3000' },
    { name: 'Personal', title: 'Earlier', startDate: '1000', endDate: '1500' },
    { calendarName: 'Broken', title: 'Invalid', startDate: 'invalid', endDate: '4000' },
  ])

  assert.equal(module.events.length, 2)
  assert.equal(module.events[0].name, 'Personal')
  assert.equal(module.events[0].startDate, 1000)
  assert.equal(module.events[1].title, 'Later')
  assert.ok(module.names.includes('Work'))
})

test('adjacent events share one row', () => {
  const { module } = loadModule({ source: 'CALENDAR' })
  const hour = 60 * 60 * 1000
  module.startTime = new Date(8 * hour)
  module.endTime = new Date(10 * hour)
  module.events = [
    { name: 'Work', title: 'First', startDate: 8 * hour, endDate: 9 * hour, styleName: '' },
    { name: 'Work', title: 'Next', startDate: 9 * hour, endDate: 10 * hour, styleName: '' },
  ]
  const parent = createElement('div')

  module.makeEvents('Work', parent)

  assert.equal(parent.children.length, 1)
  assert.equal(parent.children[0].children.length, 2)
})

test('overlapping events stack and clip to the visible window', () => {
  const { module } = loadModule({ source: 'CALENDAR' })
  const hour = 60 * 60 * 1000
  module.startTime = new Date(8 * hour)
  module.endTime = new Date(10 * hour)
  module.events = [
    { name: 'Work', title: 'First', startDate: 7 * hour, endDate: 9 * hour, styleName: '' },
    { name: 'Work', title: 'Overlap', startDate: 8.5 * hour, endDate: 10.5 * hour, styleName: '' },
    { name: 'Work', title: 'Outside', startDate: 11 * hour, endDate: 12 * hour, styleName: '' },
  ]
  const parent = createElement('div')

  module.makeEvents('Work', parent)

  assert.equal(parent.children.length, 2)
  assert.equal(parent.children[0].children[0].style.left, '0%')
  assert.equal(parent.children[0].children[0].style.width, '50%')
  assert.equal(parent.children[1].children[0].style.left, '25%')
  assert.equal(parent.children[1].children[0].style.width, '75%')
})
