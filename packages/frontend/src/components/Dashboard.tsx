import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Layers, CheckCircle, Clock, XCircle, BarChart3 } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-2xl p-8 text-white mb-8 shadow-lg">
        <h2 className="text-3xl font-bold mb-2">Welcome to TTB Label Verifier</h2>
        <p className="text-blue-100 text-lg max-w-2xl">
          Automate alcohol label compliance checks with AI-powered OCR. Upload a label image,
          enter application data, and get a field-by-field verification report in seconds.
        </p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Link
          to="/verify"
          className="group bg-white rounded-2xl shadow p-8 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-600 transition-colors">
              <Upload className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Single Label Verification</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Upload one label image and enter application metadata. Get instant field-by-field
            comparison with confidence scores and detailed pass/fail reasons.
          </p>
          <div className="mt-4 text-blue-600 font-semibold group-hover:text-blue-700">
            Start Verification →
          </div>
        </Link>

        <Link
          to="/batch"
          className="group bg-white rounded-2xl shadow p-8 hover:shadow-lg transition-all border-2 border-transparent hover:border-green-500"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-600 transition-colors">
              <Layers className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Batch Upload</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Process 200–300 labels at once. Upload multiple images with a JSON data file.
            Download results as CSV or JSON for compliance records.
          </p>
          <div className="mt-4 text-green-600 font-semibold group-hover:text-green-700">
            Start Batch Upload →
          </div>
        </Link>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl shadow p-8 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Upload Label', desc: 'Upload a JPEG, PNG, or WebP label image' },
            { step: '2', title: 'Enter Metadata', desc: 'Fill in application fields (brand, ABV, contents…)' },
            { step: '3', title: 'AI Extraction', desc: 'Tesseract.js OCR extracts text from the label' },
            { step: '4', title: 'Verify & Report', desc: 'Field-by-field comparison with confidence scores' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                {step}
              </div>
              <div className="font-semibold text-gray-900 mb-1">{title}</div>
              <div className="text-sm text-gray-500">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Status legend */}
      <div className="bg-white rounded-2xl shadow p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Verification Status Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-green-800">Approved (≥90%)</div>
              <div className="text-sm text-green-700 mt-1">
                All fields match with high confidence. Ready for processing.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl">
            <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-800">Review Required (70–89%)</div>
              <div className="text-sm text-yellow-700 mt-1">
                Minor discrepancies detected. Agent review recommended.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-800">Rejected (&lt;70%)</div>
              <div className="text-sm text-red-700 mt-1">
                Significant mismatches found. Label likely needs correction.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
