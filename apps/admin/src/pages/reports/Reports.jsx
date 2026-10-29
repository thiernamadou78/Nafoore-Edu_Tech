import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Mail } from "lucide-react";
import { api } from "../../lib/api";
import { formatDate, formatDateTime } from "../../lib/format";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { formatHours } from "../attendance/PointagesJournal";

const KINDS = [
  { key: "weekly", label: "Hebdomadaire" },
  { key: "monthly", label: "Mensuel" },
  { key: "custom", label: "Intervalle" },
];

const HALF_DAY = 12 * 3_600_000;

// AAAA-MM-JJ local d'un instant (sert d'ancre de periode a l'API).
function isoDay(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Ecart avec la periode precedente. lowerIsBetter : annulations, oublis...
function Delta({ value, previous, unit = "", lowerIsBetter = false }) {
  if (value === null || previous === null)
    return <span className="text-gray-400">—</span>;
  const diff = Math.round((value - previous) * 10) / 10;
  if (diff === 0) return <span className="text-gray-400">= stable</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <span className={good ? "text-green-700" : "text-red-700"}>
      {diff > 0 ? "▲ +" : "▼ "}
      {diff}
      {unit}
    </span>
  );
}

function Kpi({ value, label, delta }) {
  return (
    <Card className="p-4">
      <p className="text-xl font-bold tabular-nums text-navy">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
      <p className="mt-1.5 text-xs font-medium">{delta}</p>
    </Card>
  );
}

function Section({ title, children }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 font-semibold text-gray-900">{title}</h2>
      {children}
    </Card>
  );
}

function Facts({ rows }) {
  return (
    <dl className="divide-y divide-gray-100 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-4 py-1.5"
        >
          <dt className="text-gray-600">{label}</dt>
          <dd className="font-semibold tabular-nums text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SubList({ title, items, empty, render, tone = "text-gray-900" }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className={`mb-1.5 text-sm font-medium ${tone}`}>{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <ul className="space-y-1 text-sm text-gray-700">{items.map(render)}</ul>
      )}
    </div>
  );
}

