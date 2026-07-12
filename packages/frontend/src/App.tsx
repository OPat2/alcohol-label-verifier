import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            🍷 Alcohol Label Verification System
          </h1>
          <p className="text-sm text-gray-600 mt-1">TTB Compliance Assistant</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome</h2>
          <p className="text-gray-600 mb-4">
            Upload a label image and application data to verify compliance with TTB requirements.
          </p>
          <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            Start Verification
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
