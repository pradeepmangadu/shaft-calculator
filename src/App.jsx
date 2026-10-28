import { useState } from 'react'
import './App.css'

const STORAGE_KEY = 'shaft-calculator-inputs'
const MAX_FLOORS = 200
const EMPTY_STATE = {
  siteName: '',
  numberOfFloors: '',
  doorOpening: '',
  dbg: '',
  description: '',
  pitHeight: '',
  floorHeights: [],
  rightLeftTotalWidth: '',
  backTotalDepth: '',
  standardHeight: '2300',
  standardHeightDraft: '2300',
  rightLeftDeduction: '300',
  rightLeftDeductionDraft: '300',
  backDeduction: '200',
  backDeductionDraft: '200',
}
const INTEGER_PATTERN = /^\d+$/

function isNonNegativeInteger(value) {
  return typeof value === 'string' && INTEGER_PATTERN.test(value) && Number.isSafeInteger(Number(value))
}

function isSavedState(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value.siteName === undefined || typeof value.siteName === 'string') &&
    (value.numberOfFloors === undefined || typeof value.numberOfFloors === 'string') &&
    (value.doorOpening === undefined || typeof value.doorOpening === 'string') &&
    (value.dbg === undefined || typeof value.dbg === 'string') &&
    (value.description === undefined || typeof value.description === 'string') &&
    typeof value.pitHeight === 'string' &&
    Array.isArray(value.floorHeights) &&
    value.floorHeights.every((height) => typeof height === 'string') &&
    typeof value.rightLeftTotalWidth === 'string' &&
    typeof value.backTotalDepth === 'string'
  )
}

function readSavedState() {
  try {
    const savedState = window.localStorage.getItem(STORAGE_KEY)
    if (!savedState) return EMPTY_STATE

    const parsedState = JSON.parse(savedState)
    if (!isSavedState(parsedState)) {
      throw new Error('Saved shaft calculator inputs have an invalid format.')
    }

    const restoredState = { ...EMPTY_STATE, ...parsedState }
    for (const [valueKey, draftKey] of [
      ['standardHeight', 'standardHeightDraft'],
      ['rightLeftDeduction', 'rightLeftDeductionDraft'],
      ['backDeduction', 'backDeductionDraft'],
    ]) {
      if (restoredState[valueKey] === '') restoredState[valueKey] = EMPTY_STATE[valueKey]
      if (restoredState[draftKey] === '') restoredState[draftKey] = restoredState[valueKey]
    }
    return restoredState
  } catch (error) {
    console.error('Unable to load saved shaft calculator inputs.', error)
    return EMPTY_STATE
  }
}

function formatValue(value) {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('en-US').format(value)
}

function sumInputs(values) {
  if (!values.every(isNonNegativeInteger)) return null
  let total = 0
  for (const value of values) {
    total += Number(value)
    if (!Number.isSafeInteger(total)) return null
  }
  return total
}

function getFloorHeightLabels(floorCount) {
  if (floorCount === 0) return ['Ground to Header']

  const ordinal = (floor) => {
    const lastTwoDigits = floor % 100
    const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' }[floor % 10] ?? 'th')
    return `${floor}${suffix}`
  }

  return [
    'Ground to 1st floor',
    ...Array.from({ length: floorCount - 1 }, (_, index) =>
      `${ordinal(index + 1)} to ${ordinal(index + 2)} floor`,
    ),
    `${ordinal(floorCount)} to Header`,
  ]
}

