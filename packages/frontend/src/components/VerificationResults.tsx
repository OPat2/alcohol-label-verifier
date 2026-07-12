import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Clock, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { VerificationResult, FieldComparison } from '@shared/types';
import { labelService } from '@/services/api';
import toast from 'react-hot-toast';

interface VerificationResultsProps {
  result: VerificationResult;
  onReset: () => void;
}

const STATUS_CONFIG = {
  approved: {
    label: 'Approved',
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: <CheckCircle className="w-7 h-7 text-green-600" />,
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: <AlertCircle className="w-7 h-7 text-red-600" />,
  },
  review_required: {
    label: 'Review Required',
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    icon: <Clock className="w-7 h-7 text-yellow-600" />,
  },
};

const FIELD_LABELS: Record<string, string> = {
  brandName: 'Brand Name',
  classType: 'Class / Type',
  abv: 'Alcohol Content (ABV)',
  netContents: 'Net Contents',
  governmentWarning: 'Government Warning',
  bottlerName: 'Bottler / Producer',
  countryOfOrigin: 'Country of Origin',
};

const VerificationResults: React.FC<VerificationResultsProps> = ({ result, onReset }) => {
  const [expandedField, setExpandedField] = useState<string | null>(
    result.comparisons.find((c) => !c.match)?.field ?? null,
  );
  const cfg = STATUS_CONFIG[result.status];

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-xl border-2 p-6 ${cfg.bg}`}>
        <div className="flex items-start gap-4">
          {cfg.icon}
          <div className="flex-1">
            <h3 className={`text-2xl font-bold ${cfg.text}`}>{cfg.label}</h3>
            <p className={`mt-1 text-sm ${cfg.text} opacity-80`}>
              Overall Confidence: <strong>{result.overallConfidence}%</strong>
              {' • '}Label: <strong>{result.metadata.filename}</strong>
              {result.timings?.totalMs !== undefined && (
                <> • Processed in <strong>{result.timings.totalMs}ms</strong></>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${cfg.text}`}>{result.overallConfidence}%</div>
            <div className={`text-xs ${cfg.text} opacity-60`}>confidence</div>
          </div>
        </div>
      </div>

      {/* Field comparisons */}
      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="text-lg font-bold text-gray-900">Field-by-Field Comparison</h4>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.comparisons.filter((c) => c.match).length} of {result.comparisons.length} fields pass
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {result.comparisons.map((comp) => (
            <FieldRow
              key={comp.field}
              comp={comp}
              expanded={expandedField === comp.field}
              onToggle={() =>
                setExpandedField(expandedField === comp.field ? null : comp.field)
              }
            />
          ))}
        </div>
      </div>

      {/* Timing breakdown */}
      {result.timings && (
        <div className="bg-white rounded-xl shadow p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Processing Timings</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            {result.timings.preprocessMs !== undefined && (
              <Timing label="Image Preprocessing" ms={result.timings.preprocessMs} />
            )}
            {result.timings.ocrMs !== undefined && (
              <Timing label="OCR Extraction" ms={result.timings.ocrMs} />
            )}
            {result.timings.validationMs !== undefined && (
              <Timing label="Validation" ms={result.timings.validationMs} />
            )}
            {result.timings.totalMs !== undefined && (
              <Timing label="Total" ms={result.timings.totalMs} bold />
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition"
        >
          <RefreshCw className="w-5 h-5" />
          Verify Another Label
        </button>
        <button
          onClick={handleDownloadJson}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
        >
          <Download className="w-5 h-5" />
          Download Report (JSON)
        </button>
      </div>
    </div>
  );
};

const FieldRow: React.FC<{
  comp: FieldComparison;
  expanded: boolean;
  onToggle: () => void;
}> = ({ comp, expanded, onToggle }) => {
  const label = FIELD_LABELS[comp.field] || comp.field;
  const { matchType, confidence, match } = comp;

  const badgeColor =
    matchType === 'exact'
      ? 'bg-green-100 text-green-800'
      : matchType === 'normalized'
        ? 'bg-blue-100 text-blue-800'
        : matchType === 'missing'
          ? 'bg-gray-100 text-gray-800'
          : 'bg-red-100 text-red-800';

  const badgeLabel =
    matchType === 'exact'
      ? 'Exact Match'
      : matchType === 'normalized'
        ? 'Normalized Match'
        : matchType === 'missing'
          ? 'Not Found'
          : 'Mismatch';

  const confColor =
    confidence >= 90
      ? 'text-green-700'
      : confidence >= 70
        ? 'text-yellow-700'
        : 'text-red-700';

  return (
    <div className="px-6 py-4">
      <button
        className="w-full text-left"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`Toggle details for ${label}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {match ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <span className="font-semibold text-gray-900">{label}</span>
              <span
                className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}
              >
                {badgeLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-xl font-bold tabular-nums ${confColor}`}>
              {confidence}%
            </span>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 ml-8 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div>
              <span className="text-gray-500 uppercase tracking-wide text-xs font-medium">Application</span>
              <p className="mt-0.5 font-mono text-gray-900 break-all">
                {comp.applicationValue || '—'}
              </p>
            </div>
            <div>
              <span className="text-gray-500 uppercase tracking-wide text-xs font-medium">Label (OCR)</span>
              <p className="mt-0.5 font-mono text-gray-900 break-all">
                {comp.labelValue || '—'}
              </p>
            </div>
          </div>
          {comp.notes && (
            <div
              className={`mt-2 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                match
                  ? 'bg-blue-50 text-blue-800 border border-blue-100'
                  : 'bg-red-50 text-red-800 border border-red-100'
              }`}
            >
              {comp.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Timing: React.FC<{ label: string; ms: number; bold?: boolean }> = ({
  label,
  ms,
  bold,
}) => (
  <div className={`flex gap-1.5 ${bold ? 'font-semibold' : ''}`}>
    <span className="text-gray-500">{label}:</span>
    <span className="text-gray-900">{ms}ms</span>
  </div>
);

export default VerificationResults;
