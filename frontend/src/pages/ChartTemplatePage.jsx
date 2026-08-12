import { chartViews } from '../dummy/chartViews.js'

function ChartTemplatePage() {
  return (
    <section className="chart-page" aria-label="Chart">
      <div className="chart-grid">
        {chartViews.length > 0 ? (
          chartViews.map(({ title, eyebrow, Component, wide }) => (
            <article
              className={`dashboard-panel chart-card${wide ? ' chart-card--wide' : ''}`}
              key={title}
            >
              <div className="chart-card__header">
                <p className="dashboard-panel__eyebrow">{eyebrow}</p>
                <h1 className="dashboard-panel__title">{title}</h1>
              </div>

              <div className="chart-card__body">
                <Component />
              </div>
            </article>
          ))
        ) : (
          <article className="dashboard-panel chart-card chart-card--wide">
            <div className="users-table__empty">Belum ada data chart.</div>
          </article>
        )}
      </div>
    </section>
  )
}

export default ChartTemplatePage
