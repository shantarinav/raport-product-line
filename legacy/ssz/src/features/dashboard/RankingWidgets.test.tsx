import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { OperationRecord, SszRecord } from "../import/types";
import { RankingWidgets } from "./RankingWidgets";

function operation(overrides: Partial<OperationRecord>): OperationRecord {
  return {
    id: overrides.id ?? "op",
    sourceName: "a.xls",
    rowNumber: 1,
    sszNumber: "1",
    sszDate: overrides.sszDate ?? "2026-04-01T08:00:00",
    department: overrides.department ?? "131 Цех",
    master: overrides.master ?? "Мастер A",
    status: "Завершен",
    product: overrides.product ?? "Заказ A",
    kit: overrides.kit ?? "К1",
    semiProduct: "Полуфабрикат",
    operation: overrides.operation ?? "Сборка",
    executor: "Исполнитель",
    technologyTime: overrides.technologyTime ?? 0,
    noTechnologyTime: overrides.noTechnologyTime ?? 0,
  };
}

const records: SszRecord[] = [
  {
    id: "1",
    sourceName: "a.xls",
    number: "1",
    date: null,
    department: "131 Цех",
    master: "Мастер A",
    status: "Завершен",
    technologyTime: 90,
    noTechnologyTime: 10,
    operations: [
      operation({ id: "1", department: "131 Цех", master: "Мастер A", technologyTime: 90, noTechnologyTime: 10 }),
      ...Array.from({ length: 9 }, (_, index) =>
        operation({ id: `1-${index + 2}`, department: "131 Цех", master: "Мастер A", technologyTime: 8, noTechnologyTime: 0 }),
      ),
    ],
  },
  {
    id: "2",
    sourceName: "a.xls",
    number: "2",
    date: null,
    department: "150 Цех",
    master: "Мастер B",
    status: "В подготовке",
    technologyTime: 50,
    noTechnologyTime: 50,
    operations: [
      operation({
        id: "2",
        department: "150 Цех",
        master: "Мастер B",
        product: "Заказ B",
        kit: "К2",
        operation: "Пайка",
        sszDate: "2026-04-02T08:00:00",
        technologyTime: 50,
        noTechnologyTime: 50,
      }),
    ],
  },
  {
    id: "3",
    sourceName: "a.xls",
    number: "3",
    date: null,
    department: "150 Цех",
    master: "Мастер C",
    status: "Завершен",
    technologyTime: 20,
    noTechnologyTime: 15,
    operations: [
      operation({
        id: "3",
        department: "150 Цех",
        master: "Мастер C",
        product: "Заказ B",
        kit: "К3",
        operation: "Контроль",
        sszDate: "2026-04-03T08:00:00",
        technologyTime: 20,
        noTechnologyTime: 15,
      }),
    ],
  },
];

function recordWithOrder(index: number): SszRecord {
  const product = `Заказ 0${index}`;
  return {
    id: `extra-${index}`,
    sourceName: "a.xls",
    number: `extra-${index}`,
    date: null,
    department: "160 Цех",
    master: `Мастер ${index}`,
    status: "Завершен",
    technologyTime: 10,
    noTechnologyTime: 0,
    operations: [operation({ id: `extra-op-${index}`, department: "160 Цех", master: `Мастер ${index}`, product, kit: `К${index}`, technologyTime: 10, noTechnologyTime: 0 })],
  };
}

function recordWithProblemOrder(index: number): SszRecord {
  const product = `Проблемный заказ 0${index}`;
  return {
    id: `problem-${index}`,
    sourceName: "a.xls",
    number: `problem-${index}`,
    date: null,
    department: "170 Цех",
    master: `Проблемный мастер ${index}`,
    status: "Завершен",
    technologyTime: 10,
    noTechnologyTime: index + 1,
    operations: [
      operation({
        id: `problem-op-${index}`,
        department: "170 Цех",
        master: `Проблемный мастер ${index}`,
        product,
        kit: `ПК${index}`,
        technologyTime: 10,
        noTechnologyTime: index + 1,
      }),
    ],
  };
}

