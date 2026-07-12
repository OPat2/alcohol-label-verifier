import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import VerificationResults from '@/components/VerificationResults';
import type { VerificationResult } from '@shared/types';

const mockResult: VerificationResult = {
  id: 'test-123',
  status: 'approved',
  overallConfidence: 95,
  comparisons: [
    {
      field: 'brandName',
      match: true,
      confidence: 100,
      applicationValue: 'Old Tom Distillery',
      labelValue: 'OLD TOM DISTILLERY',
      matchType: 'normalized',
      notes: 'Normalized match (case-insensitive)',
    },
    {
      field: 'abv',
      match: true,
      confidence: 100,
      applicationValue: '45%',
      labelValue: '45%',
      matchType: 'exact',
      notes: 'Exact match',
    },
    {
      field: 'governmentWarning',
      match: false,
      confidence: 20,
      applicationValue: 'GOVERNMENT WARNING: ...',
      labelValue: 'Government Warning: ...',
      matchType: 'mismatch',
      notes: 'GOVERNMENT WARNING: header must be uppercase',
    },
  ],
  metadata: {
    filename: 'test-label.jpg',
    fileSize: 12345,
    processingTime: 1200,
  },
  timings: { ocrMs: 800, validationMs: 100, preprocessMs: 50, totalMs: 1200 },
  extractedText: 'OLD TOM DISTILLERY...',
};

const renderResults = (result = mockResult, onReset = vi.fn()) =>
  render(<VerificationResults result={result} onReset={onReset} />);

describe('VerificationResults', () => {
  it('shows overall status banner', () => {
    renderResults();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('shows overall confidence', () => {
    renderResults();
    expect(screen.getAllByText('95%').length).toBeGreaterThan(0);
  });

  it('renders all field comparisons', () => {
    renderResults();
    expect(screen.getByText('Brand Name')).toBeInTheDocument();
    expect(screen.getByText('Alcohol Content (ABV)')).toBeInTheDocument();
    expect(screen.getByText('Government Warning')).toBeInTheDocument();
  });

  it('shows pass count summary', () => {
    renderResults();
    expect(screen.getByText(/2 of 3 fields pass/i)).toBeInTheDocument();
  });

  it('expands a field row on click', () => {
    renderResults();
    const btn = screen.getByRole('button', { name: /toggle details for government warning/i });
    fireEvent.click(btn);
    expect(screen.getByText(/GOVERNMENT WARNING: header must be uppercase/i)).toBeInTheDocument();
  });

  it('shows timing breakdown', () => {
    renderResults();
    expect(screen.getByText(/OCR Extraction/i)).toBeInTheDocument();
    expect(screen.getByText(/Validation/i)).toBeInTheDocument();
  });

  it('calls onReset when "Verify Another Label" is clicked', () => {
    const onReset = vi.fn();
    renderResults(mockResult, onReset);
    fireEvent.click(screen.getByRole('button', { name: /verify another label/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('download JSON button is present', () => {
    renderResults();
    expect(screen.getByRole('button', { name: /download report/i })).toBeInTheDocument();
  });

  it('shows rejected status correctly', () => {
    const rejected = { ...mockResult, status: 'rejected' as const, overallConfidence: 30 };
    renderResults(rejected);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows review_required status correctly', () => {
    const review = { ...mockResult, status: 'review_required' as const };
    renderResults(review);
    expect(screen.getByText('Review Required')).toBeInTheDocument();
  });

  it('shows matchType badges', () => {
    renderResults();
    expect(screen.getByText('Exact Match')).toBeInTheDocument();
    expect(screen.getByText('Normalized Match')).toBeInTheDocument();
    expect(screen.getByText('Mismatch')).toBeInTheDocument();
  });
});
