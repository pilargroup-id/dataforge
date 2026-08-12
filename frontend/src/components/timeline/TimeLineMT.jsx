import { DataTableStatus } from '../table/DataTable.jsx'

const TIMELINE_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
})

const TIMELINE_TIME_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Jakarta',
})

function getTimelineStatusVariant(status) {
  if (status === 'Created' || status === 'Waiting') {
    return 'pending'
  }

  if (status === 'In Progress' || status === 'Resolved') {
    return 'active'
  }

  if (status === 'Assigned' || status === 'Feedback') {
    return 'app'
  }

  return 'inactive'
}

function parseTimelineTimestamp(value) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

function formatTimelineDay(value) {
  const parsedDate = parseTimelineTimestamp(value)

  if (!parsedDate) {
    return 'Hari belum tersedia'
  }

  return TIMELINE_DATE_FORMATTER.format(parsedDate)
}

function formatTimelineTime(value) {
  const parsedDate = parseTimelineTimestamp(value)

  if (!parsedDate) {
    return 'Jam belum tersedia'
  }

  return `${TIMELINE_TIME_FORMATTER.format(parsedDate)} WIB`
}

export default function TimeLineMT({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="mtickets-timeline__empty">Belum ada riwayat status untuk ticket ini.</p>
  }

  return (
    <div className="mtickets-timeline" role="list" aria-label="Timeline status ticket">
      {items.map((item, index) => {
        const variant = getTimelineStatusVariant(item.status)
        const itemKey = item.id ?? `${item.status}-${item.timestamp ?? index}`

        return (
          <div key={itemKey} className="mtickets-timeline__item" role="listitem">
            <div className="mtickets-timeline__time">
              <p className="mtickets-timeline__day">{formatTimelineDay(item.timestamp)}</p>
              <p className="mtickets-timeline__hour">{formatTimelineTime(item.timestamp)}</p>
            </div>

            <div className="mtickets-timeline__rail" aria-hidden="true">
              <span
                className={`mtickets-timeline__connector${
                  index === 0 ? ' mtickets-timeline__connector--hidden' : ''
                }`}
              />
              <span className={`mtickets-timeline__dot mtickets-timeline__dot--${variant}`} />
              <span
                className={`mtickets-timeline__connector${
                  index === items.length - 1 ? ' mtickets-timeline__connector--hidden' : ''
                }`}
              />
            </div>

            <div className="mtickets-timeline__content">
              <DataTableStatus inline variant={variant}>
                {item.status ?? 'Status'}
              </DataTableStatus>
              {item.title ? <h4 className="mtickets-timeline__title">{item.title}</h4> : null}
              {item.detail ? (
                <p className="mtickets-timeline__description">{item.detail}</p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
