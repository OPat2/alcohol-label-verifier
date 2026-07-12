import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Layers, AlertCircle, Loader2, CheckCircle, XCircle, Clock, Download, RefreshCw, FileText, X } from 'lucide-react';
import type { ApplicationData } from '@shared/types';
import { batchService } from '@/services/api';
import toast from 'react-hot-toast';
import type { VerificationResult } from '@shared/types';

interface BatchResultState {
  batchId: string;
  status: string;
  summary: {
    total: number;
    approved: number;
    rejected: number;
    reviewRequired: number;
    failed: number;
    averageConfidence: number;
    totalProcessingMs: number;
  };
  results: VerificationResult[];
  errors: Array<{ index: number; filename: string; error: string }>;
}

const TEMPLATE_APP_DATA: ApplicationData = {
  applicationId: 'app-001',
  brandName: 'Old Tom Distillery',
  classType: 'Kentucky Straight Bourbon Whiskey',
  abv: { percentage: 45, proof: 90 },
  netContents: { volume: 750, unit: 'mL' },
  bottlerName: 'Old Tom Distillery, Inc., Louisville, KY',
  countryOfOrigin: 'USA',
  beverage: { type: 'spirits' },
};

const BatchUpload: React.FC = () => {
  const [images, setImages] = useState<File[]>([]);
  const [appDataText, setAppDataText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResultState | null>(null);
  const [jsonError, setJsonError] = useState('');

  const onDrop = useCallback((accepted: File[]) => {
    setImages((prev) => [...prev, ...accepted]);
    setBatchResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 50 * 1024 * 1024,
  });

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateJson = (text: string): ApplicationData[] | null => {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return null;
    }
  };

  const handleProcess = async () => {
    if (images.length === 0) {
      toast.error('Please upload at least one label image');
      return;
    }
    if (!appDataText.trim()) {
      toast.error('Please provide application data JSON');
      return;
    }

    const appDataList = validateJson(appDataText);
    if (!appDataList) {
      setJsonError('Invalid JSON format');
      return;
    }
    if (appDataList.length !== images.length) {
      setJsonError(
        `Mismatch: ${images.length} images but ${appDataList.length} application entries`,
      );
      return;
    }
    setJsonError('');
    setIsProcessing(true);

    try {
      const result = await batchService.uploadBatchSync(images, appDataList);
      setBatchResult(result as BatchResultState);
      toast.success(`Batch complete: ${result.summary.approved} approved, ${result.summary.rejected} rejected`);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || (err as Error).message;
      toast.error(msg || 'Batch processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    setAppDataText('');
    setBatchResult(null);
    setJsonError('');
  };

  const handleDownloadCsv = () => {
    if (!batchResult) return;
    batchService.downloadBatchCsv(batchResult.batchId).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-${batchResult.batchId}-results.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    }).catch(() => toast.error('Failed to download CSV'));
  };

  const handleDownloadJson = () => {
    if (!batchResult) return;
    const blob = new Blob([JSON.stringify(batchResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${batchResult.batchId}-results.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON downloaded');
  };

  if (batchResult) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BatchResults result={batchResult} onReset={handleReset} onCsv={handleDownloadCsv} onJson={handleDownloadJson} />
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Batch Label Verification</h2>
      <p className="text-gray-500 mb-6">
        Upload multiple label images and corresponding application data to process them all at once.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image upload */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            1. Upload Label Images ({images.length})
          </h3>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4 ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">
              {isDragActive ? 'Drop images here' : 'Drop images or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Multiple files allowed • JPEG, PNG, WebP</p>
          </div>

          {images.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-gray-700">{img.name}</span>
                  <span className="text-gray-400 flex-shrink-0 text-xs">
                    {(img.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    onClick={() => removeImage(i)}
                    className="text-gray-400 hover:text-red-500 transition"
                    aria-label={`Remove ${img.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Application data */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            2. Application Data (JSON Array)
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            One JSON object per label, in the same order as the uploaded images.
          </p>

          <button
            onClick={() => {
              const arr = images.length > 0
                ? Array.from({ length: images.length }, (_, i) => ({
                    ...TEMPLATE_APP_DATA,
                    applicationId: `app-${String(i + 1).padStart(3, '0')}`,
                  }))
                : [TEMPLATE_APP_DATA];
              setAppDataText(JSON.stringify(arr, null, 2));
              setJsonError('');
            }}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-3 font-medium"
          >
            <FileText className="w-4 h-4" />
            Load template ({images.length || 1} {images.length === 1 ? 'entry' : 'entries'})
          </button>

          <textarea
            value={appDataText}
            onChange={(e) => {
              setAppDataText(e.target.value);
              setJsonError('');
            }}
            rows={12}
            placeholder={`[\n  {\n    "brandName": "...",\n    "abv": { "percentage": 45 },\n    ...\n  }\n]`}
            className={`w-full font-mono text-xs border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              jsonError ? 'border-red-400' : 'border-gray-300'
            }`}
            spellCheck={false}
          />

          {jsonError && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {jsonError}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleProcess}
        disabled={isProcessing || images.length === 0}
        className="mt-6 w-full bg-green-700 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-3"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Processing {images.length} label{images.length !== 1 ? 's' : ''}…
          </>
        ) : (
          <>
            <Layers className="w-6 h-6" />
            Process {images.length} Label{images.length !== 1 ? 's' : ''}
          </>
        )}
      </button>
    </main>
  );
};

const BatchResults: React.FC<{
  result: BatchResultState;
  onReset: () => void;
  onCsv: () => void;
  onJson: () => void;
}> = ({ result, onReset, onCsv, onJson }) => {
  const { summary, results, errors } = result;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Batch Results Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total" value={summary.total} color="gray" />
          <StatCard label="Approved" value={summary.approved} color="green" icon={<CheckCircle className="w-5 h-5" />} />
          <StatCard label="Review" value={summary.reviewRequired} color="yellow" icon={<Clock className="w-5 h-5" />} />
          <StatCard label="Rejected" value={summary.rejected} color="red" icon={<XCircle className="w-5 h-5" />} />
          <StatCard label="Errors" value={summary.failed} color="gray" />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-6 text-sm text-gray-600">
          <span>Avg. Confidence: <strong>{summary.averageConfidence}%</strong></span>
          <span>Total Time: <strong>{summary.totalProcessingMs}ms</strong></span>
          <span>Avg/Label: <strong>{summary.total > 0 ? Math.round(summary.totalProcessingMs / summary.total) : 0}ms</strong></span>
        </div>
      </div>

      {/* Individual results */}
      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-bold text-gray-900">Per-Label Results</h4>
        </div>
        <div className="divide-y divide-gray-100">
          {results.map((r) => (
            <LabelResultRow key={r.id} result={r} />
          ))}
          {errors.map((e, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600 truncate">{e.filename}</span>
              <span className="ml-auto text-sm text-red-600 truncate">{e.error}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition"
        >
          <RefreshCw className="w-5 h-5" />
          New Batch
        </button>
        <button
          onClick={onCsv}
          className="flex-1 flex items-center justify-center gap-2 bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition"
        >
          <Download className="w-5 h-5" />
          Download CSV
        </button>
        <button
          onClick={onJson}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
        >
          <Download className="w-5 h-5" />
          Download JSON
        </button>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: number;
  color: 'green' | 'yellow' | 'red' | 'gray';
  icon?: React.ReactNode;
}> = ({ label, value, color, icon }) => {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colors[color]}`}>
      {icon && <div className="flex justify-center mb-1 opacity-70">{icon}</div>}
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-0.5">{label}</div>
    </div>
  );
};

const LabelResultRow: React.FC<{ result: VerificationResult }> = ({ result }) => {
  const statusConfig = {
    approved: { icon: <CheckCircle className="w-5 h-5 text-green-500" />, text: 'Approved', color: 'text-green-700' },
    rejected: { icon: <XCircle className="w-5 h-5 text-red-500" />, text: 'Rejected', color: 'text-red-700' },
    review_required: { icon: <Clock className="w-5 h-5 text-yellow-500" />, text: 'Review', color: 'text-yellow-700' },
  };
  const cfg = statusConfig[result.status];
  const failing = result.comparisons.filter((c) => !c.match).map((c) => c.field);

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-900 truncate block">{result.metadata.filename}</span>
        {failing.length > 0 && (
          <span className="text-xs text-red-600">
            Failed: {failing.join(', ')}
          </span>
        )}
      </div>
      <span className={`text-sm font-semibold ${cfg.color} flex-shrink-0`}>{cfg.text}</span>
      <span className="text-gray-500 text-sm tabular-nums w-16 text-right">
        {result.overallConfidence}%
      </span>
    </div>
  );
};

export default BatchUpload;
