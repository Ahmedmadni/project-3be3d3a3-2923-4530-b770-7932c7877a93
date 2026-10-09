import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  LockKeyhole,
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
import { useAuth } from "@/hooks/use-auth";
import {
  buildImportQaSummary,
  buildMeasurementImportPlan,
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileSha256, setFileSha256] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [importConfirmed, setImportConfirmed] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const measurementTypesQuery = useQuery({
    queryKey: ["data-import-measurement-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_types")
        .select("id,code,name_ar,name_en,value_kind,canonical_unit,allowed_units")
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

  const importPlan = useMemo(
    () =>
      parsed
        ? buildMeasurementImportPlan(
            parsed.rows,
            mapping,
            (measurementTypesQuery.data ?? []).map((type) => ({
              ...type,
              value_kind: type.value_kind as "scalar" | "compound",
            })),
          )
        : { rows: [], skipped: [] },
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
    setFileSha256("");
    setFileError(null);
    setImportConfirmed(false);
    setImportResult(null);
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
      const [text, sha256] = await Promise.all([
        file.text(),
        sha256File(file),
      ]);
      const nextParsed = parseCsv(text);
      setParsed(nextParsed);
      setMapping(inferImportMapping(nextParsed.headers));
      setFileName(file.name);
      setFileSize(file.size);
      setFileSha256(sha256);
    } catch {
      setFileError(
        lang === "ar"
          ? "تعذر قراءة الملف محليًا."
          : "The file could not be read locally.",
      );
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("LOGIN_REQUIRED");
      if (!parsed || !qa) throw new Error("IMPORT_NOT_READY");
      if (!importPlan.rows.length) throw new Error("NO_VALID_ROWS");
      if (!importConfirmed) throw new Error("CONFIRM_REQUIRED");

      const { data, error } = await supabase.rpc(
        "import_measurement_reading_batch",
        {
          p_original_filename: fileName,
          p_file_size_bytes: fileSize,
          p_file_sha256: fileSha256,
          p_source_row_count: parsed.rows.length,
          p_mapping: JSON.parse(JSON.stringify(mapping)),
          p_qa_summary: JSON.parse(
            JSON.stringify({
              ...qa,
              parserErrors: parsed.errors,
              plannerSkippedRows: importPlan.skipped.length,
            }),
          ),
          p_rows: JSON.parse(JSON.stringify(importPlan.rows)),
        },
      );

      if (error) throw error;
      return parseImportResult(data);
    },
    onSuccess: async (result) => {
      setImportResult(result);
      setImportConfirmed(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["measurement-readings", user?.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["journal-measurements", user?.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["health-summary-measurements", user?.id],
        }),
      ]);
    },
  });

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
            ? "هذه الأداة تفحص بنية البيانات وجودتها ولا تعتبر الملف دليلًا سريريًا ولا تستنتج تشخيصًا أو علاجًا. لا يتم الحفظ إلا بعد مراجعتك الصريحة، وللصفوف التي اجتازت قواعد الاستيراد فقط."
            : "This tool checks data structure and quality and does not treat the file as clinical evidence or infer diagnosis or treatment. Saving happens only after your explicit review, and only for rows that pass import rules."
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
                ? "الملف نفسه يبقى في جهازك"
                : "The file stays on your device"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {lang === "ar"
                ? "الملف الخام لا يُرفع. تتم القراءة والفحص محليًا، وبعد تأكيدك فقط تُرسل الصفوف المقبولة كبيانات منظمة للحفظ في حسابك."
                : "The raw file is never uploaded. Reading and QA happen locally; only after confirmation are accepted rows sent as structured data to your account."}
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

          <ImportCommitSection
            lang={lang}
            userSignedIn={Boolean(user)}
            plan={importPlan}
            confirmed={importConfirmed}
            setConfirmed={setImportConfirmed}
            importing={importMutation.isPending}
            error={importMutation.error}
            result={importResult}
            onImport={() => importMutation.mutate()}
          />
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

type ImportResult = {
  batchId: string;
  importedCount: number;
  skippedCount: number;
};

