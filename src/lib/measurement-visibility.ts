export type MeasurementContentMode = "development" | "production";

export type MeasurementVisibilityRow = {
  review_status: string;
  is_active: boolean;
  is_demo: boolean;
};

export function isMeasurementTypeVisible(
  row: MeasurementVisibilityRow,
  mode: MeasurementContentMode,
): boolean {
  if (row.review_status === "retired") return false;

  if (mode === "production") {
    return (
      row.review_status === "published" &&
      row.is_active &&
      !row.is_demo
    );
  }

  return true;
}

export function selectVisibleMeasurementTypes<
  T extends MeasurementVisibilityRow,
>(rows: T[], mode: MeasurementContentMode): T[] {
  return rows.filter((row) => isMeasurementTypeVisible(row, mode));
}
