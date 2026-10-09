import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Table2,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/health/cards";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import {
  buildImportQaSummary,
  importMappingRoleForIndex,
  inferImportMapping,
  parseCsv,
  setImportMappingRole,
  summarizeMeasurementTypeMatches,
  type ImportColumnRole,
  type ImportMapping,
  type ParsedCsv,
} from "@/lib/health-data-import";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data-import")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "فحص استيراد البيانات — مؤشر صحي" },
      {
        name: "description",
        content:
          "فحص جودة ملفات CSV الصحية محليًا قبل أي استيراد إلى السجل الصحي.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HealthDataImportQaPage,
});

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const roleLabels: Record<
  ImportColumnRole,
  { ar: string; en: string }
> = {
  ignore: { ar: "تجاهل العمود", en: "Ignore column" },
  measured_at: { ar: "تاريخ/وقت القياس", en: "Measurement date/time" },
  measurement_type: { ar: "نوع القياس", en: "Measurement type" },
  value: { ar: "القيمة", en: "Value" },
  unit: { ar: "الوحدة", en: "Unit" },
  systolic: { ar: "الضغط الانقباضي", en: "Systolic" },
  diastolic: { ar: "الضغط الانبساطي", en: "Diastolic" },
  notes: { ar: "ملاحظات", en: "Notes" },
};

const roles = Object.keys(roleLabels) as ImportColumnRole[];

