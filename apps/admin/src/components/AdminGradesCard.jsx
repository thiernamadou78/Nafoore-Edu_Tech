import { useEffect, useState } from "react";
import { LineChart, Pencil, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import { Alert } from "./ui/Alert";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy";

const KIND_LABELS = { depart: "Initiale", suivi: "Évaluation" };
const BASELINE_LABEL = "Note initiale";
const LABEL_PLACEHOLDER = "Ex : Évaluation 1, Note 1";

const today = () => new Date().toISOString().slice(0, 10);

function formatMonth(month) {
  const [year, m] = month.split("-");
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

// Saisie des notes par l'equipe Nafoore (bulletin transmis par la famille,
// aide a un prof...). Meme formulaire que dans l'app enseignant ; l'equipe
// peut aussi corriger ou supprimer une note saisie par le prof.
function GradeRow({ studentId, grade, canEdit, onSaved, onRemove, onError }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);

  const startEdit = () => {
    setDraft({
      kind: grade.kind,
      label: grade.label ?? "",
      value: String(grade.value).replace(".", ","),
      scale: grade.scale,
      evaluatedAt: new Date(grade.evaluatedAt).toISOString().slice(0, 10),
      comment: grade.comment ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    onError(null);
    try {
      await api.patch(`/students/${studentId}/grades/${grade.id}`, {
        kind: draft.kind,
        label: draft.label.trim(),
        value: Number(draft.value.toString().replace(",", ".")),
        scale: Number(draft.scale),
        evaluatedAt: draft.evaluatedAt,
        comment: draft.comment.trim(),
      });
      setEditing(false);
      await onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    const set = (key) => (e) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }));
    return (
      <li className="space-y-2 py-2 text-xs">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={draft.label}
            onChange={set("label")}
            maxLength={80}
            placeholder={`Dénomination * (${LABEL_PLACEHOLDER})`}
            className={inputClass}
          />
          <select
            value={draft.kind}
            onChange={set("kind")}
            className={inputClass}
          >
            <option value="depart">Note initiale (avant le prof)</option>
            <option value="suivi">Évaluation (avec le prof)</option>
          </select>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_1fr] items-center gap-2">
          <input
            inputMode="decimal"
            value={draft.value}
            onChange={set("value")}
            className={inputClass}
          />
          <span className="text-gray-500">sur</span>
          <select
            value={draft.scale}
            onChange={set("scale")}
            className={inputClass}
          >
            {[20, 10, 40, 100].map((scale) => (
              <option key={scale} value={scale}>
                {scale}
              </option>
            ))}
          </select>
          <input
            type="date"
            max={today()}
            value={draft.evaluatedAt}
            onChange={set("evaluatedAt")}
            className={inputClass}
          />
        </div>
        <input
          value={draft.comment}
          onChange={set("comment")}
          maxLength={300}
          placeholder="Commentaire (facultatif)"
          className={inputClass}
        />
        <div className="flex gap-2">
          <Button
            loading={saving}
            disabled={!draft.label.trim() || draft.value === ""}
            onClick={save}
          >
            Enregistrer
          </Button>
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Annuler
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <span className="text-gray-700">
        <Badge tone={grade.kind === "depart" ? "amber" : "blue"}>
          {KIND_LABELS[grade.kind]}
        </Badge>{" "}
        {grade.label && (
          <span className="font-medium text-gray-900">{grade.label} · </span>
        )}
        <span className="font-medium">
          {grade.value}/{grade.scale}
        </span>{" "}
        · {formatDate(grade.evaluatedAt)}
        {grade.comment ? ` · ${grade.comment}` : ""}
        <span className="text-gray-400">
          {" "}
          ·{" "}
          {grade.enteredByTeam
            ? "saisie par l’équipe"
            : grade.teacherName
              ? `par ${grade.teacherName}`
              : ""}
        </span>
      </span>
      {canEdit && (
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={startEdit}
            aria-label="Modifier la note"
            className="text-gray-400 hover:text-navy"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(grade.id)}
            aria-label="Supprimer la note"
            className="text-gray-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </span>
      )}
    </li>
  );
}