function ImportCommitSection({
  lang,
  userSignedIn,
  plan,
  confirmed,
  setConfirmed,
  importing,
  error,
  result,
  onImport,
}: {
  lang: "ar" | "en";
  userSignedIn: boolean;
  plan: ReturnType<typeof buildMeasurementImportPlan>;
  confirmed: boolean;
  setConfirmed: (value: boolean) => void;
  importing: boolean;
  error: Error | null;
  result: ImportResult | null;
  onImport: () => void;
}) {
  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Database className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold">
            {lang === "ar" ? "حفظ الصفوف المقبولة" : "Save accepted rows"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {lang === "ar"
              ? "لن تُحفظ الصفوف المكررة أو غير المعروفة أو ذات التاريخ/القيمة/الوحدة غير الصالحة. كل قراءة مستوردة تُحفظ بجودة غير مقيّمة وبمرجع للـBatch والصف الأصلي."
              : "Duplicate, unknown, or invalid date/value/unit rows are not saved. Every imported reading is stored as quality-unassessed with batch and original-row provenance."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-2xl bg-success-soft p-3 text-center text-success">
              <strong className="text-xl">{plan.rows.length}</strong>
              <p className="mt-1 text-[10px] font-bold">
                {lang === "ar" ? "جاهزة للحفظ" : "Ready to save"}
              </p>
            </div>
            <div className="rounded-2xl bg-warning-soft p-3 text-center text-warning">
              <strong className="text-xl">{plan.skipped.length}</strong>
              <p className="mt-1 text-[10px] font-bold">
                {lang === "ar" ? "سيتم تخطيها" : "Will be skipped"}
              </p>
            </div>
          </div>

          {plan.skipped.length ? (
            <details className="mt-4 rounded-2xl bg-card p-3 ring-1 ring-border">
              <summary className="cursor-pointer text-xs font-extrabold">
                {lang === "ar"
                  ? "لماذا سيتم تخطي بعض الصفوف؟"
                  : "Why will some rows be skipped?"}
              </summary>
              <div className="mt-3 space-y-2">
                {plan.skipped.slice(0, 20).map((item) => (
                  <div key={item.rowNumber} className="text-xs text-muted-foreground">
                    <strong>
                      {lang === "ar" ? "الصف" : "Row"} {item.rowNumber}
                    </strong>
                    {" — "}
                    {item.reasons.map((reason) => importReasonLabel(reason, lang)).join("، ")}
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {!userSignedIn ? (
            <div className="mt-4 rounded-2xl bg-primary-soft/60 p-4">
              <p className="text-xs leading-5 text-muted-foreground">
                {lang === "ar"
                  ? "الفحص المحلي متاح بدون حساب، لكن حفظ القياسات يحتاج تسجيل الدخول."
                  : "Local QA works without an account, but saving measurements requires sign-in."}
              </p>
              <Link
                to="/auth"
                search={{ redirect: "/data-import" }}
                className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                {lang === "ar" ? "تسجيل الدخول للحفظ" : "Sign in to save"}
              </Link>
            </div>
          ) : (
            <>
              <label className="mt-4 flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs leading-5 text-muted-foreground">
                  {lang === "ar"
                    ? "راجعت تعيين الأعمدة والمعاينة، وأوافق على حفظ الصفوف المقبولة فقط في سجل قياساتي."
                    : "I reviewed the column mapping and preview, and approve saving only the accepted rows to my measurement history."}
                </span>
              </label>

              <button
                type="button"
                disabled={!confirmed || importing || plan.rows.length === 0}
                onClick={onImport}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-45"
              >
                <LockKeyhole className="size-4" />
                {importing
                  ? lang === "ar"
                    ? "جارٍ الحفظ..."
                    : "Saving..."
                  : lang === "ar"
                    ? `حفظ ${plan.rows.length} قراءة`
                    : `Save ${plan.rows.length} readings`}
              </button>
            </>
          )}

          {error ? (
            <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
              {formatImportError(error, lang)}
            </p>
          ) : null}

          {result ? (
            <div className="mt-4 rounded-2xl bg-success-soft p-4 text-success">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5" />
                <strong>
                  {lang === "ar" ? "تم الاستيراد بنجاح" : "Import completed"}
                </strong>
              </div>
              <p className="mt-1 text-xs">
                {lang === "ar"
                  ? `تم حفظ ${result.importedCount} قراءة وتخطي ${result.skippedCount} صف. Batch: ${result.batchId}`
                  : `Saved ${result.importedCount} readings and skipped ${result.skippedCount} rows. Batch: ${result.batchId}`}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function parseImportResult(value: unknown): ImportResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("INVALID_IMPORT_RESPONSE");
  }

  const record = value as Record<string, unknown>;
  const batchId = record.batch_id;
  const importedCount = record.imported_count;
  const skippedCount = record.skipped_count;

  if (
    typeof batchId !== "string" ||
    typeof importedCount !== "number" ||
    typeof skippedCount !== "number"
  ) {
    throw new Error("INVALID_IMPORT_RESPONSE");
  }

  return {
    batchId,
    importedCount,
    skippedCount,
  };
}

function formatImportError(error: Error, lang: "ar" | "en"): string {
  const message = error.message || "";

  if (
    message.includes("Could not find the function") ||
    message.includes("import_measurement_reading_batch")
  ) {
    return lang === "ar"
      ? "بنية حفظ الاستيراد لم تُطبّق في قاعدة البيانات بعد."
      : "The import persistence database foundation has not been deployed yet.";
  }

  return lang === "ar"
    ? "تعذر حفظ الـBatch. لم يتم اعتماد استيراد جزئي؛ راجع الملف والتعيين ثم أعد المحاولة."
    : "The batch could not be saved. No partial import was accepted; review the file and mapping, then try again.";
}

function importReasonLabel(reason: string, lang: "ar" | "en"): string {
  const labels: Record<string, { ar: string; en: string }> = {
    duplicate_row: { ar: "صف مكرر", en: "duplicate row" },
    measurement_type_missing: { ar: "نوع القياس مفقود", en: "measurement type missing" },
    measurement_type_unknown: { ar: "نوع القياس غير معروف", en: "unknown measurement type" },
    measured_at_missing: { ar: "التاريخ مفقود", en: "date/time missing" },
    measured_at_invalid_or_ambiguous: { ar: "تاريخ غير صالح أو ملتبس", en: "invalid or ambiguous date/time" },
    unit_not_supported: { ar: "وحدة غير مدعومة", en: "unsupported unit" },
    value_missing: { ar: "القيمة مفقودة", en: "value missing" },
    value_invalid: { ar: "القيمة غير رقمية", en: "invalid numeric value" },
    systolic_missing: { ar: "الانقباضي مفقود", en: "systolic missing" },
    systolic_invalid: { ar: "الانقباضي غير رقمي", en: "invalid systolic" },
    diastolic_missing: { ar: "الانبساطي مفقود", en: "diastolic missing" },
    diastolic_invalid: { ar: "الانبساطي غير رقمي", en: "invalid diastolic" },
    compound_type_not_supported_for_csv: {
      ar: "نوع مركب غير مدعوم بهذا الاستيراد",
      en: "compound type not supported by this importer",
    },
  };

  return labels[reason]?.[lang] ?? reason;
}

async function sha256File(file: File): Promise<string> {
  if (!globalThis.crypto?.subtle) return "";

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