function HealthDataImportQaPage() {
  const { lang, dir } = useI18n();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);

  const measurementTypesQuery = useQuery({
    queryKey: ["data-import-measurement-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_types")
        .select("code,name_ar,name_en")
        .order("code");

      if (error) throw error;
      return data;
    },
  });

  const qa = useMemo(
    () =>
      parsed
        ? buildImportQaSummary(parsed.rows, mapping)
        : null,
    [mapping, parsed],
  );

  const typeMatches = useMemo(
    () =>
      parsed
        ? summarizeMeasurementTypeMatches(
            parsed.rows,
            mapping,
            measurementTypesQuery.data ?? [],
          )
        : {
            distinctValues: [],
            recognizedValues: [],
            unrecognizedValues: [],
          },
    [mapping, measurementTypesQuery.data, parsed],
  );

  const issueRows = useMemo(
    () => new Set(qa?.issues.map((issue) => issue.rowNumber) ?? []),
    [qa],
  );

  const reset = () => {
    setParsed(null);
    setMapping({});
    setFileName("");
    setFileSize(0);
    setFileError(null);
  };

  const readFile = async (file: File | null) => {
    reset();
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setFileError(
        lang === "ar"
          ? "حجم الملف أكبر من 5 MB. استخدم ملفًا أصغر لهذه المعاينة المحلية."
          : "The file is larger than 5 MB. Use a smaller file for this local preview.",
      );
      return;
    }

    try {
      const text = await file.text();
      const nextParsed = parseCsv(text);
      setParsed(nextParsed);
      setMapping(inferImportMapping(nextParsed.headers));
      setFileName(file.name);
      setFileSize(file.size);
    } catch {
      setFileError(
        lang === "ar"
          ? "تعذر قراءة الملف محليًا."
          : "The file could not be read locally.",
      );
    }
  };

  const downloadQaReport = () => {
    if (!parsed || !qa) return;

    const report = {
      generated_at: new Date().toISOString(),
      file: {
        name: fileName,
        size_bytes: fileSize,
        delimiter:
          parsed.delimiter === "\t" ? "tab" : parsed.delimiter,
      },
      headers: parsed.headers,
      mapping,
      parser_errors: parsed.errors,
      qa,
      measurement_type_matching: typeMatches,
      privacy_note:
        "Generated locally in the browser. Raw row values are not included in this QA report.",
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeBaseName(fileName || "health-data")}-qa-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={
          lang === "ar"
            ? "استيراد وفحص البيانات"
            : "Data import quality check"
        }
        subtitle={
          lang === "ar"
            ? "افحص ملف CSV أو TSV قبل الحفظ: الأعمدة، القيم المفقودة، التكرارات، التواريخ والأرقام وأنواع القياسات."
            : "Inspect CSV or TSV data before saving: columns, missing values, duplicates, dates, numbers, and measurement types."
        }
      >
        <Link
          to="/professional"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-bold text-primary ring-1 ring-border"
        >
          <ArrowRight className={cn("size-4", dir === "ltr" && "rotate-180")} />
          {lang === "ar" ? "العودة للوضع المهني" : "Back to professional mode"}
        </Link>
      </PageHeader>

      <MedicalDisclaimer
        className="mb-5"
        text={
          lang === "ar"
            ? "هذه الأداة لفحص بنية البيانات وجودتها فقط. لا تعتبر الملف دليلًا سريريًا، ولا تستنتج تشخيصًا أو علاجًا، ولا تحفظ أي صف في قاعدة البيانات في هذه المرحلة."
            : "This tool checks data structure and quality only. It does not treat the file as clinical evidence, infer diagnosis or treatment, or save any row to the database at this stage."
        }
      />

      <section className="mb-5 rounded-3xl bg-primary-soft/70 p-5 ring-1 ring-primary/15">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-card text-primary ring-1 ring-primary/10">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="font-extrabold">
              {lang === "ar"
                ? "الملف يبقى في جهازك"
                : "The file stays on your device"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {lang === "ar"
                ? "تتم القراءة والتحليل داخل المتصفح. لا يتم رفع الملف أو تخزين صفوفه على الخادم في Phase 1."
                : "Reading and analysis happen inside the browser. The file and its rows are not uploaded or stored on the server in Phase 1."}
            </p>
          </div>
        </div>
      </section>

      {!parsed ? (
        <section className="glass rounded-3xl p-6 text-center md:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-primary-soft text-primary">
            <Upload className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold">
            {lang === "ar" ? "اختر ملف البيانات" : "Choose a data file"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {lang === "ar"
              ? "يدعم CSV وTSV والنصوص المفصولة بفواصل أو فاصلة منقوطة أو Tab حتى 5 MB."
              : "Supports CSV, TSV, and delimited text using comma, semicolon, or tab up to 5 MB."}
          </p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
            <FileSpreadsheet className="size-4" />
            {lang === "ar" ? "اختيار ملف" : "Choose file"}
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              className="sr-only"
              onChange={(event) => readFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {fileError ? (
            <p className="mx-auto mt-4 max-w-xl rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
              {fileError}
            </p>
          ) : null}
        </section>
      ) : (
        <div className="space-y-5">
          <FileSummary
            parsed={parsed}
            fileName={fileName}
            fileSize={fileSize}
            lang={lang}
            onReset={reset}
            onDownload={downloadQaReport}
          />

          {parsed.errors.length ? (
            <section className="rounded-3xl bg-warning-soft p-5 text-warning">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5" />
                <h2 className="font-extrabold">
                  {lang === "ar"
                    ? "ملاحظات على تركيب الملف"
                    : "File-structure notes"}
                </h2>
              </div>
              <ul className="mt-3 space-y-1 text-xs leading-5">
                {parsed.errors.slice(0, 20).map((error) => (
                  <li key={error}>• {formatParserError(error, lang)}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <MappingSection
            headers={parsed.headers}
            mapping={mapping}
            lang={lang}
            onChange={(index, role) =>
              setMapping((current) =>
                setImportMappingRole(current, index, role),
              )
            }
          />

          {qa ? (
            <QaSummarySection
              qa={qa}
              typeMatches={typeMatches}
              typeQueryError={Boolean(measurementTypesQuery.error)}
              lang={lang}
            />
          ) : null}

          <PreviewTable
            parsed={parsed}
            mapping={mapping}
            issueRows={issueRows}
            lang={lang}
          />

          {qa?.issues.length ? (
            <IssueList
              issues={qa.issues.slice(0, 30)}
              total={qa.issues.length}
              lang={lang}
            />
          ) : null}

          <section className="glass rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-extrabold">
                  {lang === "ar"
                    ? "لا يوجد استيراد تلقائي بعد"
                    : "No automatic import yet"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {lang === "ar"
                    ? "هذه المرحلة تنتهي عند الفحص والمعاينة. الخطوة التالية ستضيف Mapping معتمدًا وحفظًا صريحًا للصفوف الصالحة فقط مع سجل مصدر لكل Batch."
                    : "This phase stops at QA and preview. The next phase will add approved mapping and explicit saving of valid rows only, with provenance for every batch."}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function FileSummary({
  parsed,
  fileName,
  fileSize,
  lang,
  onReset,
  onDownload,
}: {
  parsed: ParsedCsv;
  fileName: string;
  fileSize: number;
  lang: "ar" | "en";
  onReset: () => void;
  onDownload: () => void;
}) {
  const delimiterLabel =
    parsed.delimiter === "\t"
      ? "Tab"
      : parsed.delimiter === ";"
        ? ";"
        : ",";

  return (
    <section className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <FileSpreadsheet className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-extrabold">{fileName}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatBytes(fileSize)} • {parsed.headers.length}{" "}
            {lang === "ar" ? "أعمدة" : "columns"} • {parsed.rows.length}{" "}
            {lang === "ar" ? "صفوف" : "rows"} • delimiter: {delimiterLabel}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-xl bg-card px-3.5 py-2.5 text-xs font-bold text-primary ring-1 ring-border"
        >
          <Download className="size-4" />
          {lang === "ar" ? "تنزيل تقرير QA" : "Download QA report"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl bg-card px-3.5 py-2.5 text-xs font-bold text-muted-foreground ring-1 ring-border"
        >
          <RefreshCw className="size-4" />
          {lang === "ar" ? "ملف آخر" : "Another file"}
        </button>
      </div>
    </section>
  );
}

function MappingSection({
  headers,
  mapping,
  lang,
  onChange,
}: {
  headers: string[];
  mapping: ImportMapping;
  lang: "ar" | "en";
  onChange: (index: number, role: ImportColumnRole) => void;
}) {
  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center gap-2">
        <Table2 className="size-5 text-primary" />
        <div>
          <h2 className="font-extrabold">
            {lang === "ar" ? "تعيين الأعمدة" : "Column mapping"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {lang === "ar"
              ? "اقبل التعيين التلقائي أو عدله يدويًا. لا يؤدي التعيين إلى حفظ البيانات."
              : "Keep the automatic mapping or adjust it manually. Mapping does not save any data."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {headers.map((header, index) => {
          const role = importMappingRoleForIndex(mapping, index);
          return (
            <label
              key={`${header}-${index}`}
              className="rounded-2xl bg-card p-3 ring-1 ring-border"
            >
              <span className="block truncate text-xs font-extrabold">
                {header || (lang === "ar" ? "عمود بدون اسم" : "Unnamed column")}
              </span>
              <select
                value={role}
                onChange={(event) =>
                  onChange(index, event.target.value as ImportColumnRole)
                }
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
              >
                {roles.map((value) => (
                  <option key={value} value={value}>
                    {roleLabels[value][lang]}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function QaSummarySection({
  qa,
  typeMatches,
  typeQueryError,
  lang,
}: {
  qa: ReturnType<typeof buildImportQaSummary>;
  typeMatches: ReturnType<typeof summarizeMeasurementTypeMatches>;
  typeQueryError: boolean;
  lang: "ar" | "en";
}) {
  const cards = [
    {
      value: qa.totalRows,
      label: lang === "ar" ? "إجمالي الصفوف" : "Total rows",
    },
    {
      value: qa.validRows,
      label: lang === "ar" ? "صفوف بلا أخطاء مكتشفة" : "Rows without detected issues",
    },
    {
      value: qa.rowsWithIssues,
      label: lang === "ar" ? "صفوف تحتاج مراجعة" : "Rows needing review",
    },
    {
      value: qa.duplicateRows,
      label: lang === "ar" ? "صفوف مكررة حرفيًا" : "Exact duplicate rows",
    },
    {
      value: qa.missingCells,
      label: lang === "ar" ? "خلايا فارغة" : "Empty cells",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="glass rounded-2xl p-4 text-center"
          >
            <strong className="text-2xl font-extrabold">{card.value}</strong>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {typeMatches.distinctValues.length ? (
        <div className="glass rounded-3xl p-5">
          <div className="flex items-start gap-3">
            {typeMatches.unrecognizedValues.length ? (
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            )}
            <div className="min-w-0">
              <h2 className="font-extrabold">
                {lang === "ar"
                  ? "مطابقة أنواع القياس"
                  : "Measurement type matching"}
              </h2>
              {typeQueryError ? (
                <p className="mt-1 text-xs text-warning">
                  {lang === "ar"
                    ? "تعذر تحميل كتالوج القياسات للمقارنة، لكن فحص الملف نفسه مستمر."
                    : "The measurement catalog could not be loaded for matching, but local file QA continues."}
                </p>
              ) : (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {lang === "ar"
                    ? `تم التعرف على ${typeMatches.recognizedValues.length} من ${typeMatches.distinctValues.length} قيمة مميزة لنوع القياس.`
                    : `${typeMatches.recognizedValues.length} of ${typeMatches.distinctValues.length} distinct measurement type values matched the app catalog.`}
                </p>
              )}

              {typeMatches.unrecognizedValues.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {typeMatches.unrecognizedValues.slice(0, 20).map((value) => (
                    <span
                      key={value}
                      className="rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold text-warning"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PreviewTable({
  parsed,
  mapping,
  issueRows,
  lang,
}: {
  parsed: ParsedCsv;
  mapping: ImportMapping;
  issueRows: Set<number>;
  lang: "ar" | "en";
}) {
  const previewRows = parsed.rows.slice(0, 12);

  return (
    <section className="glass overflow-hidden rounded-3xl">
      <div className="p-5">
        <h2 className="font-extrabold">
          {lang === "ar" ? "معاينة أول 12 صفًا" : "Preview first 12 rows"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {lang === "ar"
            ? "الأرقام في الهامش هي أرقام الصفوف الأصلية داخل الملف."
            : "Row numbers refer to the original file."}
        </p>
      </div>

      <div className="overflow-x-auto border-t border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-card">
            <tr>
              <th className="px-3 py-3 text-start">#</th>
              {parsed.headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  className="min-w-36 px-3 py-3 text-start"
                >
                  <span className="block font-extrabold">{header || "—"}</span>
                  <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                    {roleLabels[importMappingRoleForIndex(mapping, index)][lang]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {previewRows.map((row, index) => {
              const rowNumber = index + 2;
              return (
                <tr
                  key={rowNumber}
                  className={issueRows.has(rowNumber) ? "bg-warning-soft/40" : ""}
                >
                  <td className="whitespace-nowrap px-3 py-3 font-bold text-muted-foreground">
                    {rowNumber}
                  </td>
                  {parsed.headers.map((_, columnIndex) => (
                    <td
                      key={columnIndex}
                      className="max-w-72 whitespace-pre-wrap break-words px-3 py-3"
                    >
                      {row[columnIndex]?.trim() || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IssueList({
  issues,
  total,
  lang,
}: {
  issues: ReturnType<typeof buildImportQaSummary>["issues"];
  total: number;
  lang: "ar" | "en";
}) {
  return (
    <section className="rounded-3xl bg-warning-soft p-5">
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle className="size-5" />
        <h2 className="font-extrabold">
          {lang === "ar" ? "مشاكل تحتاج مراجعة" : "Issues needing review"}
        </h2>
      </div>
      <div className="mt-3 space-y-2">
        {issues.map((issue, index) => (
          <div
            key={`${issue.rowNumber}-${issue.kind}-${index}`}
            className="rounded-xl bg-background/70 px-3 py-2 text-xs"
          >
            <strong>
              {lang === "ar" ? "الصف" : "Row"} {issue.rowNumber}
            </strong>
            <span className="mx-2 text-muted-foreground">•</span>
            <span>{issue.message}</span>
          </div>
        ))}
      </div>
      {total > issues.length ? (
        <p className="mt-3 text-xs text-warning">
          {lang === "ar"
            ? `يتم عرض أول ${issues.length} مشكلة من ${total}.`
            : `Showing the first ${issues.length} of ${total} issues.`}
        </p>
      ) : null}
    </section>
  );
}

function formatParserError(error: string, lang: "ar" | "en"): string {
  if (error === "EMPTY_FILE") {
    return lang === "ar" ? "الملف فارغ." : "The file is empty.";
  }
  if (error === "SINGLE_COLUMN_FILE") {
    return lang === "ar"
      ? "تم اكتشاف عمود واحد فقط؛ تحقق من نوع الفاصل."
      : "Only one column was detected; check the delimiter.";
  }
  if (error.startsWith("ROW_WIDTH_MISMATCH:")) {
    const [, row, actual, expected] = error.split(":");
    return lang === "ar"
      ? `الصف ${row} يحتوي ${actual} خلايا بدل ${expected}.`
      : `Row ${row} contains ${actual} cells instead of ${expected}.`;
  }
  return error;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeBaseName(value: string): string {
  return (
    value
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "health-data"
  );
}