export function AdminGradesCard({ studentId, subjects, canEdit, onChanged }) {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    kind: "depart",
    label: BASELINE_LABEL,
    value: "",
    scale: 20,
    evaluatedAt: today(),
    comment: "",
  });

  const load = () =>
    api
      .get(`/students/${studentId}/progress`)
      .then(setProgress)
      .catch((err) => setError(err.message));

  // Apres un ajout / une correction : liste et carte Progression a jour.
  const reload = async () => {
    await load();
    onChanged?.();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/students/${studentId}/grades`, {
        subject: form.subject,
        kind: form.kind,
        label: form.label.trim(),
        value: Number(form.value.toString().replace(",", ".")),
        scale: Number(form.scale),
        evaluatedAt: form.evaluatedAt,
        comment: form.comment || undefined,
      });
      setForm((f) => ({
        ...f,
        value: "",
        comment: "",
        label: f.kind === "depart" ? BASELINE_LABEL : "",
      }));
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeGrade = async (gradeId) => {
    if (!window.confirm("Supprimer cette note ?")) return;
    setError(null);
    try {
      await api.del(`/students/${studentId}/grades/${gradeId}`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const withBaseline = new Set(
    (progress?.subjects ?? [])
      .filter((s) => s.baselineAverage !== null)
      .map((s) => s.subject),
  );
  const missingBaseline = subjects.filter((s) => !withBaseline.has(s));

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
        <LineChart size={16} className="text-gold-500" />
        Notes de l'élève
      </h2>
      <p className="mb-4 text-xs text-gray-500">
        Notes saisies par l'enseignant ou par l'équipe (bulletin transmis par la
        famille, relevé Pronote...). La progression compare la note initiale à
        la moyenne du dernier mois. Les notes saisies ici apparaissent « saisie
        par l'équipe » pour l'enseignant et la famille.
      </p>

      {error && <Alert className="mb-3">{error}</Alert>}

      {missingBaseline.length > 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Note initiale manquante : {missingBaseline.join(", ")}. Elle sert de
          point de départ à la progression de l'élève.
        </p>
      )}

      {progress && progress.overall && (
        <p className="mb-4 text-sm text-gray-700">
          Moyenne générale : {progress.overall.baselineAverage} →{" "}
          {progress.overall.latestAverage}/20{" "}
          <Badge tone={progress.overall.delta >= 0 ? "green" : "red"}>
            {progress.overall.delta >= 0 ? "+" : ""}
            {progress.overall.delta}
          </Badge>
        </p>
      )}

      {progress?.subjects.map((subject) => (
        <div
          key={subject.subject}
          className="mb-4 rounded-lg border border-gray-100"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <p className="text-sm font-semibold text-gray-800">
              {subject.subject}
            </p>
            <p className="text-xs text-gray-600">
              {subject.baselineAverage !== null
                ? `Initiale ${subject.baselineAverage}`
                : "Pas de note initiale"}
              {subject.latestAverage !== null &&
                ` → ${subject.latestAverage}/20`}
              {subject.delta !== null && (
                <span
                  className={`ml-2 font-bold ${subject.delta >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {subject.delta >= 0 ? "↑" : "↓"}
                  {Math.abs(subject.delta)}
                </span>
              )}
            </p>
          </div>
          {subject.months.length > 0 && (
            <p className="px-3 pt-2 text-[11px] text-gray-500">
              {subject.months
                .map((m) => `${formatMonth(m.month)} : ${m.average}/20`)
                .join(" · ")}
            </p>
          )}
          <ul className="divide-y divide-gray-100 px-3 py-1">
            {subject.grades.map((grade) => (
              <GradeRow
                key={grade.id}
                studentId={studentId}
                grade={grade}
                canEdit={canEdit}
                onSaved={reload}
                onRemove={removeGrade}
                onError={setError}
              />
            ))}
          </ul>
        </div>
      ))}

      {progress && progress.subjects.length === 0 && (
        <p className="mb-4 text-sm text-gray-500">
          Aucune note pour l'instant.
        </p>
      )}

      {canEdit && (
        <form
          onSubmit={handleSubmit}
          className="space-y-2 rounded-lg bg-gray-50 p-3"
        >
          <p className="text-xs font-semibold text-gray-600">
            Ajouter une note
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              required
              value={form.subject}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">Matière…</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <select
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value;
                setForm((f) => ({
                  ...f,
                  kind,
                  // "Note initiale" proposee d'office pour une note de depart.
                  label:
                    kind === "depart" && !f.label.trim()
                      ? BASELINE_LABEL
                      : kind === "suivi" && f.label === BASELINE_LABEL
                        ? ""
                        : f.label,
                }));
              }}
              className={inputClass}
            >
              <option value="depart">
                Note initiale (avant l'accompagnement)
              </option>
              <option value="suivi">
                Évaluation (pendant l'accompagnement)
              </option>
            </select>
          </div>
          <input
            required
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            maxLength={80}
            placeholder={`Dénomination * (${LABEL_PLACEHOLDER})`}
            className={inputClass}
          />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input
              required
              inputMode="decimal"
              value={form.value}
              onChange={(e) =>
                setForm((f) => ({ ...f, value: e.target.value }))
              }
              placeholder="Note"
              className={inputClass}
            />
            <span className="text-sm text-gray-500">sur</span>
            <select
              value={form.scale}
              onChange={(e) =>
                setForm((f) => ({ ...f, scale: Number(e.target.value) }))
              }
              className={inputClass}
            >
              {[20, 10, 40, 100].map((scale) => (
                <option key={scale} value={scale}>
                  {scale}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              required
              type="date"
              max={today()}
              value={form.evaluatedAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, evaluatedAt: e.target.value }))
              }
              className={inputClass}
            />
            <input
              value={form.comment}
              onChange={(e) =>
                setForm((f) => ({ ...f, comment: e.target.value }))
              }
              maxLength={300}
              placeholder="Commentaire (facultatif)"
              className={inputClass}
            />
          </div>
          <Button type="submit" loading={saving}>
            Enregistrer la note
          </Button>
        </form>
      )}
    </Card>
  );
}
