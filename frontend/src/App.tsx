import { useEffect, useMemo, useState } from 'react'
import './App.css'

type MetricKey = 'temperature' | 'humidity' | 'pressure' | 'light' | 'airQuality'

type MetricDefinition = {
  key: MetricKey
  label: string
  shortLabel: string
  unit: string
  endpoint: string
  color: string
  telemetryKeys: string[]
  min?: number
  max?: number
}

type TelemetryRecord = Record<string, unknown>

type HistoryMap = Record<MetricKey, number[]>

type LatestMap = Record<MetricKey, number | null>

const metrics: MetricDefinition[] = [
  {
    key: 'temperature',
    label: 'Temperature',
    shortLabel: 'Temp',
    unit: '°C',
    endpoint: '/api/t',
    color: '#ff7a59',
    telemetryKeys: ['temperature', 'temp', 't'],
    min: 0,
    max: 50,
  },
  {
    key: 'humidity',
    label: 'Humidity',
    shortLabel: 'Humidity',
    unit: '%',
    endpoint: '/api/h',
    color: '#35c0ff',
    telemetryKeys: ['humidity', 'humi', 'hum', 'h'],
    min: 0,
    max: 100,
  },
  {
    key: 'pressure',
    label: 'Pressure',
    shortLabel: 'Pressure',
    unit: 'hPa',
    endpoint: '/api/p',
    color: '#7c9cff',
    telemetryKeys: ['pressure', 'pres', 'p'],
    min: 900,
    max: 1100,
  },
  {
    key: 'light',
    label: 'Light',
    shortLabel: 'Light',
    unit: 'lx',
    endpoint: '/api/l',
    color: '#ffd166',
    telemetryKeys: ['light', 'lux', 'illuminance', 'l'],
    min: 0,
    max: 2000,
  },
  {
    key: 'airQuality',
    label: 'Air quality',
    shortLabel: 'AQI',
    unit: 'AQI',
    endpoint: '/api/aq',
    color: '#8ce99a',
    telemetryKeys: ['airQuality', 'air_quality', 'aq', 'aqi'],
    min: 0,
    max: 500,
  },
]

const historyLimit = 36
const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''

const initialLatest = metrics.reduce((accumulator, metric) => {
  accumulator[metric.key] = null
  return accumulator
}, {} as LatestMap)

const initialHistory = metrics.reduce((accumulator, metric) => {
  accumulator[metric.key] = []
  return accumulator
}, {} as HistoryMap)

function createApiUrl(path: string) {
  if (!apiBase) {
    return path
  }

  return `${apiBase.replace(/\/$/, '')}${path}`
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/)
    if (!normalized) {
      return null
    }

    const parsed = Number.parseFloat(normalized[0])
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function readValueFromTelemetry(payload: unknown, metric: MetricDefinition): number | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = payload as TelemetryRecord
  for (const key of metric.telemetryKeys) {
    const candidate = parseNumber(record[key])
    if (candidate !== null) {
      return candidate
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const nested = readValueFromTelemetry(value, metric)
      if (nested !== null) {
        return nested
      }
    }
  }

  return null
}

