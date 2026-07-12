import React from 'react';
import { Upload, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { VerificationResult } from '@shared/types';

interface VerificationResultsProps {
  result: VerificationResult;
  onReset: () => void;
}

const VerificationResults: React.FC<VerificationResultsProps> = ({ result, onReset }) => {
  const statusColor = {
    approved: 'text-green-600 bg-green-50',
    rejected: 'text-red-600 bg-red-50',
    review_required: 'text-yellow-600 bg-yellow-50',
  };

  const statusIcon = {
    approved: <CheckCircle className="w-6 h-6" />,
    rejected: <AlertCircle className="w-6 h-6" />,
    review_required: <Clock className="w-6 h-6" />,
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
      <div className={`flex items-center gap-3 p-4 rounded-lg ${statusColor[result.status]}`}>
        {statusIcon[result.status]}
        <div>
          <h3 className="font-bold text-lg capitalize">
            {result.status.replace('_', ' ')}
          </h3>
          <p className="text-sm">Overall Confidence: {result.overallConfidence}%</p>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-lg font-bold mb-4">Field Comparisons</h4>
        <div className="space-y-4">
          {result.comparisons.map((comp, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-semibold capitalize">{comp.field}</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Expected: <span className="font-mono">{comp.applicationValue}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Found: <span className="font-mono">{comp.labelValue}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${comp.confidence >= 90 ? 'text-green-600' : comp.confidence >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {comp.confidence}%
                  </div>
                  {comp.notes && <p className="text-xs text-gray-600 mt-2">{comp.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Verify Another Label
        </button>
        <button className="flex-1 bg-secondary text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition">
          Download Report
        </button>
      </div>
    </div>
  );
};

export default VerificationResults;
