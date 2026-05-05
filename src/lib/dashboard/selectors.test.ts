import test from "node:test";
import assert from "node:assert/strict";
import {
  percentChange,
  sumMoneyByMonthForDashboard,
  percentChangeForDashboard,
  sliceMonthsEndingAt,
} from "./selectors";
import type { MoneyByMonth } from "./types";

const series: MoneyByMonth[] = [
  { mes: "Enero", valor: 100, monthKey: "2026-01" },
  { mes: "Febrero", valor: 120, monthKey: "2026-02" },
  { mes: "Marzo", valor: 140, monthKey: "2026-03" },
  { mes: "Abril", valor: 160, monthKey: "2026-04" },
];

test("percentChange evita división por cero", () => {
  assert.equal(percentChange(100, 0), 0);
});

test("sliceMonthsEndingAt devuelve meses hasta el endMonthKey", () => {
  const sliced = sliceMonthsEndingAt(series, 2, "2026-03");
  assert.equal(sliced.length, 2);
  assert.equal(sliced[0].monthKey, "2026-02");
  assert.equal(sliced[1].monthKey, "2026-03");
});

test("sumMoneyByMonthForDashboard suma correctamente para mes seleccionado", () => {
  const total = sumMoneyByMonthForDashboard(series, 2, "2026-04");
  assert.equal(total, 300); // 140 + 160
});

test("percentChangeForDashboard en mes compara contra el mes anterior", () => {
  const delta = percentChangeForDashboard(series, 1, "2026-04");
  assert.equal(Math.round(delta), 14); // (160-140)/140 ~ 14%
});

test("percentChangeForDashboard con serie vacía devuelve 0", () => {
  assert.equal(percentChangeForDashboard([], 1, "2026-04"), 0);
});
