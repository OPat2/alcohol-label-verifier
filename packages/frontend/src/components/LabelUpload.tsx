import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import type { ApplicationData } from '@shared/types';
import { labelService } from '@/services/api';
import { useLabelStore } from '@/stores/label.store';

interface LabelUploadProps {
  onSuccess: () => void;
}

const LabelUpload: React.FC<LabelUploadProps> = ({ onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [applicationData, setApplicationData] = useState<Partial<ApplicationData>>({
    brandName: '',
    classType: '',
    abv: { percentage: 0 },
    netContents: { volume: 0, unit: 'mL' },
  });
  const [isDragActive, setIsDragActive] = useState(false);

  const { setCurrentResult, setIsLoading, setError } = useLabelStore();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleVerify = async () => {
    if (!selectedFile || !applicationData.brandName) {
      setError('Please upload an image and enter application data');
      return;
    }

    setIsLoading(true);
    try {
      const result = await labelService.verifyLabel(
        selectedFile,
        applicationData as ApplicationData,
      );
      setCurrentResult(result);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Verify Label</h2>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          isDragActive ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-primary'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-semibold mb-2">
          {selectedFile ? selectedFile.name : 'Drop your label image here'}
        </p>
        <p className="text-sm text-gray-600 mb-4">or click to browse</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="inline-block">
          <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            Browse Files
          </button>
        </label>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Brand Name</label>
          <input
            type="text"
            value={applicationData.brandName || ''}
            onChange={(e) =>
              setApplicationData({ ...applicationData, brandName: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Old Tom Distillery"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">ABV %</label>
            <input
              type="number"
              value={applicationData.abv?.percentage || 0}
              onChange={(e) =>
                setApplicationData({
                  ...applicationData,
                  abv: { ...applicationData.abv, percentage: parseFloat(e.target.value) },
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="45"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Net Contents (mL)</label>
            <input
              type="number"
              value={applicationData.netContents?.volume || 0}
              onChange={(e) =>
                setApplicationData({
                  ...applicationData,
                  netContents: { unit: 'mL' as const, ...applicationData.netContents, volume: parseFloat(e.target.value) },
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="750"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleVerify}
        className="mt-6 w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
      >
        Verify Label
      </button>
    </div>
  );
};

export default LabelUpload;
