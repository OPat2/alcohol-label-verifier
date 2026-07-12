import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    id: 'meta-123',
    uploadedAt: '2024-01-01T00:00:00Z',
    uploadedBy: 'test-user',
    filename: 'test-label.jpg',
    imageUrl: '',
    processingStatus: 'completed',
    confidence: 95,
  },
  extracted: { rawText: 'OLD TOM DISTILLERY...' },
  application: {
    applicationId: 'app-123',
    brandName: 'Old Tom Distillery',
    classType: 'Whiskey',
    abv: { percentage: 45 },
    netContents: { volume: 750, unit: 'mL' },
    beverage: { type: 'spirits' },
  },
  timings: { ocrMs: 800, validationMs: 100, preprocessMs: 50, totalMs: 1200 },
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

  it('renders all field comparison labels', () => {
    renderResults();
    expect(screen.getByText('Brand Name')).toBeInTheDocument();
    expect(screen.getByText('Alcohol Content (ABV)')).toBeInTheDocument();
    expect(screen.getByText('Government Warning')).toBeInTheDocument();
  });

  it('shows pass count summary', () => {
    renderResults();
    expect(screen.getByText(/2.*of.*3.*fields pass/i)).toBeInTheDocument();
  });

  it('auto-expands first failing field — notes visible on mount', () => {
    renderResults();
    // governmentWarning is the first (and only) failing field; expanded by default
    expect(screen.getByText('GOVERNMENT WARNING: header must be uppercase')).toBeInTheDocument();
  });

  it('collapses an expanded field on click', () => {
    renderResults();
    const btn = screen.getByRole('button', { name: /toggle details for government warning/i });
    fireEvent.click(btn); // was expanded, now collapse
    expect(screen.queryByText('GOVERNMENT WARNING: header must be uppercase')).not.toBeInTheDocument();
  });

  it('expands a collapsed field on click', () => {
    renderResults();
    // brandName starts collapsed; click to open
    const btn = screen.getByRole('button', { name: /toggle details for brand name/i });
    fireEvent.click(btn);
    expect(screen.getByText('Normalized match (case-insensitive)')).toBeInTheDocument();
  });

  it('shows timing breakdown', () => {
    renderResults();
    expect(screen.getByText(/OCR Extraction/i)).toBeInTheDocument();
    expect(screen.getByText(/Validation/i)).toBeInTheDocument();
  });

  it('calls onReset when Verify Another Label is clicked', () => {
    const onReset = vi.fn();
    renderResults(mockResult, onReset);
    fireEvent.click(screen.getByRole('button', { name: /verify another label/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('has a download JSON button', () => {
    renderResults();
    expect(screen.getByRole('button', { name: /download report/i })).toBeInTheDocument();
  });

  it('shows rejected status correctly', () => {
    renderResults({ ...mockResult, status: 'rejected', overallConfidence: 30 });
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows review_required status correctly', () => {
    renderResults({ ...mockResult, status: 'review_required' });
    expect(screen.getByText('Review Required')).toBeInTheDocument();
  });

  it('shows matchType badges', () => {
    renderResults();
    expect(screen.getByText('Exact Match')).toBeInTheDocument();
    expect(screen.getByText('Normalized Match')).toBeInTheDocument();
    expect(screen.getByText('Mismatch')).toBeInTheDocument();
  });
});