function NumberInput({ id, label, value, onChange, hint, unit = 'mm', prefix = '', max }) {
  const numericValue = Number(value)
  const hasInvalidValue = value !== '' && (
    !isNonNegativeInteger(value) || (max !== undefined && numericValue > max)
  )
  const errorId = `${id}-error`

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`number-input-wrap${hasInvalidValue ? ' has-error' : ''}`}>
        {prefix && <span className="input-prefix" aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min="0"
          max={max}
          step="1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={hasInvalidValue}
          aria-describedby={hasInvalidValue ? errorId : undefined}
          placeholder={prefix ? '0' : 'Enter a whole number'}
        />
        {unit && <span className="input-unit" aria-hidden="true">{unit}</span>}
      </div>
      {hasInvalidValue ? (
        <span className="field-error" id={errorId}>
          {max !== undefined && numericValue > max
            ? `Enter a number no greater than ${max}.`
            : 'Enter a whole number (0 or greater).'}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  )
}

function TextInput({ id, label, value, onChange, placeholder }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="number-input-wrap">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

function TextArea({ id, label, value, onChange, placeholder }) {
  return (
    <div className="field description-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows="3"
      />
    </div>
  )
}

function ConfigField({ id, label, value, draft, onChange, onFix, positiveOnly = false }) {
  const invalid = draft !== '' && (
    !isNonNegativeInteger(draft) || (positiveOnly && Number(draft) === 0)
  )
  const [submittedEmpty, setSubmittedEmpty] = useState(false)
  const errorId = `${id}-error`
  const errorMessage = submittedEmpty && draft === ''
    ? 'Enter a value before fixing it.'
    : positiveOnly && draft !== '' && isNonNegativeInteger(draft) && Number(draft) === 0
      ? 'This value must be greater than zero.'
      : 'Enter a whole number (0 or greater).'

  function handleFix() {
    if (draft === '' || invalid) {
      setSubmittedEmpty(true)
      return
    }
    onFix()
    setSubmittedEmpty(false)
  }

  return (
    <div className="config-field">
      <div className="config-label-row">
        <label htmlFor={id}>{label}</label>
        {value !== '' && <span className="fixed-tag">Fixed: {formatValue(Number(value))} mm</span>}
      </div>
      <div className="config-control-row">
        <div className={`number-input-wrap${invalid || (submittedEmpty && draft === '') ? ' has-error' : ''}`}>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={positiveOnly ? '1' : '0'}
            step="1"
            value={draft}
            onChange={(event) => {
              onChange(event.target.value)
              setSubmittedEmpty(false)
            }}
            aria-invalid={invalid || (submittedEmpty && draft === '')}
            aria-describedby={invalid || (submittedEmpty && draft === '') ? errorId : undefined}
            placeholder="Enter a whole number"
          />
          <span className="input-unit" aria-hidden="true">mm</span>
        </div>
        <button className="fix-button" type="button" onClick={handleFix}>Fix value</button>
      </div>
      {invalid || (submittedEmpty && draft === '') ? (
        <span className="field-error" id={errorId}>{errorMessage}</span>
      ) : (
        <span className="field-hint">
          {value === '' ? 'Fix this value to use it in the calculations.' : 'Used in the calculations below.'}
        </span>
      )}
    </div>
  )
}

function ResultValue({ value }) {
  return <span className="result-value">{value === null ? '—' : formatValue(value)}</span>
}

function ResultRow({ label, value, emphasized = false }) {
  return (
    <div className={`result-row${emphasized ? ' emphasized' : ''}`}>
      <span>{label}</span>
      <ResultValue value={value} />
    </div>
  )
}

function SectionHeading({ number, title, description }) {
  return (
    <div className="section-heading">
      <span className="section-number">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}

function SectionCard({ number, title, description, children }) {
  return (
    <article className="panel section-card">
      <SectionHeading number={number} title={title} description={description} />
      {children}
    </article>
  )
}

function App() {
  const [state, setState] = useState(readSavedState)
  const [saveMessage, setSaveMessage] = useState('Your values are saved in this browser.')
  const [exportMessage, setExportMessage] = useState('')

  function updateState(name, value) {
    const nextState = { ...state, [name]: value }
    setState(nextState)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
      setSaveMessage('Changes saved on this device')
    } catch (error) {
      console.error('Unable to save shaft calculator inputs.', error)
      setSaveMessage('Could not save your inputs. Check your browser storage settings.')
    }
  }

  function updateFloorHeight(index, value) {
    const nextFloorHeights = [...state.floorHeights]
    nextFloorHeights[index] = value
    updateState('floorHeights', nextFloorHeights)
  }

  function fixValue(draftKey, valueKey) {
    updateState(valueKey, state[draftKey])
  }

  const floorCountIsValid =
    state.numberOfFloors !== '' &&
    isNonNegativeInteger(state.numberOfFloors) &&
    Number(state.numberOfFloors) <= MAX_FLOORS
  const floorCount = floorCountIsValid ? Number(state.numberOfFloors) : null
  const floorHeightLabels = floorCount === null ? [] : getFloorHeightLabels(floorCount)
  const activeFloorHeights = state.floorHeights.slice(0, floorHeightLabels.length)
  const totalShaftHeight = state.pitHeight !== '' &&
    isNonNegativeInteger(state.pitHeight) &&
    floorCount !== null
    ? sumInputs([state.pitHeight, ...activeFloorHeights])
    : null
  const standardHeightIsValid =
    state.standardHeight !== '' &&
    isNonNegativeInteger(state.standardHeight) &&
    Number(state.standardHeight) > 0
  const standardShaftCount = totalShaftHeight !== null && standardHeightIsValid
    ? Math.floor(totalShaftHeight / Number(state.standardHeight))
    : null
  const customShaftHeight = totalShaftHeight !== null && standardHeightIsValid
    ? totalShaftHeight % Number(state.standardHeight)
    : null
  const customShaftCount = totalShaftHeight !== null && standardHeightIsValid ? 1 : null
  const totalShaftCount =
    standardShaftCount === null || !Number.isSafeInteger(standardShaftCount + customShaftCount)
      ? null
      : standardShaftCount + customShaftCount
  const fourSideStandardShaftCount =
    standardShaftCount === null || !Number.isSafeInteger(standardShaftCount * 4)
      ? null
      : standardShaftCount * 4
  const fourSideCustomShaftCount =
    customShaftCount === null || !Number.isSafeInteger(customShaftCount * 4)
      ? null
      : customShaftCount * 4
  const fourSideTotalShaftCount =
    fourSideStandardShaftCount === null || fourSideCustomShaftCount === null
      ? null
      : fourSideStandardShaftCount + fourSideCustomShaftCount

  const rightLeftShaftSize =
    state.rightLeftTotalWidth !== '' &&
    isNonNegativeInteger(state.rightLeftTotalWidth) &&
    state.rightLeftDeduction !== '' &&
    isNonNegativeInteger(state.rightLeftDeduction)
      ? Number(state.rightLeftTotalWidth) - Number(state.rightLeftDeduction)
      : null
  const rightLeftShaftsPerSide =
    totalShaftCount === null || !Number.isSafeInteger(totalShaftCount * 2)
      ? null
      : totalShaftCount * 2
  const rightLeftDoubleSideCount =
    rightLeftShaftsPerSide === null || !Number.isSafeInteger(rightLeftShaftsPerSide * 2)
      ? null
      : rightLeftShaftsPerSide * 2

  const backShaftSize =
    state.backTotalDepth !== '' &&
    isNonNegativeInteger(state.backTotalDepth) &&
    state.backDeduction !== '' &&
    isNonNegativeInteger(state.backDeduction)
      ? Number(state.backTotalDepth) - Number(state.backDeduction)
      : null
  const backSideCountIsValid =
    state.numberOfFloors !== '' &&
    isNonNegativeInteger(state.numberOfFloors) &&
    Number(state.numberOfFloors) <= MAX_FLOORS
  const backShaftsPerSide =
    totalShaftCount === null ||
    !backSideCountIsValid ||
    !Number.isSafeInteger(totalShaftCount * 2 + Number(state.numberOfFloors) + 1)
      ? null
      : totalShaftCount * 2 + Number(state.numberOfFloors) + 1

  async function exportPdf() {
    let jsPDF
    try {
      const pdfModule = await import('jspdf')
      jsPDF = pdfModule.jsPDF
    } catch (error) {
      console.error('Unable to load the PDF export module.', error)
      setExportMessage('PDF export could not be loaded. Please try again.')
      return
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 17
    const contentWidth = pageWidth - margin * 2
    let y = margin
    let pageNumber = 1

    const addPageNumber = () => {
      pdf.setFontSize(8)
      pdf.setTextColor(130, 139, 155)
      pdf.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
    }

    const ensureSpace = (height) => {
      if (y + height > pageHeight - margin - 10) {
        addPageNumber()
        pdf.addPage()
        pageNumber += 1
        y = margin
      }
    }

    const addSectionTitle = (title, subtitle = '') => {
      ensureSpace(subtitle ? 15 : 10)
      pdf.setFillColor(240, 241, 255)
      pdf.roundedRect(margin, y, contentWidth, subtitle ? 13 : 10, 2, 2, 'F')
      pdf.setTextColor(70, 76, 158)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.text(title, margin + 4, y + (subtitle ? 5 : 6.5))
      if (subtitle) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(100, 107, 124)
        pdf.text(subtitle, margin + 4, y + 10)
      }
      y += (subtitle ? 13 : 10) + 3
    }

    const addRows = (rows, labelWidth = contentWidth * 0.68) => {
      const lineHeight = 5
      rows.forEach(([label, value], index) => {
        const labelLines = pdf.splitTextToSize(label, labelWidth - 8)
        const valueLines = pdf.splitTextToSize(String(value ?? '—'), contentWidth - labelWidth - 8)
        const rowHeight = Math.max(9, Math.max(labelLines.length, valueLines.length) * lineHeight + 4)
        ensureSpace(rowHeight)
        pdf.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 249, index % 2 === 0 ? 255 : 252)
        pdf.rect(margin, y, contentWidth, rowHeight, 'F')
        pdf.setDrawColor(231, 233, 240)
        pdf.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(82, 89, 106)
        pdf.text(labelLines, margin + 4, y + 5.7)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(37, 42, 56)
        pdf.text(valueLines, margin + contentWidth - 4, y + 5.7, { align: 'right' })
        y += rowHeight
      })
      y += 4
    }

    const addParagraph = (text) => {
      const lines = pdf.splitTextToSize(text || '—', contentWidth - 8)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(82, 89, 106)
      lines.forEach((line) => {
        ensureSpace(5)
        pdf.text(line, margin + 4, y + 4)
        y += 5
      })
      y += 4
    }

    pdf.setFillColor(83, 89, 189)
    pdf.rect(0, 0, pageWidth, 35, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(20)
    pdf.setTextColor(255, 255, 255)
    pdf.text('Shaft Calculation Report', margin, 16)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(`Generated ${new Date().toLocaleDateString()}`, margin, 24)
    y = 44

    addSectionTitle('Project Details')
    const projectRows = [
      ['Site Name', state.siteName || '—'],
      ['Number of Floor', state.numberOfFloors === '' ? '—' : `G+${state.numberOfFloors}`],
      ['Door Opening', state.doorOpening || '—'],
      ['DBG', state.dbg === '' ? '—' : `${formatValue(Number(state.dbg))} mm`],
    ]
    addRows(projectRows)
    addSectionTitle('Description')
    addParagraph(state.description)

    addSectionTitle('01 · Vertical Shaft', 'Single side')
    const verticalRows = [
      ['Pit Height', state.pitHeight === '' ? '—' : `${formatValue(Number(state.pitHeight))} mm`],
      ...floorHeightLabels.map((label, index) => [
        label,
        state.floorHeights[index] === undefined || state.floorHeights[index] === ''
          ? '—'
          : `${formatValue(Number(state.floorHeights[index]))} mm`,
      ]),
    ]
    addRows(verticalRows)
    addRows([
      ['Total Shaft Height', totalShaftHeight === null ? '—' : `${formatValue(totalShaftHeight)} mm`],
      ['Shaft Standard Height', standardHeightIsValid ? `${formatValue(Number(state.standardHeight))} mm` : '—'],
      ['Number of Standard shaft needed', formatValue(standardShaftCount)],
      ['Custom Shaft Height', customShaftHeight === null ? '—' : `${formatValue(customShaftHeight)} mm`],
      ['Custom Shaft Qty', formatValue(customShaftCount)],
      ['Total Shaft Qty', formatValue(totalShaftCount)],
    ])
    addSectionTitle('Results for Four Sides')
    addRows([
      [`Number of Standard shaft (${standardHeightIsValid ? `${formatValue(Number(state.standardHeight))} mm` : '—'}) needed`, formatValue(fourSideStandardShaftCount)],
      [`Number of Custom shaft (${customShaftHeight === null ? '—' : `${formatValue(customShaftHeight)} mm`}) needed`, formatValue(fourSideCustomShaftCount)],
      ['Total Shaft Qty', formatValue(fourSideTotalShaftCount)],
    ])

    addSectionTitle('02 · Horizontal Shaft', 'Right & left side')
    addRows([
      ['Total Width', state.rightLeftTotalWidth === '' ? '—' : `${formatValue(Number(state.rightLeftTotalWidth))} mm`],
      ['Shaft Size', rightLeftShaftSize === null ? '—' : `${formatValue(rightLeftShaftSize)} mm`],
      ['Number of shaft need for one side', formatValue(rightLeftShaftsPerSide)],
      ['For Double Side', formatValue(rightLeftDoubleSideCount)],
    ])

    addSectionTitle('03 · Horizontal Shaft', 'Front & back side')
    addRows([
      ['Total Depth', state.backTotalDepth === '' ? '—' : `${formatValue(Number(state.backTotalDepth))} mm`],
      ['Shaft Size', backShaftSize === null ? '—' : `${formatValue(backShaftSize)} mm`],
      ['Number of shaft need for one side', formatValue(backShaftsPerSide)],
      ['For Back Side', formatValue(backShaftsPerSide)],
    ])

    addPageNumber()
    const siteFilename = state.siteName.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
    try {
      pdf.save(`${siteFilename || 'shaft-calculation'}-report.pdf`)
      setExportMessage('PDF report downloaded.')
    } catch (error) {
      console.error('Unable to download the shaft calculation report.', error)
      setExportMessage('PDF report could not be downloaded. Please try again.')
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="ShaftCalc home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M8 26V6h16v20M12 10h8M12 15h8M12 20h8M5 26h22" />
            </svg>
          </span>
          <span>Shaft<span className="brand-accent">Calc</span></span>
        </a>
        <div className="save-indicator" role="status">
          <span className="save-dot" />
          {saveMessage}
        </div>
        <div className="export-control">
          <button className="export-button" type="button" onClick={exportPdf}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 13v3h12v-3" />
            </svg>
            Export PDF
          </button>
          {exportMessage && <span className="export-message" role="status">{exportMessage}</span>}
        </div>
      </header>

      <section className="page-intro">
        <div>
          <span className="eyebrow">DIMENSION PLANNER</span>
          <h1>Shaft calculator</h1>
          <p>Enter your measurements and configure the fixed values for each shaft section.</p>
        </div>
        <div className="intro-badge" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M12 40V8h24v32M18 15h12M18 22h12M18 29h12M8 40h32" />
            <path d="M24 8V3M20 3h8" />
          </svg>
        </div>
      </section>

      <div className="sections-workspace">
        <section className="panel project-details" aria-label="Project details">
          <div className="project-fields">
            <TextInput
              id="site-name"
              label="Site Name"
              value={state.siteName}
              onChange={(value) => updateState('siteName', value)}
              placeholder="Enter site name"
            />
            <NumberInput
              id="number-of-floors"
              label="Number of Floor"
              value={state.numberOfFloors}
              onChange={(value) => updateState('numberOfFloors', value)}
              hint={`Used to create floor heights (up to ${MAX_FLOORS} floors).`}
              unit=""
              prefix="G+"
              max={MAX_FLOORS}
            />
            <TextInput
              id="door-opening"
              label="Door Opening"
              value={state.doorOpening}
              onChange={(value) => updateState('doorOpening', value)}
              placeholder="Enter door opening"
            />
            <NumberInput
              id="dbg"
              label="DBG"
              value={state.dbg}
              onChange={(value) => updateState('dbg', value)}
              hint="Measured in millimeters"
            />
          </div>
          <TextArea
            id="description"
            label="Description"
            value={state.description}
            onChange={(value) => updateState('description', value)}
            placeholder="Add project notes or requirements"
          />
        </section>

        <SectionCard number="01" title="Vertical shaft" description="Single side">
          <div className="section-content">
            <div className="section-inputs">
              <span className="subsection-label">MEASUREMENTS</span>
              <NumberInput
                id="pit-height"
                label="Pit Height"
                value={state.pitHeight}
                onChange={(value) => updateState('pitHeight', value)}
                hint="Measured in millimeters"
              />
              {floorHeightLabels.length > 0 && (
                <div className="dynamic-fields">
                  <div className="dynamic-label-row">
                    <span className="field-label">Floor Heights</span>
                    <span className="field-hint">{floorHeightLabels.length} required</span>
                  </div>
                  {floorHeightLabels.map((label, index) => (
                  <div className="floor-input-row" key={`floor-${index + 1}`}>
                    <NumberInput
                      id={`floor-height-${index + 1}`}
                      label={label}
                      value={state.floorHeights[index] ?? ''}
                      onChange={(value) => updateFloorHeight(index, value)}
                    />
                  </div>
                  ))}
                </div>
              )}
              {state.numberOfFloors !== '' && !floorCountIsValid && (
                <p className="field-error floor-count-error">
                  Enter a whole number between 0 and {MAX_FLOORS}.
                </p>
              )}
            </div>

            <div className="section-config">
              <span className="subsection-label">SECTION CONFIGURATION</span>
              <ConfigField
                id="standard-height"
                label="Shaft Standard Height"
                value={state.standardHeight}
                draft={state.standardHeightDraft}
                onChange={(value) => updateState('standardHeightDraft', value)}
                onFix={() => fixValue('standardHeightDraft', 'standardHeight')}
                positiveOnly
              />
            </div>

            <div className="section-results">
              <div className="results-heading">
                <div>
                  <span className="subsection-label">CALCULATED VALUES</span>
                  <h3>Results for Single Side</h3>
                </div>
                <span className="readonly-badge">Read-only</span>
              </div>
              <div className="result-list">
                <ResultRow label="Total Shaft Height" value={totalShaftHeight} />
                <ResultRow label="Shaft Standard Height" value={standardHeightIsValid ? Number(state.standardHeight) : null} />
                <ResultRow label="Number of Standard shaft needed" value={standardShaftCount} />
                <ResultRow label="Custom Shaft Height" value={customShaftHeight} />
                <ResultRow label="Custom Shaft Qty" value={customShaftCount} />
                <ResultRow label="Total Shaft Qty" value={totalShaftCount} emphasized />
              </div>
              <div className="four-side-results">
                <div className="results-heading">
                  <h3>Results for Four Sides</h3>
                  <span className="readonly-badge">Read-only</span>
                </div>
                <div className="result-list">
                  <ResultRow
                    label={`Number of Standard shaft (${standardHeightIsValid ? `${formatValue(Number(state.standardHeight))} mm` : '—'}) needed`}
                    value={fourSideStandardShaftCount}
                  />
                  <ResultRow
                    label={`Number of Custom shaft (${customShaftHeight === null ? '—' : `${formatValue(customShaftHeight)} mm`}) needed`}
                    value={fourSideCustomShaftCount}
                  />
                  <ResultRow label="Total Shaft Qty" value={fourSideTotalShaftCount} emphasized />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard number="02" title="Horizontal shaft" description="Right & left side">
          <div className="section-content horizontal-content">
            <div className="section-inputs">
              <span className="subsection-label">MEASUREMENTS</span>
              <NumberInput
                id="right-left-total-width"
                label="Total Width"
                value={state.rightLeftTotalWidth}
                onChange={(value) => updateState('rightLeftTotalWidth', value)}
                hint="Measured in millimeters"
              />
            </div>
            <div className="section-config">
              <span className="subsection-label">SECTION CONFIGURATION</span>
              <ConfigField
                id="right-left-deduction"
                label="Shaft Size Deduction"
                value={state.rightLeftDeduction}
                draft={state.rightLeftDeductionDraft}
                onChange={(value) => updateState('rightLeftDeductionDraft', value)}
                onFix={() => fixValue('rightLeftDeductionDraft', 'rightLeftDeduction')}
              />
            </div>
            <div className="section-results">
              <div className="results-heading">
                <div>
                  <span className="subsection-label">CALCULATED VALUES</span>
                  <h3>Results</h3>
                </div>
                <span className="readonly-badge">Read-only</span>
              </div>
              <div className="result-list">
                <ResultRow
                  label="Total Width"
                  value={state.rightLeftTotalWidth !== '' && isNonNegativeInteger(state.rightLeftTotalWidth)
                    ? Number(state.rightLeftTotalWidth)
                    : null}
                />
                <ResultRow label="Shaft Size" value={rightLeftShaftSize} />
                <ResultRow label="Number of shaft need for one side" value={rightLeftShaftsPerSide} />
                <ResultRow label="For Double Side" value={rightLeftDoubleSideCount} emphasized />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard number="03" title="Horizontal shaft" description="Front & Back side">
          <div className="section-content horizontal-content">
            <div className="section-inputs">
              <span className="subsection-label">MEASUREMENTS</span>
              <NumberInput
                id="back-total-depth"
                label="Total Depth"
                value={state.backTotalDepth}
                onChange={(value) => updateState('backTotalDepth', value)}
                hint="Measured in millimeters"
              />
            </div>
            <div className="section-config">
              <span className="subsection-label">SECTION CONFIGURATION</span>
              <ConfigField
                id="back-deduction"
                label="Shaft Size Deduction"
                value={state.backDeduction}
                draft={state.backDeductionDraft}
                onChange={(value) => updateState('backDeductionDraft', value)}
                onFix={() => fixValue('backDeductionDraft', 'backDeduction')}
              />
            </div>
            <div className="section-results">
              <div className="results-heading">
                <div>
                  <span className="subsection-label">CALCULATED VALUES</span>
                  <h3>Results</h3>
                </div>
                <span className="readonly-badge">Read-only</span>
              </div>
              <div className="result-list">
                <ResultRow
                  label="Total Depth"
                  value={state.backTotalDepth !== '' && isNonNegativeInteger(state.backTotalDepth)
                    ? Number(state.backTotalDepth)
                    : null}
                />
                <ResultRow label="Shaft Size" value={backShaftSize} />
                <ResultRow label="Number of shaft need for one side" value={backShaftsPerSide} />
                <ResultRow label="For Back Side" value={backShaftsPerSide} emphasized />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <footer className="page-footer">
        <span>ShaftCalc</span>
        <span>Measurements and fixed values are stored locally in this browser.</span>
      </footer>
    </main>
  )
}

export default App