// Tableau "nom / seances / heures" (enseignants ou familles).
function HoursTable({ rows, linkTo, empty }) {
  if (rows.length === 0)
    return <p className="text-sm text-gray-400">{empty}</p>;
  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white text-left text-xs text-gray-500">
          <tr>
            <th className="py-1.5 font-medium">Nom</th>
            <th className="py-1.5 text-right font-medium">Séances</th>
            <th className="py-1.5 text-right font-medium">Heures</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-1.5">
                {linkTo ? (
                  <Link to={linkTo(r)} className="text-navy hover:underline">
                    {r.name}
                  </Link>
                ) : (
                  r.name
                )}
              </td>
              <td className="py-1.5 text-right tabular-nums">{r.sessions}</td>
              <td className="py-1.5 text-right tabular-nums">
                {formatHours(r.minutes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const pctOrDash = (value) => (value === null ? "—" : `${value} %`);
const hours = (minutes) =>
  minutes === null ? null : Math.round(minutes / 6) / 10;

// Rapport d'activite (meme contenu que l'email du lundi / du 1er du mois),
// consultable sur n'importe quelle semaine ou mois passe.
export function Reports() {
  const [kind, setKind] = useState("weekly");
  const [anchor, setAnchor] = useState(null);
  // Intervalle libre : par defaut, du 1er du mois a aujourd'hui.
  const [range, setRange] = useState(() => {
    const today = new Date();
    return {
      from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: isoDay(today),
    };
  });
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (kind === "custom" && (!range.from || !range.to)) return undefined;
    setLoading(true);
    const query = periodQuery();
    api
      .get(`/admin/reports?${query}`)
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setError(null);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, anchor, range]);

  function periodQuery(current) {
    if (kind === "custom")
      return `kind=custom&from=${range.from}&to=${range.to}`;
    if (current)
      return `kind=${kind}&date=${isoDay(new Date(current.start).getTime() + HALF_DAY)}`;
    return `kind=${kind}${anchor ? `&date=${anchor}` : ""}`;
  }

  const changeKind = (value) => {
    setKind(value);
    setAnchor(null);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { csv } = await api.get(
        `/admin/reports/csv?${periodQuery(report)}`,
      );
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `nafoore-heures-${isoDay(report.start)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold text-gray-900">
        Rapports d’activité
      </h1>
      <div
        className="inline-flex rounded-full bg-gray-100 p-1 text-xs"
        role="group"
        aria-label="Type de rapport"
      >
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            aria-pressed={kind === k.key}
            onClick={() => changeKind(k.key)}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              kind === k.key
                ? "bg-white text-navy shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (error && !report) {
    return (
      <div>
        {header}
        <Alert>{error}</Alert>
      </div>
    );
  }
  if (!report) {
    return (
      <div>
        {header}
        <p className="text-gray-500">Chargement…</p>
      </div>
    );
  }

  const {
    kpis,
    activity,
    quality,
    teachers,
    families,
    recruitment,
    reviews,
    progression,
  } = report;
  const isFuture = new Date(report.end) > new Date();
  const isCustom = report.kind === "custom";
  const vs = {
    weekly: "la semaine précédente",
    monthly: "le mois précédent",
    custom: "la période de même durée juste avant",
  }[report.kind];

  return (
    <div
      className={
        loading ? "opacity-60 transition-opacity" : "transition-opacity"
      }
    >
      {header}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {isCustom ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-gray-500">
              Du
              <input
                type="date"
                value={range.from}
                max={range.to || undefined}
                onChange={(e) =>
                  setRange((r) => ({ ...r, from: e.target.value }))
                }
                className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
              />
            </label>
            <label className="text-xs text-gray-500">
              Au
              <input
                type="date"
                value={range.to}
                min={range.from || undefined}
                onChange={(e) =>
                  setRange((r) => ({ ...r, to: e.target.value }))
                }
                className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
              />
            </label>
            <p className="pb-1.5 text-xs text-gray-500">
              Comparé à {vs} ({report.previousLabel})
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Période précédente"
              onClick={() =>
                setAnchor(isoDay(new Date(report.start).getTime() - HALF_DAY))
              }
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <p className="font-semibold text-navy">{report.label}</p>
              <p className="text-xs text-gray-500">
                Comparé à {vs} ({report.previousLabel})
                {isFuture && " · période en cours, chiffres provisoires"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Période suivante"
              disabled={isFuture}
              onClick={() =>
                setAnchor(isoDay(new Date(report.end).getTime() + HALF_DAY))
              }
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {report.sentAt && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Mail size={13} />
              Envoyé par email le {formatDateTime(report.sentAt)}
            </span>
          )}
          <Button
            variant="secondary"
            icon={Download}
            loading={exporting}
            onClick={exportCsv}
          >
            Heures (CSV)
          </Button>
        </div>
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          value={formatHours(kpis.minutes.value)}
          label="Heures pointées"
          delta={
            <Delta
              value={hours(kpis.minutes.value)}
              previous={hours(kpis.minutes.previous)}
              unit=" h"
            />
          }
        />
        <Kpi
          value={kpis.done.value}
          label="Séances réalisées"
          delta={<Delta {...kpis.done} />}
        />
        <Kpi
          value={pctOrDash(kpis.pointingRate.value)}
          label="Taux de pointage"
          delta={<Delta {...kpis.pointingRate} unit=" pts" />}
        />
        <Kpi
          value={kpis.cancelled.value}
          label="Annulations"
          delta={<Delta {...kpis.cancelled} lowerIsBetter />}
        />
        <Kpi
          value={kpis.missingReports.value}
          label="Comptes-rendus manquants"
          delta={<Delta {...kpis.missingReports} lowerIsBetter />}
        />
        <Kpi
          value={kpis.newStudents.value}
          label="Nouveaux élèves"
          delta={<Delta {...kpis.newStudents} />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Activité">
          <Facts
            rows={[
              ["Séances prévues", activity.planned],
              ["Séances réalisées (pointées)", activity.done],
              [
                `Annulations (dont tardives, moins de ${report.lateChangeHours} h avant)`,
                `${activity.cancelled} (${activity.lateCancelled})`,
              ],
              ["Séances décalées", activity.postponed],
              ["Séances non données", activity.notHeld],
              ["Heures pointées", formatHours(activity.minutes)],
            ]}
          />
        </Section>

        <Section title="Qualité du suivi">
          <Facts
            rows={[
              ["Taux de pointage", pctOrDash(quality.pointingRate)],
              ["Séances jamais pointées", quality.neverPointed],
              ["Départs non pointés", quality.openCheckouts],
              ["Part des scans QR", pctOrDash(quality.qrShare)],
              [
                `Arrivées en retard (+ de ${report.lateThresholdMinutes} min)`,
                quality.late,
              ],
              ["Comptes-rendus manquants", quality.missingReports],
              [
                "Délai moyen de rédaction du compte-rendu",
                quality.avgReportDelayHours === null
                  ? "—"
                  : `${quality.avgReportDelayHours} h`,
              ],
            ]}
          />
          <Link
            to="/pointages"
            className="mt-3 inline-block text-xs font-medium text-navy hover:underline"
          >
            Ouvrir le suivi des pointages →
          </Link>
        </Section>

        <Section title="Enseignants">
          <SubList
            title="À surveiller"
            tone="text-amber-700"
            items={teachers.watch}
            empty="Aucun point de vigilance."
            render={(t) => (
              <li key={t.id}>
                <Link
                  to={`/enseignants/${t.id}`}
                  className="font-medium text-navy hover:underline"
                >
                  {t.name}
                </Link>{" "}
                — {t.reasons.join(", ")}
              </li>
            )}
          />
          <div className="mt-4">
            <p className="mb-1.5 text-sm font-medium text-gray-900">
              Heures par enseignant
            </p>
            <HoursTable
              rows={teachers.all.filter((t) => t.sessions > 0)}
              linkTo={(t) => `/enseignants/${t.id}`}
              empty="Aucune séance pointée sur la période."
            />
          </div>
        </Section>

        <Section title="Familles">
          <p className="mb-1.5 text-sm font-medium text-gray-900">
            Heures consommées par famille
          </p>
          <HoursTable
            rows={families.all}
            empty="Aucune heure consommée sur la période."
          />
        </Section>

        <Section title="Élèves">
          <SubList
            title="Nouveaux élèves"
            items={families.newStudents}
            empty="Aucun nouvel élève."
            render={(s) => (
              <li key={s.id}>
                <Link
                  to={`/eleves/${s.id}`}
                  className="text-navy hover:underline"
                >
                  {s.name}
                </Link>
              </li>
            )}
          />
          <SubList
            title="Accompagnements à renouveler (fin dans les 14 jours)"
            items={families.renewalsDue}
            empty="Aucun accompagnement ne se termine prochainement."
            render={(r) => (
              <li key={`${r.studentId}-${r.teacherName}-${r.subject}`}>
                <Link
                  to={`/eleves/${r.studentId}`}
                  className="font-medium text-navy hover:underline"
                >
                  {r.studentName}
                </Link>{" "}
                avec {r.teacherName}
                {r.subject ? ` (${r.subject})` : ""} — fin le{" "}
                {formatDate(r.endsAt)}
              </li>
            )}
          />
          <SubList
            title="Élèves sans séance depuis 2 semaines"
            tone="text-amber-700"
            items={families.inactive}
            empty="Tous les élèves suivis ont eu une séance récemment."
            render={(s) => (
              <li key={s.id}>
                <Link
                  to={`/eleves/${s.id}`}
                  className="font-medium text-navy hover:underline"
                >
                  {s.name}
                </Link>{" "}
                —{" "}
                {s.lastSession
                  ? `dernière séance le ${formatDate(s.lastSession)}`
                  : "aucune séance"}
              </li>
            )}
          />
        </Section>

        <Section title="Progression des élèves">
          <SubList
            title="En progression"
            tone="text-green-700"
            items={progression.up}
            empty="Aucune nouvelle note en hausse."
            render={(p) => (
              <li key={`${p.studentId}-${p.subject}`}>
                <Link
                  to={`/eleves/${p.studentId}`}
                  className="font-medium text-navy hover:underline"
                >
                  {p.studentName}
                </Link>{" "}
                — {p.subject} : {p.baseline} → {p.latest} /20 (+{p.delta})
              </li>
            )}
          />
          <SubList
            title="En baisse"
            tone="text-red-700"
            items={progression.down}
            empty="Aucune note en baisse."
            render={(p) => (
              <li key={`${p.studentId}-${p.subject}`}>
                <Link
                  to={`/eleves/${p.studentId}`}
                  className="font-medium text-navy hover:underline"
                >
                  {p.studentName}
                </Link>{" "}
                — {p.subject} : {p.baseline} → {p.latest} /20 ({p.delta})
              </li>
            )}
          />
          <p className="mt-3 text-xs text-gray-400">
            Moyenne des notes de suivi de la période comparée aux notes de
            départ (écart d’au moins 1 point).
          </p>
        </Section>

        <Section title="Demandes et recrutement">
          <Facts
            rows={[
              ["Nouvelles demandes de familles (leads)", recruitment.newLeads],
              [
                "Nouvelles candidatures enseignants",
                recruitment.newApplications,
              ],
              [
                "Dossiers complétés à valider (aujourd’hui)",
                recruitment.dossiersToValidate,
              ],
            ]}
          />
          <SubList
            title="Demandes de professeur en attente depuis plus de 7 jours"
            tone="text-amber-700"
            items={recruitment.pendingRequests}
            empty="Aucune demande en souffrance."
            render={(r) => (
              <li key={r.id}>
                <Link
                  to={`/demandes-professeur/${r.id}`}
                  className="font-medium text-navy hover:underline"
                >
                  {r.studentName}
                </Link>{" "}
                — {r.subject} ({r.days} jours)
              </li>
            )}
          />
        </Section>

        <Section title="Avis des familles">
          <Facts
            rows={[
              ["Avis reçus", reviews.count],
              [
                "Note moyenne",
                reviews.average === null ? "—" : `${reviews.average} / 5`,
              ],
              [
                "Note moyenne (période précédente)",
                reviews.previousAverage === null
                  ? "—"
                  : `${reviews.previousAverage} / 5`,
              ],
            ]}
          />
          <SubList
            title="Avis de 2/5 ou moins"
            tone="text-red-700"
            items={reviews.low}
            empty="Aucun avis négatif."
            render={(r, i) => (
              <li key={i}>
                <span className="font-medium">{r.teacherName}</span> —{" "}
                {r.rating}/5 par la famille de {r.studentName}
                {r.comment ? ` : « ${r.comment} »` : ""}
              </li>
            )}
          />
        </Section>
      </div>

      <p className="mt-5 text-xs text-gray-400">
        Les renouvellements, élèves sans séance, dossiers à valider et demandes
        en attente reflètent la situation d’aujourd’hui. Rapport envoyé
        automatiquement à education@nafoore.com chaque lundi (semaine écoulée)
        et le 1er du mois (mois écoulé, avec le CSV des heures), à 7 h.
      </p>
    </div>
  );
}