async function readTextNumber(path: string) {
  const response = await fetch(createApiUrl(path), { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`)
  }

  const text = await response.text()
  const parsed = parseNumber(text)
  if (parsed === null) {
    throw new Error(`Invalid numeric response for ${path}`)
  }

  return parsed
}

async function readTelemetryPayload() {
  const response = await fetch(createApiUrl('/api/telemetry'), { cache: 'no-store' })
  if (!response.ok) {
    return null
  }

  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

function formatValue(value: number | null, unit: string) {
  if (value === null) {
    return '—'
  }

  const decimals = Number.isInteger(value) ? 0 : 1
  return `${value.toFixed(decimals)} ${unit}`
}

function formatDelta(value: number | null, previous: number | null, unit: string) {
  if (value === null || previous === null) {
    return 'Collecting baseline'
  }

  const delta = value - previous
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} ${unit}`
}

function buildPolyline(
  values: number[],
  width: number,
  height: number,
  metric: MetricDefinition,
  bounds?: { lower: number; upper: number },
) {
  if (values.length === 0) {
    return ''
  }

  const lower = bounds?.lower ?? metric.min ?? Math.min(...values)
  const upper = bounds?.upper ?? metric.max ?? Math.max(...values)
  const spread = upper - lower || 1
  const stepX = values.length === 1 ? 0 : width / (values.length - 1)

  return values
    .map((value, index) => {
      const x = stepX * index
      const normalized = (value - lower) / spread
      const y = height - normalized * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  metric: MetricDefinition,
  bounds?: { lower: number; upper: number },
) {
  if (values.length === 0) {
    return ''
  }

  const lower = bounds?.lower ?? metric.min ?? Math.min(...values)
  const upper = bounds?.upper ?? metric.max ?? Math.max(...values)
  const spread = upper - lower || 1
  const stepX = values.length === 1 ? 0 : width / (values.length - 1)
  const coordinates = values.map((value, index) => {
    const x = stepX * index
    const normalized = (value - lower) / spread
    const y = height - normalized * height
    return { x, y }
  })

  const start = coordinates[0]
  const end = coordinates[coordinates.length - 1]

  return [
    `M ${start.x.toFixed(2)} ${height.toFixed(2)}`,
    `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    ...coordinates.slice(1).map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    `L ${end.x.toFixed(2)} ${height.toFixed(2)}`,
    'Z',
  ].join(' ')
}

function LineChart({ metric, values }: { metric: MetricDefinition; values: number[] }) {
  const width = 220
  const height = 48
  const polyline = buildPolyline(values, width, height, metric)
  const areaPath = buildAreaPath(values, width, height, metric)
  const gradientId = `gradient-${metric.key}`
  const shadowId = `shadow-${metric.key}`

  const minVal = values.length ? Math.min(...values) : 0
  const maxVal = values.length ? Math.max(...values) : 1
  let lower = metric.min ?? minVal
  let upper = metric.max ?? maxVal
  if (lower === upper) {
    lower = lower - 0.5
    upper = upper + 0.5
  } else {
    if (metric.min === undefined) {
      const pad = (upper - lower) * 0.06
      lower = lower - pad
    }
    if (metric.max === undefined) {
      const pad = (upper - lower) * 0.06
      upper = upper + pad
    }
  }

  const mid = lower + (upper - lower) / 2
  const yTicks = [upper, mid, lower]

  const yPos = (v: number) => {
    const spread = upper - lower || 1
    const normalized = (v - lower) / spread
    return height - normalized * height
  }

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${metric.label} chart`}> 
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={metric.color} stopOpacity="0.36" />
          <stop offset="100%" stopColor={metric.color} stopOpacity="0.06" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={metric.color} floodOpacity="0.12" />
        </filter>
      </defs>

      <g className="sparkline-axes" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1}>
        <line x1={0} y1={0} x2={0} y2={height} />
        <line x1={0} y1={height} x2={width} y2={height} />
      </g>

      <g className="sparkline-yticks" fill="var(--text)" fontSize={9} fontFamily="var(--mono)">
        {yTicks.map((val, idx) => {
          const absSpread = Math.abs(upper - lower)
          const decimals = absSpread < 10 ? 1 : 0
          const label = Number.isInteger(val) || decimals === 0 ? Math.round(val) : val.toFixed(1)
          return (
            <text key={idx} x={4} y={Math.min(Math.max(yPos(val), 10), height - 2)}>
              {label}
            </text>
          )
        })}
      </g>

      <g className="sparkline-grid">
        {yTicks.map((val, idx) => (
          <line key={idx} x1={0} y1={yPos(val)} x2={width} y2={yPos(val)} stroke="rgba(255,255,255,0.04)" />
        ))}
      </g>

      {values.length > 1 ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
      {values.length > 0 ? (
        <polyline
          points={polyline}
          fill="none"
          stroke={metric.color}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${shadowId})`}
        />
      ) : null}
    </svg>
  )
}

function App() {
  const [latest, setLatest] = useState<LatestMap>(initialLatest)
  const [history, setHistory] = useState<HistoryMap>(initialHistory)
  const [deviceIp, setDeviceIp] = useState('—')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    const poll = async () => {
      try {
        const [telemetryResponse, ipResponse] = await Promise.allSettled([
          readTelemetryPayload(),
          fetch(createApiUrl('/ip'), {
            cache: 'no-store',
            signal: controller.signal,
          }),
        ])

        const telemetry =
          telemetryResponse.status === 'fulfilled' ? telemetryResponse.value : null

        const ip =
          ipResponse.status === 'fulfilled' && ipResponse.value.ok
            ? await ipResponse.value.text()
            : null

        const resolvedLatest = await Promise.all(
          metrics.map(async (metric) => {
            const fromTelemetry = telemetry ? readValueFromTelemetry(telemetry, metric) : null
            if (fromTelemetry !== null) {
              return [metric.key, fromTelemetry] as const
            }

            try {
              const fallback = await readTextNumber(metric.endpoint)
              return [metric.key, fallback] as const
            } catch {
              return [metric.key, null] as const
            }
          }),
        )

        if (!isActive) {
          return
        }

        const nextLatest = resolvedLatest.reduce((accumulator, [key, value]) => {
          accumulator[key] = value
          return accumulator
        }, { ...initialLatest } as LatestMap)

        setLatest(nextLatest)
        setHistory((currentHistory) => {
          const nextHistory = { ...currentHistory }

          for (const metric of metrics) {
            const value = nextLatest[metric.key]
            if (value === null) {
              continue
            }

            nextHistory[metric.key] = [...nextHistory[metric.key], value].slice(-historyLimit)
          }

          return nextHistory
        })
        setDeviceIp(ip?.trim() || '—')
        setLastUpdated(new Date())
        setStatus('online')
        setErrorMessage(null)
      } catch (error) {
        if (!isActive) {
          return
        }

        setStatus('offline')
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load telemetry')
      }
    }

    void poll()
    const intervalId = window.setInterval(poll, 1000)

    return () => {
      isActive = false
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [])

  const connectivityLabel =
    status === 'online' ? 'Live' : status === 'offline' ? 'Offline' : 'Connecting'

  const lastRefresh = useMemo(() => {
    if (!lastUpdated) {
      return 'Waiting for first sample'
    }

    return lastUpdated.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }, [lastUpdated])

  return (
    <main className="dashboard-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <section className="hero-panel">
        <div className="hero-copy">
          <span className={`status-pill ${status}`}>{connectivityLabel}</span>
          <h1>ESP32 Dashboard</h1>
          <p>Короткий обзор живых параметров устройства.</p>
        </div>

        { <div className="hero-stats">
          <article className="stat-card">
            <span className="stat-label">Device IP</span>
            <strong>{deviceIp}</strong>
            <small>Endpoint <code>/ip</code></small>
          </article>
          <article className="stat-card">
            <span className="stat-label">Last refresh</span>
            <strong>{lastRefresh}</strong>
            <small>Auto update every 1 seconds</small>
          </article>
        </div> }
      </section>

      {errorMessage ? <section className="error-banner">{errorMessage}</section> : null}

      <section className="metrics-grid" aria-label="Telemetry charts">
        {metrics.map((metric) => {
          const values = history[metric.key]
          const current = latest[metric.key]
          const previous = values.length > 1 ? values[values.length - 2] : null
          const trendClass =
            current === null || previous === null ? 'trend-neutral' : current > previous ? 'trend-up' : current < previous ? 'trend-down' : 'trend-neutral'

          return (
            <article className="metric-card" key={metric.key}>
              <header className="metric-header">
                <div>
                  <span className="metric-label">{metric.shortLabel}</span>
                  <h2>{metric.label}</h2>
                </div>
                <div className={`metric-value-wrap ${trendClass}`}>
                  <strong>{formatValue(current, metric.unit)}</strong>
                  <span>{formatDelta(current, previous, metric.unit)}</span>
                </div>
              </header>

              <div className="chart-wrap">
                <LineChart metric={metric} values={values} />
              </div>

              <footer className="metric-footer">
                <span>
                  Range {metric.min ?? 'auto'} - {metric.max ?? 'auto'}
                </span>
                <span>{values.length > 0 ? `${values.length} samples` : 'Waiting for data'}</span>
              </footer>
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default App
