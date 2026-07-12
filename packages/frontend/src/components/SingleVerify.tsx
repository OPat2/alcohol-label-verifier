import React, { useState, useCallback } from 'react';
import { Upload, X, FileImage, AlertCircle, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import type { ApplicationData } from '@shared/types';
import { labelService } from '@/services/api';
import { useLabelStore } from '@/stores/label.store';
import VerificationResults from '@/components/VerificationResults';
import toast from 'react-hot-toast';

const UNIT_OPTIONS = ['mL', 'L', 'oz', 'fl oz'] as const;
const BEVERAGE_TYPES = ['spirits', 'wine', 'beer', 'malt'] as const;

const EMPTY_APPLICATION: Partial<ApplicationData> = {
  applicationId: '',
  brandName: '',
  classType: '',
  abv: { percentage: 0, proof: 0 },
  netContents: { volume: 750, unit: 'mL' },
  bottlerName: '',
  countryOfOrigin: '',
  beverage: { type: 'spirits' },
};

const SingleVerify: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [appData, setAppData] = useState<Partial<ApplicationData>>(EMPTY_APPLICATION);
  const { currentResult, isLoading, error, setCurrentResult, setIsLoading, setError } =
    useLabelStore();

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setPreview(URL.createObjectURL(accepted[0]));
      setCurrentResult(null);
    }
  }, [setCurrentResult]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const removeFile = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCurrentResult(null);
    setError(null);
  };

  const handleVerify = async () => {
    if (!file) {
      toast.error('Please upload a label image');
      return;
    }
    if (!appData.brandName?.trim()) {
      toast.error('Brand name is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await labelService.verifyLabel(file, appData as ApplicationData);
      setCurrentResult(result);
      toast.success('Verification complete!');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || (err as Error).message || 'Verification failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentResult(null);
    setError(null);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setAppData(EMPTY_APPLICATION);
  };

  if (currentResult) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VerificationResults result={currentResult} onReset={handleReset} />
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Single Label Verification</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT – Image upload */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Upload Label Image</h3>

          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-700 mb-1">
                {isDragActive ? 'Drop the image here' : 'Drop label image here'}
              </p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-3">JPEG, PNG, WebP • Max 50 MB</p>
            </div>
          ) : (
            <div>
              {preview && (
                <div className="relative mb-4">
                  <img
                    src={preview}
                    alt="Label preview"
                    className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={removeFile}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50 transition"
                    aria-label="Remove image"
                  >
                    <X className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <FileImage className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="ml-auto text-gray-400 flex-shrink-0">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT – Application data form */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">2. Application Data</h3>

          <div className="space-y-4">
            <FormField label="Brand Name *">
              <input
                type="text"
                value={appData.brandName || ''}
                onChange={(e) => setAppData({ ...appData, brandName: e.target.value })}
                placeholder="e.g., Old Tom Distillery"
                className="form-input"
              />
            </FormField>

            <FormField label="Class / Type">
              <input
                type="text"
                value={appData.classType || ''}
                onChange={(e) => setAppData({ ...appData, classType: e.target.value })}
                placeholder="e.g., Kentucky Straight Bourbon Whiskey"
                className="form-input"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="ABV (%)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={appData.abv?.percentage || ''}
                  onChange={(e) =>
                    setAppData({
                      ...appData,
                      abv: { ...appData.abv, percentage: parseFloat(e.target.value) || 0 },
                    })
                  }
                  placeholder="e.g., 45"
                  className="form-input"
                />
              </FormField>
              <FormField label="Proof">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={appData.abv?.proof || ''}
                  onChange={(e) =>
                    setAppData({
                      ...appData,
                      abv: { ...appData.abv, proof: parseFloat(e.target.value) || 0 },
                    })
                  }
                  placeholder="e.g., 90"
                  className="form-input"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Net Contents (volume)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={appData.netContents?.volume || ''}
                  onChange={(e) =>
                    setAppData({
                      ...appData,
                      netContents: {
                        ...appData.netContents!,
                        volume: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  placeholder="e.g., 750"
                  className="form-input"
                />
              </FormField>
              <FormField label="Unit">
                <select
                  value={appData.netContents?.unit || 'mL'}
                  onChange={(e) =>
                    setAppData({
                      ...appData,
                      netContents: {
                        ...appData.netContents!,
                        unit: e.target.value as typeof UNIT_OPTIONS[number],
                      },
                    })
                  }
                  className="form-input"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Bottler / Producer">
              <input
                type="text"
                value={appData.bottlerName || ''}
                onChange={(e) => setAppData({ ...appData, bottlerName: e.target.value })}
                placeholder="e.g., Old Tom Distillery, Inc., Louisville, KY"
                className="form-input"
              />
            </FormField>

            <FormField label="Country of Origin">
              <input
                type="text"
                value={appData.countryOfOrigin || ''}
                onChange={(e) => setAppData({ ...appData, countryOfOrigin: e.target.value })}
                placeholder="e.g., USA"
                className="form-input"
              />
            </FormField>

            <FormField label="Beverage Type">
              <select
                value={appData.beverage?.type || 'spirits'}
                onChange={(e) =>
                  setAppData({
                    ...appData,
                    beverage: { type: e.target.value as typeof BEVERAGE_TYPES[number] },
                  })
                }
                className="form-input"
              >
                {BEVERAGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={isLoading || !file}
        className="mt-6 w-full bg-blue-700 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-3"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Verifying label…
          </>
        ) : (
          <>
            <Upload className="w-6 h-6" />
            Run Verification
          </>
        )}
      </button>
    </main>
  );
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
  </div>
);

export default SingleVerify;
