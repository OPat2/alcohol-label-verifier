/**
 * TTB Label Requirements
 * Based on: https://www.ttb.gov/labeling
 */

export const TTB_REQUIRED_FIELDS = {
  spirits: ['brandName', 'classType', 'abv', 'netContents', 'governmentWarning', 'bottlerName'],
  wine: ['brandName', 'abv', 'netContents', 'governmentWarning', 'bottlerName'],
  beer: ['brandName', 'abv', 'netContents', 'governmentWarning', 'bottlerName'],
  malt: ['brandName', 'abv', 'netContents', 'governmentWarning', 'bottlerName'],
};

export const GOVERNMENT_WARNING_TEXT =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.';

export const GOVERNMENT_WARNING_REQUIRED_FORMATTING = {
  allCaps: true,
  bold: true,
  minFontSize: 6, // points
  placement: 'prominent',
};

export const ABV_FORMATS = {
  percentage: /^\d+(\.\d{1,2})?%$/,
  proof: /^\d+(\.\d{1,2})? proof$/i,
  vol: /^\d+(\.\d{1,2})?\s*alc\.?\/vol\.?$/i,
};

export const NET_CONTENTS_UNITS = ['mL', 'L', 'oz', 'fl oz'] as const;
