import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows the empty import state", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Рапорт: качество оформления ССЗ" })).toBeInTheDocument();
    expect(screen.getByText("Excel докладывает главное")).toBeInTheDocument();
    expect(screen.queryByText("Период появится после загрузки XLS")).not.toBeInTheDocument();
    expect(screen.queryByText("Сменно-суточные задания")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Загрузите Excel-файл" })).toBeInTheDocument();
    expect(screen.getByLabelText("Загрузить XLS")).toBeInTheDocument();
  });
});