function recordWithTinyProblemOrder(): SszRecord {
  return {
    id: "tiny-problem",
    sourceName: "a.xls",
    number: "tiny-problem",
    date: null,
    department: "180 Цех",
    master: "Мастер микровклада",
    status: "Завершен",
    technologyTime: 10,
    noTechnologyTime: 0.001,
    operations: [
      operation({
        id: "tiny-problem-op",
        department: "180 Цех",
        master: "Мастер микровклада",
        product: "Микро заказ",
        kit: "МК",
        technologyTime: 10,
        noTechnologyTime: 0.001,
      }),
    ],
  };
}

describe("RankingWidgets", () => {
  it("renders the required dashboard structure and filtered KPI cards", () => {
    render(<RankingWidgets records={records} />);

    expect(screen.getByLabelText("Фильтры")).toBeInTheDocument();
    expect(screen.getByLabelText("Цех")).toBeInTheDocument();
    expect(screen.getByLabelText("Мастер")).toBeInTheDocument();
    expect(screen.getByText("Всего ССЗ")).toBeInTheDocument();
    expect(screen.getByText("Доля работ по технологии")).toBeInTheDocument();
    expect(screen.getByText("по нормо-часам · Цель: ≥ 70%")).toBeInTheDocument();
    expect(screen.getByText("Доля операций по технологии")).toBeInTheDocument();
    expect(screen.getByText("по количеству операций · Цель: ≥ 70%")).toBeInTheDocument();
    expect(screen.getByText("Заказы")).toBeInTheDocument();
    expect(screen.getByText("Лидеры по технологии")).toBeInTheDocument();
    expect(screen.getByText("Зона внимания")).toBeInTheDocument();
    expect(screen.getByText("Цеха")).toBeInTheDocument();
    expect(screen.getByText("Мастера")).toBeInTheDocument();
    expect(screen.getByText("Операции")).toBeInTheDocument();
    expect(screen.queryByText("Главное в рапорте")).not.toBeInTheDocument();
    expect(screen.queryByText(/Детализация/)).not.toBeInTheDocument();
    expect(screen.getByText("75,6%")).toBeInTheDocument();
    expect(screen.getByText("100,0%")).toBeInTheDocument();
  });

  it("shows leaderboards with technology and no-technology metrics", () => {
    render(<RankingWidgets records={records} />);

    const leaders = screen.getByLabelText("Лидеры по технологии");
    expect(within(leaders).getByText("Мастер A")).toBeInTheDocument();
    expect(within(leaders).getByText("94,2%")).toBeInTheDocument();
    expect(within(leaders).getByText("10 опер.")).toBeInTheDocument();
    expect(within(leaders).getByText("162 н-ч")).toBeInTheDocument();
    expect(within(leaders).queryByText("Лидер")).not.toBeInTheDocument();

    const attention = screen.getByLabelText("Зона внимания");
    const attentionRows = within(attention).getAllByRole("listitem");
    expect(attentionRows[0]).toHaveTextContent("Мастер B");
    expect(attentionRows[0]).toHaveTextContent("50,0%");
    expect(attentionRows[0]).toHaveTextContent("50 н-ч");
    expect(attentionRows[0]).toHaveTextContent("1 опер.");
    expect(within(attention).getByText("Мастер A")).toBeInTheDocument();
    expect(within(attention).queryByText("Малый объем")).not.toBeInTheDocument();
  });

  it("prefills date filters from the uploaded report period", () => {
    render(<RankingWidgets records={records} period={{ start: "2026-04-01", end: "2026-04-03", label: "2026-04-01 - 2026-04-03" }} />);

    expect(screen.getByLabelText("Дата с")).toHaveValue("2026-04-01");
    expect(screen.getByLabelText("Дата по")).toHaveValue("2026-04-03");
    expect(screen.getByText("Период: 01.04.2026 - 03.04.2026")).toBeInTheDocument();
  });

  it("keeps leaders above target and ranks no-technology work by volume", async () => {
    const user = userEvent.setup();
    render(
      <RankingWidgets
        records={[
          ...records,
          ...Array.from({ length: 8 }, (_, index) => recordWithOrder(index)),
          ...Array.from({ length: 8 }, (_, index) => recordWithProblemOrder(index)),
        ]}
      />,
    );

    const targetInput = screen.getByRole("spinbutton", { name: "Целевая доля по технологии в процентах" });
    await user.clear(targetInput);
    await user.type(targetInput, "95");

    const leaders = screen.getByLabelText("Лидеры по технологии");
    const attention = screen.getByLabelText("Зона внимания");
    expect(within(leaders).queryByText("Мастер A")).not.toBeInTheDocument();
    expect(within(attention).getByText("Мастер A")).toBeInTheDocument();

    await user.click(within(leaders.closest("article") as HTMLElement).getByRole("button", { name: "Все" }));
    expect(within(screen.getByLabelText("Лидеры по технологии")).getByText("Мастер 0")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Лидеры по технологии")).queryByText("Мастер A")).not.toBeInTheDocument();

    await user.click(within(attention.closest("article") as HTMLElement).getByRole("button", { name: "Все" }));
    expect(within(screen.getByLabelText("Зона внимания")).getByText("Мастер A")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Зона внимания")).queryByText("Мастер 0")).not.toBeInTheDocument();
  });

  it("ranks technology master leaders by technology norm-hours descending", () => {
    render(
      <RankingWidgets
        records={[
          ...records,
          {
            id: "big-tech-master",
            sourceName: "a.xls",
            number: "big-tech-master",
            date: null,
            department: "180 Цех",
            master: "Мастер с большим объемом",
            status: "Завершен",
            technologyTime: 300,
            noTechnologyTime: 90,
            operations: [
              operation({
                id: "big-tech-master-op",
                department: "180 Цех",
                master: "Мастер с большим объемом",
                technologyTime: 300,
                noTechnologyTime: 90,
              }),
            ],
          },
          {
            id: "perfect-small-master",
            sourceName: "a.xls",
            number: "perfect-small-master",
            date: null,
            department: "181 Цех",
            master: "Мастер со 100%",
            status: "Завершен",
            technologyTime: 120,
            noTechnologyTime: 0,
            operations: [
              operation({
                id: "perfect-small-master-op",
                department: "181 Цех",
                master: "Мастер со 100%",
                technologyTime: 120,
                noTechnologyTime: 0,
              }),
            ],
          },
        ]}
      />,
    );

    const leaders = screen.getByLabelText("Лидеры по технологии");
    expect(within(leaders).getAllByRole("listitem")[0]).toHaveTextContent("Мастер с большим объемом");
  });

  it("filters by order and kit and recalculates visible data", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={records} />);

    const orderInput = screen.getByLabelText("Номер заказа");
    const kitSelect = screen.getByLabelText("Комплект");
    expect(kitSelect).toBeDisabled();

    await user.type(orderInput, "Заказ B");
    expect(kitSelect).toBeEnabled();
    const leadersByOrder = screen.queryByLabelText("Лидеры по технологии");
    const attentionByOrder = screen.getByLabelText("Зона внимания");
    const departmentsByOrder = screen.getByText("Цеха").closest("article");
    const mastersByOrder = screen.getByText("Мастера").closest("article");
    const operationsByOrder = screen.getByText("Операции").closest("article");
    expect(departmentsByOrder).not.toBeNull();
    expect(mastersByOrder).not.toBeNull();
    expect(operationsByOrder).not.toBeNull();

    [leadersByOrder, attentionByOrder, departmentsByOrder as HTMLElement, mastersByOrder as HTMLElement, operationsByOrder as HTMLElement]
      .filter((widget): widget is HTMLElement => Boolean(widget))
      .forEach(
      (widget) => {
        expect(within(widget).queryByText("Мастер A")).not.toBeInTheDocument();
        expect(within(widget).queryByText("Сборка")).not.toBeInTheDocument();
        expect(within(widget).queryByText("131 Цех")).not.toBeInTheDocument();
      },
    );
    expect(within(mastersByOrder as HTMLElement).getByText("Мастер B")).toBeInTheDocument();
    expect(within(mastersByOrder as HTMLElement).getByText("Мастер C")).toBeInTheDocument();
    expect(within(operationsByOrder as HTMLElement).getByText("Пайка")).toBeInTheDocument();
    expect(within(operationsByOrder as HTMLElement).getByText("Контроль")).toBeInTheDocument();
    expect(screen.getAllByText("51,9%").length).toBeGreaterThan(0);

    await user.selectOptions(kitSelect, "К3");
    const leadersByKit = screen.queryByLabelText("Лидеры по технологии");
    const attentionByKit = screen.getByLabelText("Зона внимания");
    const mastersByKit = screen.getByText("Мастера").closest("article");
    const operationsByKit = screen.getByText("Операции").closest("article");
    expect(mastersByKit).not.toBeNull();
    expect(operationsByKit).not.toBeNull();
    if (leadersByKit) {
      expect(within(leadersByKit).queryByText("Мастер B")).not.toBeInTheDocument();
    }
    expect(within(attentionByKit).queryByText("Мастер B")).not.toBeInTheDocument();
    expect(within(mastersByKit as HTMLElement).queryByText("Мастер B")).not.toBeInTheDocument();
    expect(within(mastersByKit as HTMLElement).getByText("Мастер C")).toBeInTheDocument();
    expect(screen.getByText("Контроль")).toBeInTheDocument();
    expect(within(operationsByKit as HTMLElement).queryByText("Пайка")).not.toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    expect(kitSelect).toBeDisabled();
    expect(screen.getAllByText("Мастер A").length).toBeGreaterThan(0);
  });

  it("filters boards by SSZ date range", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={records} />);

    await user.type(screen.getByLabelText("Дата с"), "2026-04-02");
    await user.type(screen.getByLabelText("Дата по"), "2026-04-02");

    expect(screen.getAllByText("Мастер B").length).toBeGreaterThan(0);
    expect(screen.getByText("Пайка")).toBeInTheDocument();
    expect(screen.queryByText("Мастер A")).not.toBeInTheDocument();
    expect(screen.queryByText("Контроль")).not.toBeInTheDocument();
    expect(screen.queryByText("Сборка")).not.toBeInTheDocument();
  });

  it("filters master and operation boards when a department link is clicked", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={records} />);

    await user.click(screen.getByRole("button", { name: "Выбрать цех 150 Цех" }));

    expect(screen.getByLabelText("Цех")).toHaveValue("150 Цех");
    expect(screen.getByText("Мастера цеха")).toBeInTheDocument();
    expect(screen.getByText("Мастера выбранного цеха: 150 Цех")).toBeInTheDocument();
    expect(screen.getAllByText("Мастер C").length).toBeGreaterThan(0);
    expect(screen.getByText("Операции цеха")).toBeInTheDocument();
    expect(screen.getByText("Операции выбранного цеха: 150 Цех")).toBeInTheDocument();
    expect(screen.getByText("Пайка")).toBeInTheDocument();
    expect(screen.getByText("Контроль")).toBeInTheDocument();
    expect(screen.queryByText("Сборка")).not.toBeInTheDocument();
  });

  it("uses the target percent for status labels and KPI deviation", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={records} />);

    const targetInput = screen.getByRole("spinbutton", { name: "Целевая доля по технологии в процентах" });
    await user.clear(targetInput);
    await user.type(targetInput, "95");

    expect(screen.getByText("по нормо-часам · Цель: ≥ 95%")).toBeInTheDocument();
    expect(screen.getByText("по количеству операций · Цель: ≥ 95%")).toBeInTheDocument();
    expect(screen.getByText("Отклонение: -19,4 п.п.")).toBeInTheDocument();
    expect(screen.getAllByText("Ниже цели").length).toBeGreaterThan(0);
  });

  it("filters department, master and operation boards by target status", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={records} />);

    const departmentBoard = screen.getByText("Цеха").closest("article");
    const masterBoard = screen.getByText("Мастера").closest("article");
    const operationBoard = screen.getByText("Операции").closest("article");
    expect(departmentBoard).not.toBeNull();
    expect(masterBoard).not.toBeNull();
    expect(operationBoard).not.toBeNull();

    expect(within(departmentBoard as HTMLElement).getByText("131 Цех")).toBeInTheDocument();
    expect(within(departmentBoard as HTMLElement).getByText("150 Цех")).toBeInTheDocument();

    await user.click(within(departmentBoard as HTMLElement).getByRole("button", { name: "Цель достигнута" }));
    expect(within(departmentBoard as HTMLElement).getByText("131 Цех")).toBeInTheDocument();
    expect(within(departmentBoard as HTMLElement).queryByText("150 Цех")).not.toBeInTheDocument();

    await user.click(within(departmentBoard as HTMLElement).getByRole("button", { name: "Ниже цели" }));
    expect(within(departmentBoard as HTMLElement).queryByText("131 Цех")).not.toBeInTheDocument();
    expect(within(departmentBoard as HTMLElement).getByText("150 Цех")).toBeInTheDocument();

    await user.click(within(masterBoard as HTMLElement).getByRole("button", { name: "Цель достигнута" }));
    expect(within(masterBoard as HTMLElement).getByText("Мастер A")).toBeInTheDocument();
    expect(within(masterBoard as HTMLElement).queryByText("Мастер B")).not.toBeInTheDocument();

    await user.click(within(masterBoard as HTMLElement).getByRole("button", { name: "Ниже цели" }));
    expect(within(masterBoard as HTMLElement).queryByText("Мастер A")).not.toBeInTheDocument();
    expect(within(masterBoard as HTMLElement).getByText("Мастер B")).toBeInTheDocument();

    await user.click(within(operationBoard as HTMLElement).getByRole("button", { name: "Цель достигнута" }));
    expect(within(operationBoard as HTMLElement).getByText("Сборка")).toBeInTheDocument();
    expect(within(operationBoard as HTMLElement).queryByText("Пайка")).not.toBeInTheDocument();

    await user.click(within(operationBoard as HTMLElement).getByRole("button", { name: "Все" }));
    expect(within(operationBoard as HTMLElement).getByText("Пайка")).toBeInTheDocument();
  });

  it("lets an order number be typed manually", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={records} />);

    const orderInput = screen.getByLabelText("Номер заказа");
    await user.type(orderInput, "Заказ C");

    expect(orderInput).toHaveValue("Заказ C");
    expect(screen.getByLabelText("Комплект")).toBeEnabled();
    expect(screen.getAllByText("Нет данных для текущей выборки.").length).toBeGreaterThan(0);
  });

  it("shows all matching order suggestions while typing", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={[...records, ...Array.from({ length: 10 }, (_, index) => recordWithOrder(index))]} />);

    const orderInput = screen.getByLabelText("Номер заказа");
    await user.type(orderInput, "Заказ 0");

    const suggestions = screen.getByRole("listbox");
    expect(within(suggestions).getAllByRole("button", { name: /Заказ 0/ })).toHaveLength(10);
    expect(within(suggestions).getByRole("button", { name: "Заказ 09" })).toBeInTheDocument();
  });

  it("uses a top/all switch in widget headers instead of a bottom show-all button", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={[...records, ...Array.from({ length: 10 }, (_, index) => recordWithProblemOrder(index))]} />);

    expect(screen.queryByRole("button", { name: "Показать все" })).not.toBeInTheDocument();

    const ordersWidget = screen.getByText("Заказы").closest("article");
    expect(ordersWidget).not.toBeNull();
    expect(within(ordersWidget as HTMLElement).queryByText("Проблемный заказ 00")).not.toBeInTheDocument();

    const displaySwitch = within(ordersWidget as HTMLElement).getByLabelText("Режим отображения");
    await user.click(within(displaySwitch).getByRole("button", { name: "Все" }));

    expect(within(ordersWidget as HTMLElement).getByText("Проблемный заказ 04")).toBeInTheDocument();
  });

  it("shows orders as a technology-share board and filters them by target status", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={[...records, recordWithOrder(9), recordWithTinyProblemOrder()]} />);

    const ordersWidget = screen.getByText("Заказы").closest("article");
    expect(ordersWidget).not.toBeNull();
    expect(within(ordersWidget as HTMLElement).getByText("Заказ A")).toBeInTheDocument();
    expect(within(ordersWidget as HTMLElement).getByText("Заказ B")).toBeInTheDocument();
    expect(within(ordersWidget as HTMLElement).getAllByText("Цель достигнута").length).toBeGreaterThan(0);
    expect(within(ordersWidget as HTMLElement).getAllByText("Ниже цели").length).toBeGreaterThan(0);

    await user.click(within(ordersWidget as HTMLElement).getByRole("button", { name: "Ниже цели" }));
    expect(within(ordersWidget as HTMLElement).queryByText("Заказ A")).not.toBeInTheDocument();
    expect(within(ordersWidget as HTMLElement).getByText("Заказ B")).toBeInTheDocument();
  });

  it("applies an order when its number is clicked", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={records} />);

    const ordersWidget = screen.getByText("Заказы").closest("article");
    expect(ordersWidget).not.toBeNull();

    await user.click(within(ordersWidget as HTMLElement).getByRole("button", { name: "Выбрать заказ Заказ B" }));
    expect(screen.getByLabelText("Номер заказа")).toHaveValue("Заказ B");
    expect(screen.queryByText("131 Цех")).not.toBeInTheDocument();
  });

  it("fills master and department filters when a leader master name is clicked", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={records} />);

    const leaders = screen.getByLabelText("Лидеры по технологии");
    await user.click(within(leaders).getByRole("button", { name: "Выбрать мастера Мастер A" }));

    expect(screen.getByLabelText("Мастер")).toHaveValue("Мастер A");
    expect(screen.getByLabelText("Цех")).toHaveValue("131 Цех");
    expect(screen.getByText("Мастера цеха")).toBeInTheDocument();
    expect(screen.getAllByText("Мастер A").length).toBeGreaterThan(1);
    const masterBoard = screen.getByText("Мастера цеха").closest("article");
    expect(masterBoard).not.toBeNull();
    expect(within(masterBoard as HTMLElement).queryByText("Мастер B")).not.toBeInTheDocument();
  });

  it("shows technology operations and hides no-technology share under sliders", async () => {
    const user = userEvent.setup();
    render(<RankingWidgets records={records} />);

    const leaders = screen.getByLabelText("Лидеры по технологии");
    await user.click(within(leaders).getByRole("button", { name: "Выбрать мастера Мастер A" }));

    const departmentBoard = screen.getByText("Цеха").closest("article");
    const masterBoard = screen.getByText("Мастера цеха").closest("article");

    expect(departmentBoard).not.toBeNull();
    expect(masterBoard).not.toBeNull();
    expect(within(departmentBoard as HTMLElement).getByText("162 н-ч · 10 опер. по тех.")).toBeInTheDocument();
    expect(within(masterBoard as HTMLElement).getByText("162 н-ч · 10 опер. по тех.")).toBeInTheDocument();
    expect(screen.queryByText(/доля без технологии/)).not.toBeInTheDocument();
  });
});
