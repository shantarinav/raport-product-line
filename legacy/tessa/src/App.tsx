import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { downloadRecordsCsv } from './lib/exportCsv';
import { formatDate, formatInteger, formatNumber, formatPercent } from './lib/format';
import { parseCsvFile } from './lib/normalization';
import type { ImportResult, NormalizedRecord, QualitySummary } from './lib/types';

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const BRAND = {
  logoMark: assetPath('assets/brand/raport-logo-mark.png'),
  icons: {
    upload: assetPath('assets/brand/icons/icon-upload.png'),
    problem: assetPath('assets/brand/icons/icon-problem.png'),
    time: assetPath('assets/brand/icons/icon-time.png'),
    filter: assetPath('assets/brand/icons/icon-filter.png'),
    ranking: assetPath('assets/brand/icons/icon-ranking.png'),
    table: assetPath('assets/brand/icons/icon-table.png'),
    download: assetPath('assets/brand/icons/icon-download.png'),
  },
};

type LoadedFile = {
  fileName: string;
  rows: number;
  duplicateRows: number;
  loadedAt: Date;
};

type FocusMode = 'stuck' | 'riskToday' | 'allOpen';

type AgreementFilters = {
  focusMode: FocusMode;
  documentType: string;
  contractNumber: string;
  subject: string;
  responsible: string;
  author: string;
  legalEntity: string;
};

type FilterDimension = Exclude<keyof AgreementFilters, 'focusMode'>;

type AttentionPerson = {
  name: string;
  open: number;
  stuck: number;
  riskToday: number;
  stuckRate: number;
};

const DEFAULT_FILTERS: AgreementFilters = {
  focusMode: 'stuck',
  documentType: '',
  contractNumber: '',
  subject: '',
  responsible: '',
  author: '',
  legalEntity: '',
};

const FOCUS_MODES: Array<{ value: FocusMode; label: string }> = [
  { value: 'stuck', label: 'Просрочены' },
  { value: 'riskToday', label: 'Истекают сегодня' },
  { value: 'allOpen', label: 'Все в работе' },
];

const REGISTRY_FOCUS_MODES: Array<{ value: FocusMode; label: string }> = [
  { value: 'allOpen', label: 'Все' },
  { value: 'stuck', label: 'Просрочены' },
  { value: 'riskToday', label: 'Истекают' },
];

const CONTRACT_DOCUMENT_TYPES = new Set(['Договор', 'Дополнительное соглашение', 'Спецификация']);

