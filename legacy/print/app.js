(function (root) {
  "use strict";

  const CSV_COLUMNS = [
    "Дата",
    "Пользователь",
    "Страниц",
    "Копий",
    "Принтер",
    "Документ",
    "Компьютер",
    "Формат листа",
    "Драйвер",
    "Высота",
    "Ширина",
    "Двусторонняя печать",
    "Черно-белый",
    "Размер файла",
  ];

  const PAPER_BUCKETS = ["до A4 включительно", "A3", "от A2 и выше", "Не определено"];
  const DOC_TYPES = ["PDF", "Word", "Excel/табличный", "Outlook", "Изображение", "Другое", "Нет имени документа"];
  const PDF_PRINTER = "Microsoft Print to PDF";
  const EXCESS_CATEGORIES = ["Личные тематики", "Нормативные документы", "Служебные записки"];
  const RISK_REASON_FILTERS = [
    "big-job",
    "no-duplex",
    "color",
    "excess-personal",
    "excess-regulatory",
    "excess-service-note",
  ];
  const EXCESS_KEYWORDS = [
    {
      category: "Личные тематики",
      label: "книги",
      pattern: /учебник|пособи[ея]|повесть|рассказ|\.fb2\b|\.epub\b|\.djvu\b/iu,
    },
    {
      category: "Личные тематики",
      label: "учебные работы",
      pattern: /реферат|курсов(ая|ой|ик)|диплом|дипломная|(?:^|[^а-яёa-z0-9])вкр(?:$|[^а-яёa-z0-9])|контрольная|лабораторная|эссе|практическая работа/iu,
    },
    {
      category: "Личные тематики",
      label: "праздники",
      pattern: /пасха|нов(?:ый|ого)\s+год|новогодн|рождество|8\s*марта|23\s*февраля|день\s+рождени|юбилей|поздравлен|открытк|валентинк|свадьб/iu,
    },
    {
      category: "Личные тематики",
      label: "хобби и быт",
      pattern: /рецепт|меню|вязани|выкройк|путеводител/iu,
    },
    {
      category: "Личные тематики",
      label: "детские/школьные материалы",
      pattern: /раскраск|пропис[ьи]|домашн(?:ее|яя)\s+задани|детск(?:ий|ого|ому|им)?\s+сад|садик|школ[ауыое]?|олимпиад|егэ|огэ/iu,
    },
    {
      category: "Нормативные документы",
      label: "ГОСТ",
      pattern: /(?:^|[^а-яёa-z0-9])гост(?:\s*р)?(?:$|[^а-яёa-z0-9])/iu,
    },
    {
      category: "Нормативные документы",
      label: "СНиП",
      pattern: /снип/iu,
    },
    {
      category: "Нормативные документы",
      label: "СП",
      pattern: /(?:^|[^а-яёa-z0-9])сп\s*\d+(?:\.\d+)?/iu,
    },
    {
      category: "Нормативные документы",
      label: "СанПиН",
      pattern: /санпин/iu,
    },
    {
      category: "Нормативные документы",
      label: "ФНП",
      pattern: /(?:^|[^а-яёa-z0-9])фнп(?:$|[^а-яёa-z0-9])/iu,
    },
    {
      category: "Нормативные документы",
      label: "РД",
      pattern: /(?:^|[^а-яёa-z0-9])рд\s*\d+/iu,
    },
    {
      category: "Нормативные документы",
      label: "ПБ",
      pattern: /(?:^|[^а-яёa-z0-9])пб\s*\d+/iu,
    },
    {
      category: "Нормативные документы",
      label: "НПБ",
      pattern: /(?:^|[^а-яёa-z0-9])нпб(?:$|[^а-яёa-z0-9])/iu,
    },
    {
      category: "Нормативные документы",
      label: "ТР ТС",
      pattern: /тр\s*тс|техническ(?:ий|ого)\s+регламент/iu,
    },
    {
      category: "Нормативные документы",
      label: "ISO/IEC",
      pattern: /(?:^|[^a-zа-яё0-9])(?:iso|iec)\s*\d*/iu,
    },
    {
      category: "Нормативные документы",
      label: "стандарты",
      pattern: /стандарт|норматив|правила безопасности/iu,
    },
    {
      category: "Служебные записки",
      label: "служебная записка",
      pattern: /служебн(?:ая|ой|ую|ые|ых|ым|ыми)?\s+записк|служебн(?:ая|ой|ую|ые|ых|ым|ыми)?\s+запис|служебка|сл\.?\s*записк|служ\.?\s*записк/iu,
    },
  ];

  const state = {
    rows: [],
    filtered: [],
    fileName: "",
    controlsReady: false,
    userOptions: [],
    computerOptions: [],
    tableLimits: {
      users: 10,
      risk: 10,
    },
    userSort: "pages",
    riskSort: "riskScore",
  };

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(value);
        value = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(value);
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
        value = "";
      } else {
        value += char;
      }
    }

    if (value !== "" || row.length) {
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
    }

    if (!rows.length) return [];

    const header = rows[0].map((cell) => cell.trim());
    return rows.slice(1).map((cells) => {
      const item = {};
      header.forEach((name, index) => {
        item[name] = cells[index] === undefined ? "" : cells[index].trim();
      });
      return item;
    });
  }

  function parseNumber(value) {
    if (value === null || value === undefined || value === "") return 0;
    const normalized = String(value).replace(",", ".").replace(/[^\d.-]/g, "");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateKey(date) {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateTime(date) {
    if (!date) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  function classifyDocType(documentName) {
    const name = String(documentName || "").trim();
    const lower = name.toLowerCase();
    if (!name) return "Нет имени документа";
    if (/\.pdf\b/.test(lower)) return "PDF";
    if (/\.(doc|docx|rtf)\b/.test(lower) || lower.includes("microsoft word")) return "Word";
    if (/\.(xls|xlsx|xlsm)\b/.test(lower) || lower.includes("табличный документ")) return "Excel/табличный";
    if (lower.includes("outlook")) return "Outlook";
    if (/\.(jpg|jpeg|png|tif|tiff|bmp)\b/.test(lower)) return "Изображение";
    return "Другое";
  }

  function parseMm(value) {
    const match = String(value || "").match(/([0-9]+(?:[\.,][0-9]+)?)/);
    return match ? Number(match[1].replace(",", ".")) : 0;
  }

  function classifyPaperFormat(row) {
    const format = String(row["Формат листа"] || "").trim().toUpperCase();
    if (["A2", "A1", "A0"].includes(format)) return "от A2 и выше";
    if (format === "A3") return "A3";
    if (["A4", "A5", "A6", "LETTER", "STATEMENT"].includes(format)) return "до A4 включительно";

    const height = parseMm(row["Высота"]);
    const width = parseMm(row["Ширина"]);
    if (height && width) {
      const longSide = Math.max(height, width);
      const shortSide = Math.min(height, width);
      const area = height * width;
      if (longSide <= 297 && shortSide <= 210) return "до A4 включительно";
      if (longSide <= 420 && shortSide <= 297) return "A3";
      if (longSide >= 594 || shortSide >= 420 || area >= 594 * 420) return "от A2 и выше";
      return "A3";
    }

    if (["LEGAL", "B4", "C4", "8.5X13"].includes(format)) return "A3";
    return "Не определено";
  }

  function classifyExcessPrint(documentName) {
    const name = String(documentName || "");
    const seen = new Set();
    const matches = [];

    EXCESS_KEYWORDS.forEach((keyword) => {
      if (!keyword.pattern.test(name)) return;
      const key = `${keyword.category}:${keyword.label}`;
      if (seen.has(key)) return;
      seen.add(key);
      matches.push({ category: keyword.category, label: keyword.label });
    });

    return matches;
  }

  function normalizeRow(row) {
    const pages = Math.max(0, Math.trunc(parseNumber(row["Страниц"])));
    const copies = Math.max(0, Math.trunc(parseNumber(row["Копий"]))) || 1;
    const totalPages = pages * copies;
    const date = parseDate(row["Дата"]);
    const paperBucket = classifyPaperFormat(row);
    const docType = classifyDocType(row["Документ"]);
    const isBigJob = totalPages >= 100;
    const isMultiNoDuplex = pages >= 2 && row["Двусторонняя печать"] === "NOT DUPLEX";
    const isColor = row["Черно-белый"] === "NOT GRAYSCALE";
    const isPdfPrinter = row["Принтер"] === PDF_PRINTER;
    const excessMatches = classifyExcessPrint(row["Документ"] || "");
    const excessCategories = Array.from(new Set(excessMatches.map((match) => match.category)));
    const riskReasons = [];
    const riskReasonCodes = [];
    let riskScore = 0;

    if (isBigJob) {
      riskScore += 35;
      riskReasons.push({ label: "от 100 стр.", kind: "red" });
      riskReasonCodes.push("big-job");
    }
    if (isMultiNoDuplex) {
      riskScore += 35;
      riskReasons.push({ label: "без двусторонней", kind: "amber" });
      riskReasonCodes.push("no-duplex");
    }
    if (isColor) {
      riskScore += 20;
      riskReasons.push({ label: "цветная", kind: "violet" });
      riskReasonCodes.push("color");
    }
    if (excessCategories.includes("Личные тематики")) {
      riskScore += 30;
      const words = excessMatches.filter((match) => match.category === "Личные тематики").map((match) => match.label).slice(0, 2).join(", ");
      riskReasons.push({ label: `избыточная: личные${words ? ` (${words})` : ""}`, kind: "violet" });
      riskReasonCodes.push("excess-personal");
    }
    if (excessCategories.includes("Нормативные документы")) {
      riskScore += 20;
      const words = excessMatches.filter((match) => match.category === "Нормативные документы").map((match) => match.label).slice(0, 2).join(", ");
      riskReasons.push({ label: `избыточная: нормативные${words ? ` (${words})` : ""}`, kind: "blue" });
      riskReasonCodes.push("excess-regulatory");
    }
    if (excessCategories.includes("Служебные записки")) {
      riskScore += 25;
      riskReasons.push({ label: "избыточная: служебные записки", kind: "green" });
      riskReasonCodes.push("excess-service-note");
    }

    return {
      date,
      dateKey: dateKey(date),
      user: row["Пользователь"] || "Не указан",
      pages,
      copies,
      totalPages,
      printer: row["Принтер"] || "",
      documentName: row["Документ"] || "Нет имени документа",
      computer: row["Компьютер"] || "Не указан",
      driver: row["Драйвер"] || "",
      duplex: row["Двусторонняя печать"] || "",
      color: row["Черно-белый"] || "",
      paperBucket,
      docType,
      isBigJob,
      isMultiNoDuplex,
      isColor,
      isPdfPrinter,
      isExcessPrint: excessMatches.length > 0,
      excessCategories,
      excessMatches,
      riskScore: Math.min(100, riskScore),
      riskReasons,
      riskReasonCodes,
      raw: row,
    };
  }

  function validateColumns(rows) {
    if (!rows.length) throw new Error("CSV не содержит строк данных.");
    const missing = CSV_COLUMNS.filter((column) => !(column in rows[0]));
    if (missing.length) {
      throw new Error(`В CSV не найдены обязательные столбцы: ${missing.join(", ")}`);
    }
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU").format(Math.round(value || 0));
  }

  function formatPercent(value) {
    return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value || 0)}%`;
  }

  function uniqueSorted(rows, key) {
    return Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  }

  function sum(rows, key) {
    return rows.reduce((total, row) => total + (row[key] || 0), 0);
  }

  function aggregateBy(rows, key, seedFactory, reducer) {
    const map = new Map();
    rows.forEach((row) => {
      const id = typeof key === "function" ? key(row) : row[key];
      if (!map.has(id)) map.set(id, seedFactory(id));
      reducer(map.get(id), row);
    });
    return Array.from(map.values());
  }

  function getFilters() {
    const docText = byId("documentFilter").value.trim().toLowerCase();
    return {
      dateFrom: byId("dateFrom").value,
      dateTo: byId("dateTo").value,
      user: byId("userFilter").value,
      computer: byId("computerFilter").value,
      docText,
      docType: byId("docTypeFilter").value,
      color: byId("colorFilter").value,
      duplex: byId("duplexFilter").value,
      paperBuckets: getSelectedPaperBuckets(),
      riskReason: byId("riskReasonFilter").value,
      excludePdfPrinter: byId("excludePdfPrinter").checked,
    };
  }

  function getSelectedPaperBuckets() {
    return Array.from(document.querySelectorAll('input[name="paperBucket"]:checked')).map((input) => input.value);
  }

  function getTariffs() {
    return {
      bwRate: Math.max(0, parseNumber(byId("bwRate").value)),
      colorRate: Math.max(0, parseNumber(byId("colorRate").value)),
      simplexRate: Math.max(0, parseNumber(byId("simplexRate").value)),
      duplexRate: Math.max(0, parseNumber(byId("duplexRate").value)),
    };
  }

  function estimateRowCost(row, tariffs) {
    const colorRate = row.isColor ? tariffs.colorRate : tariffs.bwRate;
    const duplexRate = row.duplex === "DUPLEX" ? tariffs.duplexRate : tariffs.simplexRate;
    return row.totalPages * colorRate * duplexRate;
  }

  function applyFilters(rows, filters) {
    const userQuery = filters.user.toLowerCase();
    const computerQuery = filters.computer.toLowerCase();
    return rows.filter((row) => {
      if (filters.excludePdfPrinter && row.isPdfPrinter) return false;
      if (filters.dateFrom && row.dateKey < filters.dateFrom) return false;
      if (filters.dateTo && row.dateKey > filters.dateTo) return false;
      if (userQuery && !row.user.toLowerCase().includes(userQuery)) return false;
      if (computerQuery && !row.computer.toLowerCase().includes(computerQuery)) return false;
      if (filters.docText && !row.documentName.toLowerCase().includes(filters.docText)) return false;
      if (filters.docType && row.docType !== filters.docType) return false;
      if (filters.color && row.color !== filters.color) return false;
      if (filters.duplex && row.duplex !== filters.duplex) return false;
      if (Array.isArray(filters.paperBuckets) && !filters.paperBuckets.includes(row.paperBucket)) return false;
      if (!Array.isArray(filters.paperBuckets) && filters.paper && row.paperBucket !== filters.paper) return false;
      if (filters.riskReason && !row.riskReasonCodes.includes(filters.riskReason)) return false;
      return true;
    });
  }

  function buildOptionList(select, values, labelAll) {
    const current = select.value;
    select.replaceChildren();
    select.append(new Option(labelAll, ""));
    values.forEach((value) => select.append(new Option(value, value)));
    if (values.includes(current)) select.value = current;
  }

  function populateFilters(rows) {
    const users = uniqueSorted(rows, "user");
    state.userOptions = users;
    state.computerOptions = uniqueSorted(rows, "computer");
    buildOptionList(byId("docTypeFilter"), DOC_TYPES.filter((type) => rows.some((row) => row.docType === type)), "Все типы");
    resetPaperBuckets();

    const dates = rows.map((row) => row.dateKey).filter(Boolean).sort();
    byId("dateFrom").value = dates[0] || "";
    byId("dateTo").value = dates[dates.length - 1] || "";
  }

  function renderDashboard() {
    const filters = getFilters();
    const rows = applyFilters(state.rows, filters);
    state.filtered = rows;
    byId("filterEmptyNotice").classList.toggle("is-hidden", rows.length > 0);
    renderKpis(rows);
    renderTopUsers(rows);
    renderPaper(rows);
    renderDocTypes(rows);
    renderExcessPrint(rows);
    renderRiskJobs(rows);
  }

  function renderKpis(rows) {
    const totalPages = sum(rows, "totalPages");
    const totalJobs = rows.length;
    const simplexPages = sum(rows.filter((row) => row.duplex === "NOT DUPLEX"), "totalPages");
    const colorPages = sum(rows.filter((row) => row.isColor), "totalPages");
    const bigRows = rows.filter((row) => row.isBigJob);
    const usersCount = new Set(rows.map((row) => row.user)).size;
    const tariffs = getTariffs();
    const estimatedCost = rows.reduce((total, row) => total + estimateRowCost(row, tariffs), 0);

    byId("kpiPages").textContent = formatNumber(totalPages);
    byId("kpiJobs").textContent = `${formatNumber(totalJobs)} заданий`;
    byId("kpiSimplex").textContent = formatPercent(totalPages ? (simplexPages / totalPages) * 100 : 0);
    byId("kpiSimplexPages").textContent = `${formatNumber(simplexPages)} страниц`;
    byId("kpiColor").textContent = formatPercent(totalPages ? (colorPages / totalPages) * 100 : 0);
    byId("kpiColorPages").textContent = `${formatNumber(colorPages)} страниц`;
    byId("kpiBigJobs").textContent = formatNumber(bigRows.length);
    byId("kpiBigPages").textContent = `${formatNumber(sum(bigRows, "totalPages"))} страниц`;
    byId("kpiUsers").textContent = formatNumber(usersCount);
    byId("kpiCost").textContent = formatNumber(estimatedCost);
  }

  function renderTopUsers(rows) {
    const tariffs = getTariffs();
    const users = aggregateBy(
      rows,
      "user",
      (user) => ({ user, pages: 0, cost: 0, noDuplexPages: 0, colorPages: 0, bigJobs: 0 }),
      (item, row) => {
        item.pages += row.totalPages;
        item.cost += estimateRowCost(row, tariffs);
        if (row.isMultiNoDuplex) item.noDuplexPages += row.totalPages;
        if (row.isColor) item.colorPages += row.totalPages;
        if (row.isBigJob) item.bigJobs += 1;
      }
    ).sort((a, b) => b[state.userSort] - a[state.userSort] || b.pages - a.pages).slice(0, state.tableLimits.users);

    const body = byId("topUsersBody");
    byId("topUsersWrap").classList.toggle("is-scrollable", state.tableLimits.users > 10);
    body.replaceChildren();
    if (!users.length) {
      body.append(emptyRow(7, "Нет данных по выбранным фильтрам"));
      return;
    }

    users.forEach((user, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><button type="button" class="link-button" data-user-filter="${escapeAttr(user.user)}">${escapeHtml(user.user)}</button></td>
        <td class="numeric">${formatNumber(user.pages)}</td>
        <td class="numeric">${formatNumber(user.cost)}</td>
        <td class="numeric">${formatNumber(user.noDuplexPages)}</td>
        <td class="numeric">${formatNumber(user.colorPages)}</td>
        <td class="numeric">${formatNumber(user.bigJobs)}</td>
      `;
      body.append(tr);
    });
  }

  function renderPaper(rows) {
    const stats = PAPER_BUCKETS.map((bucket) => ({
      label: bucket,
      pages: sum(rows.filter((row) => row.paperBucket === bucket), "totalPages"),
    }));
    renderBars(byId("paperBars"), stats, ["teal", "green", "red", "amber"]);
  }

  function renderDocTypes(rows) {
    const stats = DOC_TYPES.map((type) => ({
      label: type,
      pages: sum(rows.filter((row) => row.docType === type), "totalPages"),
    })).filter((item) => item.pages > 0);
    renderBars(byId("docTypeBars"), stats, ["blue", "green", "amber", "violet", "teal", "red"]);
  }

  function renderExcessPrint(rows) {
    const subset = rows.filter((row) => row.isExcessPrint);
    byId("excessJobs").textContent = formatNumber(subset.length);
    byId("excessPages").textContent = formatNumber(sum(subset, "totalPages"));
    byId("excessUsers").textContent = formatNumber(new Set(subset.map((row) => row.user)).size);

    const categories = EXCESS_CATEGORIES.map((category) => {
      const categoryRows = subset.filter((row) => row.excessCategories.includes(category));
      return {
        label: category,
        pages: sum(categoryRows, "totalPages"),
        jobs: categoryRows.length,
      };
    });
    renderBars(byId("excessCategoryBars"), categories, ["violet", "blue", "green"]);
  }

  function renderRiskJobs(rows) {
    const sorters = {
      riskScore: (a, b) => b.riskScore - a.riskScore || b.totalPages - a.totalPages,
      totalPages: (a, b) => b.totalPages - a.totalPages || b.riskScore - a.riskScore,
    };
    if (!sorters[state.riskSort]) state.riskSort = "riskScore";
    const top = rows
      .filter((row) => row.riskScore > 0)
      .sort(sorters[state.riskSort])
      .slice(0, state.tableLimits.risk);
    const body = byId("riskJobsBody");
    byId("riskJobsWrap").classList.toggle("is-scrollable", state.tableLimits.risk > 10);
    body.replaceChildren();

    if (!top.length) {
      body.append(emptyRow(6, "Нет заданий с отклонениями по выбранным фильтрам"));
      return;
    }

    top.forEach((row, index) => {
      const tr = document.createElement("tr");
      const tags = row.riskReasons.map((reason) => `<span class="tag ${reason.kind}">${escapeHtml(reason.label)}</span>`).join("");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td class="numeric"><strong>${formatNumber(row.riskScore)}</strong></td>
        <td class="nowrap">${formatDateTime(row.date)}</td>
        <td class="numeric">${formatNumber(row.totalPages)}</td>
        <td class="doc-cell"><strong>${escapeHtml(row.user)}</strong><span title="${escapeAttr(row.documentName)}">${escapeHtml(row.documentName)}</span></td>
        <td><div class="tag-list">${tags}</div></td>
      `;
      body.append(tr);
    });
  }

  function renderBars(container, items, classes, valueKey = "pages") {
    const max = Math.max(1, ...items.map((item) => item[valueKey]));
    container.replaceChildren();

    if (!items.length || items.every((item) => item[valueKey] === 0)) {
      const row = document.createElement("div");
      row.className = "bar-row";
      row.textContent = "Нет данных по выбранным фильтрам";
      container.append(row);
      return;
    }

    items.forEach((item, index) => {
      const value = item[valueKey];
      const row = document.createElement("div");
      row.className = "bar-row";
      const width = value === 0 ? 0 : Math.max(2, (value / max) * 100);
      row.innerHTML = `
        <div class="bar-meta">
          <span>${escapeHtml(item.label)}</span>
          <strong>${formatNumber(value)} ${valueKey === "pages" ? "стр." : ""}</strong>
        </div>
        <div class="bar-track"><div class="bar-fill ${classes[index % classes.length]}" style="width:${width}%"></div></div>
      `;
      container.append(row);
    });
  }

  function resetFilters() {
    if (!state.rows.length) return;
    populateFilters(state.rows);
    byId("userFilter").value = "";
    byId("computerFilter").value = "";
    byId("documentFilter").value = "";
    byId("colorFilter").value = "";
    byId("duplexFilter").value = "";
    resetPaperBuckets();
    byId("riskReasonFilter").value = "";
    byId("excludePdfPrinter").checked = true;
    updateClearFilterButtons();
    renderDashboard();
  }

  function resetPaperBuckets() {
    document.querySelectorAll('input[name="paperBucket"]').forEach((input) => {
      input.checked = input.value === PAPER_BUCKETS[0] || input.value === PAPER_BUCKETS[3];
    });
  }

  function updateLimitButtons(target) {
    document.querySelectorAll(`[data-limit-target="${target}"]`).forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.limit) === state.tableLimits[target]);
    });
  }

  function updateSortButtons() {
    document.querySelectorAll("[data-user-sort]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.userSort === state.userSort);
    });
    document.querySelectorAll("[data-risk-sort]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.riskSort === state.riskSort);
    });
  }

  function renderSuggestions(inputId, boxId, options) {
    const box = byId(boxId);
    const query = byId(inputId).value.trim().toLowerCase();
    const matches = options
      .filter((value) => !query || value.toLowerCase().includes(query))
      .slice(0, 30);

    box.replaceChildren();
    if (!matches.length) {
      box.classList.add("is-hidden");
      return;
    }

    matches.forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestion-item";
      button.textContent = value;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        byId(inputId).value = value;
        box.classList.add("is-hidden");
        updateClearFilterButtons();
        if (state.rows.length) renderDashboard();
      });
      box.append(button);
    });

    box.classList.remove("is-hidden");
  }

  function renderUserSuggestions() {
    renderSuggestions("userFilter", "userSuggestions", state.userOptions);
    updateClearFilterButtons();
    if (state.rows.length) renderDashboard();
  }

  function renderComputerSuggestions() {
    renderSuggestions("computerFilter", "computerSuggestions", state.computerOptions);
    updateClearFilterButtons();
    if (state.rows.length) renderDashboard();
  }

  function hideUserSuggestions() {
    byId("userSuggestions").classList.add("is-hidden");
  }

  function hideComputerSuggestions() {
    byId("computerSuggestions").classList.add("is-hidden");
  }

  function updateClearFilterButtons() {
    byId("clearUserFilter").classList.toggle("is-hidden", !byId("userFilter").value);
    byId("clearComputerFilter").classList.toggle("is-hidden", !byId("computerFilter").value);
  }

  function clearAutocompleteFilter(inputId, hideSuggestions) {
    byId(inputId).value = "";
    hideSuggestions();
    updateClearFilterButtons();
    if (state.rows.length) renderDashboard();
  }

  function showLoadError(message) {
    const box = byId("loadError");
    box.textContent = message;
    box.classList.remove("is-hidden");
  }

  function clearLoadError() {
    const box = byId("loadError");
    box.textContent = "";
    box.classList.add("is-hidden");
  }

  function handleLimitClick(event) {
    const button = event.target.closest("[data-limit-target]");
    if (!button) return;
    const target = button.dataset.limitTarget;
    const limit = Number(button.dataset.limit);
    if (!state.tableLimits[target] || !Number.isFinite(limit)) return;
    state.tableLimits[target] = limit;
    updateLimitButtons(target);
    if (state.rows.length) renderDashboard();
  }

  function handleUserSortClick(event) {
    const button = event.target.closest("[data-user-sort]");
    if (!button) return;
    state.userSort = button.dataset.userSort;
    updateSortButtons();
    if (state.rows.length) renderDashboard();
  }

  function handleTopUserClick(event) {
    const button = event.target.closest("[data-user-filter]");
    if (!button) return;
    byId("userFilter").value = button.dataset.userFilter;
    hideUserSuggestions();
    updateClearFilterButtons();
    if (state.rows.length) renderDashboard();
  }

  function handleRiskSortClick(event) {
    const button = event.target.closest("[data-risk-sort]");
    if (!button) return;
    state.riskSort = button.dataset.riskSort;
    updateSortButtons();
    if (state.rows.length) renderDashboard();
  }

  function loadCsvText(text, fileName = "print.csv") {
    clearLoadError();
    const parsed = parseCsv(String(text || ""));
    validateColumns(parsed);
    state.rows = parsed.map(normalizeRow);
    state.fileName = fileName;
    populateFilters(state.rows);
    byId("fileName").textContent = fileName;
    byId("fileMeta").textContent = `${formatNumber(state.rows.length)} заданий в файле`;
    byId("emptyState").classList.add("is-hidden");
    byId("dashboardContent").classList.remove("is-hidden");
    byId("statusPill").textContent = "CSV загружен";
    renderDashboard();
    return state.rows;
  }

  function onFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        loadCsvText(reader.result, file.name);
      } catch (error) {
        byId("statusPill").textContent = "Ошибка загрузки";
        showLoadError(error.message);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function emptyRow(colspan, message) {
    const tr = document.createElement("tr");
    tr.className = "muted-row";
    tr.innerHTML = `<td colspan="${colspan}">${escapeHtml(message)}</td>`;
    return tr;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function init() {
    byId("csvInput").addEventListener("change", onFileSelected);
    byId("resetFilters").addEventListener("click", resetFilters);
    byId("userFilter").addEventListener("input", renderUserSuggestions);
    byId("userFilter").addEventListener("focus", renderUserSuggestions);
    byId("userFilter").addEventListener("blur", () => window.setTimeout(hideUserSuggestions, 120));
    byId("clearUserFilter").addEventListener("click", (event) => {
      event.preventDefault();
      clearAutocompleteFilter("userFilter", hideUserSuggestions);
    });
    byId("computerFilter").addEventListener("input", renderComputerSuggestions);
    byId("computerFilter").addEventListener("focus", renderComputerSuggestions);
    byId("computerFilter").addEventListener("blur", () => window.setTimeout(hideComputerSuggestions, 120));
    byId("clearComputerFilter").addEventListener("click", (event) => {
      event.preventDefault();
      clearAutocompleteFilter("computerFilter", hideComputerSuggestions);
    });
    document.querySelectorAll("[data-limit-target]").forEach((button) => {
      button.addEventListener("click", handleLimitClick);
    });
    document.querySelectorAll("[data-user-sort]").forEach((button) => {
      button.addEventListener("click", handleUserSortClick);
    });
    document.querySelectorAll("[data-risk-sort]").forEach((button) => {
      button.addEventListener("click", handleRiskSortClick);
    });
    byId("topUsersBody").addEventListener("click", handleTopUserClick);
    [
      "dateFrom",
      "dateTo",
      "documentFilter",
      "docTypeFilter",
      "colorFilter",
      "duplexFilter",
      "riskReasonFilter",
      "excludePdfPrinter",
      "bwRate",
      "colorRate",
      "simplexRate",
      "duplexRate",
    ].forEach((id) => {
      const eventName = id === "documentFilter" || id.endsWith("Rate") ? "input" : "change";
      byId(id).addEventListener(eventName, () => {
        if (state.rows.length) renderDashboard();
      });
    });
    document.querySelectorAll('input[name="paperBucket"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (state.rows.length) renderDashboard();
      });
    });

    buildOptionList(byId("docTypeFilter"), [], "Все типы");
    Object.keys(state.tableLimits).forEach(updateLimitButtons);
    updateSortButtons();
    updateClearFilterButtons();
  }

  const api = {
    parseCsv,
    loadCsvText,
    normalizeRow,
    classifyDocType,
    classifyPaperFormat,
    classifyExcessPrint,
    applyFilters,
    formatNumber,
    constants: { PDF_PRINTER, PAPER_BUCKETS, DOC_TYPES, EXCESS_CATEGORIES, RISK_REASON_FILTERS },
  };

  root.PrintDashboard = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }
})(typeof window !== "undefined" ? window : globalThis);
