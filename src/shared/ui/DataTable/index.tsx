import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../shadcn/table";

type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyText?: string;
  className?: string;
};

export function DataTable<T>({ columns, rows, rowKey, emptyText = "Нет данных", className }: DataTableProps<T>) {
  return (
    <div className={className}>
      <div className="overflow-hidden rounded-control border border-raport-border">
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableHeaderCell key={column.key} className={column.className}>
                  {column.header}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-raport-muted">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={rowKey(row, index)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