export function App() {
  const [records, setRecords] = useState<NormalizedRecord[]>([]);
  const [quality, setQuality] = useState<QualitySummary | null>(null);
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [filters, setFilters] = useState<AgreementFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const analysisDate = useMemo(() => new Date(), []);

  const facts = useMemo(() => buildAgreementFacts(records, analysisDate), [records, analysisDate]);
  const contextFacts = useMemo(() => applyAgreementFilters(facts, filters, false), [facts, filters]);
  const filteredFacts = useMemo(() => applyAgreementFilters(facts, filters), [facts, filters]);
  const kpis = useMemo(() => calculateAgreementKpis(contextFacts), [contextFacts]);
  const filteredKpis = useMemo(() => calculateAgreementKpis(filteredFacts), [filteredFacts]);
  const options = useMemo(() => buildAgreementFilterOptions(facts, filters), [facts, filters]);
  const attentionPeople = useMemo(() => buildAttentionPeople(contextFacts), [contextFacts]);
  const hasData = records.length > 0;

  useEffect(() => {
    const next: Partial<AgreementFilters> = {};
    if (filters.contractNumber && !options.contractNumbers.includes(filters.contractNumber)) next.contractNumber = '';
    if (filters.responsible && !options.responsibles.includes(filters.responsible)) next.responsible = '';
    if (filters.subject && !options.subjects.includes(filters.subject)) next.subject = '';
    if (filters.author && !options.authors.includes(filters.author)) next.author = '';
    if (filters.documentType && !options.documentTypes.includes(filters.documentType)) next.documentType = '';
    if (filters.legalEntity && !options.legalEntities.includes(filters.legalEntity)) next.legalEntity = '';

    if (Object.keys(next).length) {
      setFilters((current) => ({ ...current, ...next }));
    }
  }, [filters, options]);

  async function handleFile(file: File | null) {
    if (!file) return;
    setIsLoading(true);
    setLoadError('');

    try {
      const result = await parseCsvFile(file, 'Согласование');
      replaceData(file.name, result);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось обработать файл. Проверьте структуру CSV.');
    } finally {
      setIsLoading(false);
    }
  }

  function replaceData(fileName: string, result: ImportResult) {
    setRecords(result.records);
    setQuality(result.quality);
    setLoadedFile({ fileName, rows: result.records.length, duplicateRows: result.quality.duplicateRows, loadedAt: new Date() });
    setFilters(DEFAULT_FILTERS);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function patchFilters(next: Partial<AgreementFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function selectResponsible(responsible: string) {
    patchFilters({ responsible });
  }

  function selectContract(contractNumber: string) {
    patchFilters({ contractNumber });
  }

  return (
    <main className="raport-shell">
      <Header loadedFile={loadedFile} records={records} onFile={handleFile} />

      {isLoading && <div className="raport-notice">Идет обработка данных. Файл остается в браузере.</div>}
      {loadError && <div className="raport-notice raport-notice-danger">{loadError}</div>}

      {!hasData ? (
        <EmptyState onFile={handleFile} />
      ) : (
        <div className="raport-workspace">
          <aside className="raport-sidebar">
            <FilterPanel filters={filters} patchFilters={patchFilters} options={options} onReset={resetFilters} />
          </aside>

          <div className="raport-main-content">
            <ActiveFilters filters={filters} filteredCount={filteredFacts.length} totalCount={facts.length} patchFilters={patchFilters} />
            <KpiGrid kpis={kpis} />

            <AttentionPeople rows={attentionPeople} onResponsibleClick={selectResponsible} />

            {quality && quality.invalidDeadlines + quality.invalidDocumentDates > 0 && (
              <div className="raport-notice">
                Есть строки с некорректными датами: {formatInteger(quality.invalidDeadlines + quality.invalidDocumentDates)}.
              </div>
            )}

            <Section
              title={registryTitle(filters.focusMode)}
              kicker="рабочий список"
              icon={BRAND.icons.table}
              actions={
                <button className="raport-button" onClick={() => downloadRecordsCsv(filteredFacts.map((fact) => fact.record))}>
                  <BrandIcon src={BRAND.icons.download} />
                  Скачать таблицу
                </button>
              }
            >
              <AgreementRegistry
                facts={filteredFacts}
                filteredKpis={filteredKpis}
                focusMode={filters.focusMode}
                onFocusModeChange={(focusMode) => patchFilters({ focusMode })}
                onContractClick={selectContract}
              />
            </Section>
          </div>
        </div>
      )}
    </main>
  );
}

function Header({
  loadedFile,
  records,
  onFile,
}: {
  loadedFile: LoadedFile | null;
  records: NormalizedRecord[];
  onFile: (file: File | null) => void;
}) {
  const period = getDocumentDatePeriod(records);

  return (
    <header className="raport-header">
      <div className="raport-brand">
        <img className="raport-logo" src={BRAND.logoMark} alt="" />
        <div>
          <h1 className="raport-title">Рапорт: договорные согласования TESSA</h1>
          <div className="raport-slogan">Excel докладывает главное</div>
          <p className="raport-description">Ежедневный контроль договорных документов: что уже застряло, что сорвется сегодня и у каких исполнителей нужно снять блокировку.</p>
        </div>
      </div>
      {loadedFile && (
        <div className="raport-header-file">
          <LoadedFileCard loadedFile={loadedFile} period={period} onFile={onFile} />
        </div>
      )}
    </header>
  );
}

function LoadedFileCard({
  loadedFile,
  period,
  onFile,
}: {
  loadedFile: LoadedFile;
  period: { from: Date; to: Date } | null;
  onFile: (file: File | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    onFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`raport-loaded-file-card ${isDragging ? 'raport-file-drop-active' : ''}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
      />
      <span className="raport-upload-action">Заменить файл</span>
      <span className="raport-loaded-file-body">
        <span className="raport-loaded-file-icon">
          <BrandIcon src={BRAND.icons.upload} />
        </span>
        <span className="raport-loaded-file-copy">
          <strong title={loadedFile.fileName}>{loadedFile.fileName}</strong>
          <span>{period ? `Период: ${formatDate(period.from)} - ${formatDate(period.to)}` : 'Период: не определен'}</span>
          <span>Загружен: {formatShortDateTime(loadedFile.loadedAt)}</span>
        </span>
      </span>
    </div>
  );
}

function UploadCard() {
  return (
    <span className="raport-start-upload-card">
      <span className="raport-start-upload-icon">
        <BrandIcon src={BRAND.icons.upload} />
      </span>
      <strong>Загрузите отчет по согласованиям</strong>
      <span>Перетащите CSV-файл сюда или выберите его вручную. Рапорт оставит только договорные документы и покажет, какие согласования уже застряли.</span>
      <em>Выбрать CSV</em>
    </span>
  );
}

function EmptyState({ onFile }: { onFile: (file: File | null) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    onFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <section
      role="button"
      tabIndex={0}
      className={`raport-empty-state ${isDragging ? 'raport-file-drop-active' : ''}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnterCapture={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOverCapture={(event) => event.preventDefault()}
      onDropCapture={handleDrop}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          onFile(event.target.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
      />
      <UploadCard />
    </section>
  );
}

function FilterPanel({
  filters,
  patchFilters,
  options,
  onReset,
}: {
  filters: AgreementFilters;
  patchFilters: (next: Partial<AgreementFilters>) => void;
  options: ReturnType<typeof buildAgreementFilterOptions>;
  onReset: () => void;
}) {
  return (
    <section className="raport-filter-panel">
      <div className="raport-filter-head">
        <div className="raport-section-label">
          <BrandIcon src={BRAND.icons.filter} />
          <div>
            <strong>Фильтры</strong>
            <span>Поля применяются автоматически.</span>
          </div>
        </div>
        <button className="raport-reset-link" type="button" onClick={onReset}>
          Сбросить
        </button>
      </div>

      <div className="raport-filter-grid">
        <Select label="Договор" value={filters.contractNumber} onChange={(contractNumber) => patchFilters({ contractNumber })}>
          <option value="">Все</option>
          {options.contractNumbers.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select label="Ответственный" value={filters.responsible} onChange={(responsible) => patchFilters({ responsible })}>
          <option value="">Все</option>
          {options.responsibles.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select label="Вид" value={filters.subject} onChange={(subject) => patchFilters({ subject })}>
          <option value="">Все</option>
          {options.subjects.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select label="Автор" value={filters.author} onChange={(author) => patchFilters({ author })}>
          <option value="">Все</option>
          {options.authors.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>
      <details className="raport-filter-details">
        <summary>Дополнительно</summary>
        <div className="raport-filter-grid">
          <Select label="Тип документа" value={filters.documentType} onChange={(documentType) => patchFilters({ documentType })}>
            <option value="">Все</option>
            {options.documentTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Select label="Юр. лицо" value={filters.legalEntity} onChange={(legalEntity) => patchFilters({ legalEntity })}>
            <option value="">Все</option>
            {options.legalEntities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </details>
    </section>
  );
}

function ActiveFilters({
  filters,
  filteredCount,
  totalCount,
  patchFilters,
}: {
  filters: AgreementFilters;
  filteredCount: number;
  totalCount: number;
  patchFilters: (next: Partial<AgreementFilters>) => void;
}) {
  const mode = FOCUS_MODES.find((item) => item.value === filters.focusMode)?.label ?? 'Просрочены';
  const chips: Array<{ label: string; onClear?: () => void }> = [
    { label: mode },
    filters.contractNumber ? { label: `Договор: ${filters.contractNumber}`, onClear: () => patchFilters({ contractNumber: '' }) } : null,
    filters.responsible ? { label: `Ответственный: ${filters.responsible}`, onClear: () => patchFilters({ responsible: '' }) } : null,
    filters.subject ? { label: `Вид: ${filters.subject}`, onClear: () => patchFilters({ subject: '' }) } : null,
    filters.documentType ? { label: `Тип: ${filters.documentType}`, onClear: () => patchFilters({ documentType: '' }) } : null,
    filters.author ? { label: `Автор: ${filters.author}`, onClear: () => patchFilters({ author: '' }) } : null,
    filters.legalEntity ? { label: `Юр. лицо: ${filters.legalEntity}`, onClear: () => patchFilters({ legalEntity: '' }) } : null,
  ].filter(Boolean) as Array<{ label: string; onClear?: () => void }>;

  return (
    <section className="raport-active-filters">
      <span>Активный фокус</span>
      <div>
        {chips.map((chip) => (
          <em key={chip.label}>
            {chip.label}
            {chip.onClear && (
              <button type="button" aria-label={`Снять фильтр ${chip.label}`} onClick={chip.onClear}>
                x
              </button>
            )}
          </em>
        ))}
      </div>
      <strong>
        {formatInteger(filteredCount)} из {formatInteger(totalCount)}
      </strong>
    </section>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="raport-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function KpiGrid({ kpis }: { kpis: ReturnType<typeof calculateAgreementKpis> }) {
  const items = [
    { label: 'Просрочены', value: formatInteger(kpis.stuck), detail: `${formatPercent(kpis.stuckRate)} от открытых`, tone: 'danger', icon: BRAND.icons.problem },
    { label: 'Истекают сегодня', value: formatInteger(kpis.riskToday), detail: 'нужно закрыть сегодня', tone: 'warning', icon: BRAND.icons.time },
    { label: 'Исполнителей с просрочками', value: formatInteger(kpis.attentionPeople), detail: 'держат просрочки', tone: 'warning', icon: BRAND.icons.ranking },
  ];

  return (
    <section className="raport-kpi-panel">
      <div className="raport-kpi-grid">
        {items.map((item) => (
          <article className={`raport-kpi-card raport-kpi-card-${item.tone}`} key={item.label}>
            <div className="raport-kpi-head">
              <BrandIcon src={item.icon} />
              <span>{item.label}</span>
            </div>
            <strong>
              {item.value}
              {item.detail && <em>{item.detail}</em>}
            </strong>
          </article>
        ))}
      </div>
      <div className="raport-kpi-context">Открыто в работе: {formatInteger(kpis.open)}</div>
    </section>
  );
}

function AttentionPeople({ rows, onResponsibleClick }: { rows: AttentionPerson[]; onResponsibleClick: (responsible: string) => void }) {
  const [viewMode, setViewMode] = useState<'top' | 'all'>('top');
  const visibleRows = viewMode === 'top' ? rows.slice(0, 5) : rows;

  return (
    <article className="raport-table-card">
      <div className="raport-card-head raport-focus-title">
        <div className="raport-section-label">
          <BrandIcon src={BRAND.icons.ranking} />
          <div>
            <h2>Исполнители с застрявшими договорами</h2>
            <span>договорные согласования</span>
          </div>
        </div>
        <div className="raport-segmented" aria-label="Режим списка исполнителей">
          <button className={viewMode === 'top' ? 'raport-segmented-active' : ''} type="button" onClick={() => setViewMode('top')}>
            ТОП
          </button>
          <button className={viewMode === 'all' ? 'raport-segmented-active' : ''} type="button" onClick={() => setViewMode('all')}>
            Все
          </button>
        </div>
      </div>
      <p className="raport-table-hint">Нажмите на ФИО, чтобы увидеть договоры исполнителя в реестре.</p>
      <div className="raport-mini-table">
        <table>
          <thead>
            <tr>
              <th>Ответственный</th>
              <th>Просрочено</th>
              <th>Истекает сегодня</th>
              <th>Все</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.name}>
                <td>
                  <button className="raport-link-button" type="button" onClick={() => onResponsibleClick(row.name)}>
                    {row.name}
                  </button>
                </td>
                <td>{formatInteger(row.stuck)}</td>
                <td>{formatInteger(row.riskToday)}</td>
                <td>{formatInteger(row.open)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function Section({ title, kicker, icon, actions, children }: { title: string; kicker: string; icon: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="raport-section">
      <div className="raport-section-head">
        <div className="raport-section-label">
          <BrandIcon src={icon} />
          <div>
            <h2>{title}</h2>
            <span>{kicker}</span>
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function AgreementRegistry({
  facts,
  filteredKpis,
  focusMode,
  onFocusModeChange,
  onContractClick,
}: {
  facts: AgreementFact[];
  filteredKpis: ReturnType<typeof calculateAgreementKpis>;
  focusMode: FocusMode;
  onFocusModeChange: (focusMode: FocusMode) => void;
  onContractClick: (contractNumber: string) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(25);
  const documentProblems = useMemo(
    () => buildDocumentProblems(facts),
    [facts],
  );
  const visibleProblems = documentProblems.slice(0, visibleCount);
  const hasMore = visibleCount < documentProblems.length;

  return (
    <div className="raport-registry">
      <div className="raport-registry-toolbar">
        <div className="raport-segmented" aria-label="Состояние договорных согласований">
          {REGISTRY_FOCUS_MODES.map((mode) => (
            <button
              key={mode.value}
              className={focusMode === mode.value ? 'raport-segmented-active' : ''}
              type="button"
              onClick={() => onFocusModeChange(mode.value)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="raport-registry-summary">
          <span>
            Строк: {formatInteger(facts.length)} · просрочены: {formatInteger(filteredKpis.stuck)} · истекают сегодня: {formatInteger(filteredKpis.riskToday)}
          </span>
          <strong>Показано {formatInteger(visibleProblems.length)} из {formatInteger(documentProblems.length)}</strong>
        </div>
      </div>
      <div className="raport-problem-list">
        {visibleProblems.map((problem) => (
          <ProblemCard key={problem.key} problem={problem} onContractClick={onContractClick} />
        ))}
      </div>
      {hasMore && (
        <button className="raport-show-more" type="button" onClick={() => setVisibleCount((count) => count + 25)}>
          Показать еще 25
        </button>
      )}
    </div>
  );
}

function ProblemCard({ problem, onContractClick }: { problem: DocumentProblem; onContractClick: (contractNumber: string) => void }) {
  const tone = problem.rating >= 50 ? 'critical' : problem.rating >= 20 ? 'warning' : 'primary';
  const riskText = [
    `${formatInteger(problem.stuckCount)} ${declineAgreement(problem.stuckCount)}`,
    `максимум ${formatNumber(problem.maxStuckDays)} дн.`,
    problem.riskTodayCount > 0 ? `${formatInteger(problem.riskTodayCount)} ${declineRisk(problem.riskTodayCount)} сегодня` : '',
  ].filter(Boolean).join(' · ');

  return (
    <article className={`raport-problem-card raport-problem-card-${tone}`}>
      <div className="raport-problem-main">
        <div className="raport-problem-title">
          <DocumentTitle problem={problem} onContractClick={onContractClick} />
        </div>
        <div className="raport-problem-risk">{riskText}</div>
        <div className="raport-problem-meta">
          <span>Вид: {problem.subject}</span>
          <span>Ответственные: {problem.responsibles}</span>
          <span>Автор: {problem.authors}</span>
        </div>
      </div>
    </article>
  );
}

function DocumentTitle({ problem, onContractClick }: { problem: DocumentProblem; onContractClick: (contractNumber: string) => void }) {
  const contractNumber = problem.rootContractNumber;
  const contractButton = (label: string) => (
    <button className="raport-inline-contract" type="button" onClick={() => onContractClick(contractNumber)}>
      {label}
    </button>
  );

  if (problem.documentType === 'Договор') {
    return <strong>Договор № {contractButton(problem.regNumber)}</strong>;
  }

  if (problem.documentType === 'Спецификация') {
    return (
      <strong>
        Спецификация № {problem.regNumber} к договору № {contractButton(problem.contractNumber)}
      </strong>
    );
  }

  if (problem.documentType === 'Дополнительное соглашение') {
    return (
      <strong>
        Дополнительное соглашение № {problem.regNumber} к договору № {contractButton(problem.contractNumber)}
      </strong>
    );
  }

  return <strong>{problem.documentType} № {contractButton(problem.regNumber)}</strong>;
}

function BrandIcon({ src }: { src: string }) {
  return <img className="raport-icon" src={src} alt="" loading="lazy" />;
}

type AgreementFact = {
  record: NormalizedRecord;
  isOpen: boolean;
  isStuck: boolean;
  isRiskToday: boolean;
  stuckDays: number;
  problemRating: number;
  problemStuckCount: number;
  problemMaxStuckDays: number;
  problemHasRiskToday: boolean;
  stateLabel: 'Застряло' | 'Риск сегодня' | 'Открыто';
};

type DocumentProblem = {
  key: string;
  contractNumber: string;
  rootContractNumber: string;
  regNumber: string;
  documentType: string;
  subject: string;
  authors: string;
  responsibles: string;
  stuckCount: number;
  riskTodayCount: number;
  maxStuckDays: number;
  rating: number;
};

function buildAgreementFacts(records: NormalizedRecord[], analysisDate: Date): AgreementFact[] {
  const todayStart = startOfLocalDay(analysisDate);
  const tomorrowStart = addDays(todayStart, 1);

  const facts: AgreementFact[] = records.filter(isContractDocumentRecord).map((record) => {
    const isOpen = record.completionDate === null;
    const deadline = record.deadline;
    const deadlineDay = deadline ? startOfLocalDay(deadline) : null;
    const isStuck = isOpen && deadlineDay !== null && deadlineDay.getTime() < todayStart.getTime();
    const isRiskToday = isOpen && deadlineDay !== null && deadlineDay.getTime() >= todayStart.getTime() && deadlineDay.getTime() < tomorrowStart.getTime();
    const stuckDays = isStuck && deadlineDay ? Math.max(0, (todayStart.getTime() - deadlineDay.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      record,
      isOpen,
      isStuck,
      isRiskToday,
      stuckDays,
      problemRating: 0,
      problemStuckCount: 0,
      problemMaxStuckDays: 0,
      problemHasRiskToday: false,
      stateLabel: isStuck ? 'Застряло' : isRiskToday ? 'Риск сегодня' : 'Открыто',
    };
  });

  const documentGroups = groupFactsBy(facts, (fact) => documentProblemKey(fact.record));
  for (const group of documentGroups.values()) {
    const stuckCount = group.filter((fact) => fact.isStuck).length;
    const maxStuckDays = group.reduce((max, fact) => Math.max(max, fact.stuckDays), 0);
    const hasRiskToday = group.some((fact) => fact.isRiskToday);
    const rating = Math.round(stuckCount * 10 + maxStuckDays * 2 + (hasRiskToday ? 5 : 0));

    for (const fact of group) {
      fact.problemRating = rating;
      fact.problemStuckCount = stuckCount;
      fact.problemMaxStuckDays = maxStuckDays;
      fact.problemHasRiskToday = hasRiskToday;
    }
  }

  return facts;
}

function isContractDocumentRecord(record: NormalizedRecord): boolean {
  return CONTRACT_DOCUMENT_TYPES.has(record.documentType.trim());
}

function applyAgreementFilters(facts: AgreementFact[], filters: AgreementFilters, includeFocus = true): AgreementFact[] {
  return facts.filter((fact) => {
    const record = fact.record;
    if (!fact.isOpen) return false;
    if (!matchesDimensionFilters(fact, filters)) return false;
    if (includeFocus && !matchesFocusFilter(fact, filters.focusMode)) return false;
    return true;
  });
}

function matchesDimensionFilters(fact: AgreementFact, filters: AgreementFilters, except?: FilterDimension): boolean {
  const record = fact.record;
    if (except !== 'documentType' && filters.documentType && record.documentType !== filters.documentType) return false;
    if (except !== 'contractNumber' && filters.contractNumber && rootContractNumber(record) !== filters.contractNumber) return false;
    if (except !== 'subject' && filters.subject && record.subject !== filters.subject) return false;
    if (except !== 'responsible' && filters.responsible && record.responsible !== filters.responsible) return false;
    if (except !== 'author' && filters.author && record.author !== filters.author) return false;
    if (except !== 'legalEntity' && filters.legalEntity && record.legalEntity !== filters.legalEntity) return false;
  return true;
}

function matchesFocusFilter(fact: AgreementFact, focusMode: FocusMode): boolean {
  if (focusMode === 'stuck') return fact.isStuck;
  if (focusMode === 'riskToday') return fact.isRiskToday;
  return true;
}

function buildDocumentProblems(facts: AgreementFact[]): DocumentProblem[] {
  const grouped = groupFactsBy(facts, (fact) => documentProblemKey(fact.record));

  return Array.from(grouped.entries())
    .map(([key, group]) => {
      const first = group[0].record;
      const stuckCount = group.filter((fact) => fact.isStuck).length;
      const riskTodayCount = group.filter((fact) => fact.isRiskToday).length;
      const maxStuckDays = group.reduce((max, fact) => Math.max(max, fact.stuckDays), 0);
      const rating = group.reduce((max, fact) => Math.max(max, fact.problemRating), 0);

      return {
        key,
        contractNumber: first.contractNumber || 'Без номера договора',
        rootContractNumber: rootContractNumber(first),
        regNumber: first.regNumber || 'не указан',
        documentType: first.documentType,
        subject: first.subject || 'не указан',
        authors: uniqueSorted(group.map((fact) => fact.record.author)).join(', '),
        responsibles: uniqueSorted(group.map((fact) => fact.record.responsible)).join(', '),
        stuckCount,
        riskTodayCount,
        maxStuckDays,
        rating,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.maxStuckDays - a.maxStuckDays || a.contractNumber.localeCompare(b.contractNumber));
}

function documentProblemKey(record: NormalizedRecord): string {
  return `${record.contractNumber || 'Без номера договора'}\u001F${record.regNumber || 'Без рег. номера'}\u001F${record.documentType || 'Не указан'}`;
}

function rootContractNumber(record: NormalizedRecord): string {
  if (record.documentType === 'Договор') return record.regNumber || record.contractNumber || 'Без номера договора';
  return record.contractNumber || record.regNumber || 'Без номера договора';
}

function calculateAgreementKpis(facts: AgreementFact[]) {
  const openFacts = facts.filter((fact) => fact.isOpen);
  const stuckFacts = openFacts.filter((fact) => fact.isStuck);
  const riskFacts = openFacts.filter((fact) => fact.isRiskToday);
  const attentionPeople = buildAttentionPeople(facts).length;

  return {
    open: openFacts.length,
    stuck: stuckFacts.length,
    riskToday: riskFacts.length,
    stuckRate: openFacts.length === 0 ? 0 : (stuckFacts.length / openFacts.length) * 100,
    attentionPeople,
  };
}

function buildAgreementFilterOptions(facts: AgreementFact[], filters: AgreementFilters) {
  const recordsFor = (except: FilterDimension) =>
    facts
      .filter((fact) => fact.isOpen)
      .filter((fact) => matchesFocusFilter(fact, filters.focusMode))
      .filter((fact) => matchesDimensionFilters(fact, filters, except))
      .map((fact) => fact.record);

  const contractRecords = recordsFor('contractNumber');
  const documentTypeRecords = recordsFor('documentType');
  const subjectRecords = recordsFor('subject');
  const responsibleRecords = recordsFor('responsible');
  const authorRecords = recordsFor('author');
  const legalEntityRecords = recordsFor('legalEntity');

  return {
    contractNumbers: uniqueSorted(contractRecords.map(rootContractNumber).filter(Boolean)),
    documentTypes: uniqueSorted(documentTypeRecords.map((record) => record.documentType)),
    subjects: uniqueSorted(subjectRecords.map((record) => record.subject).filter(Boolean)),
    responsibles: uniqueSorted(responsibleRecords.map((record) => record.responsible)),
    authors: uniqueSorted(authorRecords.map((record) => record.author)),
    legalEntities: uniqueSorted(legalEntityRecords.map((record) => record.legalEntity).filter(Boolean)),
  };
}

function buildAttentionPeople(facts: AgreementFact[]): AttentionPerson[] {
  const grouped = groupFactsBy(facts.filter((fact) => fact.isOpen), (fact) => fact.record.responsible);
  return Array.from(grouped.entries())
    .map(([name, group]) => {
      const stuck = group.filter((fact) => fact.isStuck);
      return {
        name,
        open: group.length,
        stuck: stuck.length,
        riskToday: group.filter((fact) => fact.isRiskToday).length,
        stuckRate: group.length === 0 ? 0 : (stuck.length / group.length) * 100,
      };
    })
    .filter((person) => person.stuck > 0)
    .sort((a, b) => b.stuck - a.stuck || b.riskToday - a.riskToday || b.open - a.open || b.stuckRate - a.stuckRate);
}

function registryTitle(mode: FocusMode): string {
  if (mode === 'riskToday') return 'Договорные согласования, которые истекают сегодня';
  if (mode === 'allOpen') return 'Все договорные согласования в работе';
  return 'Просроченные договорные согласования';
}

function startOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function declineAgreement(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'застрявшее согласование';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'застрявших согласования';
  return 'застрявших согласований';
}

function declineRisk(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'риск';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'риска';
  return 'рисков';
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru'));
}

function groupFactsBy<T>(items: T[], selectKey: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  items.forEach((item) => {
    const key = selectKey(item) || 'Не указан';
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  });
  return grouped;
}

function getDocumentDatePeriod(records: NormalizedRecord[]): { from: Date; to: Date } | null {
  const timestamps = records
    .map((record) => record.documentDate?.getTime())
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (!timestamps.length) return null;

  return {
    from: new Date(Math.min(...timestamps)),
    to: new Date(Math.max(...timestamps)),
  };
}

function formatShortDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
