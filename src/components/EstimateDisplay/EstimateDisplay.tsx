// src/components/EstimateDisplay/EstimateDisplay.tsx
'use client';

import React from 'react';
import type { InstantEstimateResult } from '@services/parcelEstimationService';

interface EstimateDisplayProps {
  result: InstantEstimateResult;
  onReset: () => void;
}

const EstimateDisplay: React.FC<EstimateDisplayProps> = ({ result, onReset }) => {
  if (!result.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Unable to Calculate Estimate
        </h3>
        <p className="text-red-700 mb-4">{result.error}</p>
        <button
          onClick={onReset}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Try Another Address
        </button>
      </div>
    );
  }

  const { parcel, estimate } = result;
  
  if (!parcel || !estimate?.success || !estimate.priceBreakdown) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Incomplete Data
        </h3>
        <p className="text-yellow-700 mb-4">
          We found your property but couldn&apos;t calculate a complete estimate.
        </p>
        <button
          onClick={onReset}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
        >
          Try Another Address
        </button>
      </div>
    );
  }

  const breakdown = estimate.priceBreakdown;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-green-800 mb-1">
            Instant Landscaping Estimate
          </h3>
          <p className="text-green-700 text-sm">{parcel.full_address}</p>
        </div>
        <button
          onClick={onReset}
          className="text-green-600 hover:text-green-800 font-medium"
        >
          × Change Address
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Property Information */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-3">Property Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Property Type:</span>
              <span className="font-medium capitalize">{parcel.property_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Area:</span>
              <span className="font-medium">{breakdown.area.toLocaleString()} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Affluence Score:</span>
              <span className="font-medium">{parcel.affluence_score}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">
                {parcel.latitude.toFixed(4)}, {parcel.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-3">Cost Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Installation:</span>
              <span className="font-medium">
                ${breakdown.installMin.toLocaleString()} - ${breakdown.installMax.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Design Fee:</span>
              <span className="font-medium">${breakdown.designFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Annual Maintenance:</span>
              <span className="font-medium">
                ${breakdown.maintenanceMin.toLocaleString()} - ${breakdown.maintenanceMax.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Affluence Multiplier:</span>
              <span className="font-medium">{breakdown.affluenceMultiplier}x</span>
            </div>
            {parcel.property_type === 'commercial' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Commercial Discount:</span>
                <span className="font-medium">{breakdown.commercialMultiplier}x</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final Estimate */}
      <div className="bg-green-100 rounded-lg p-4 mt-4">
        <h4 className="font-bold text-green-800 mb-2">Total Project Estimate</h4>
        <div className="text-2xl font-bold text-green-900">
          ${breakdown.finalEstimateMin.toLocaleString()} - ${breakdown.finalEstimateMax.toLocaleString()}
        </div>
        <p className="text-green-700 text-sm mt-1">
          Includes installation and design fee. Maintenance costs are annual.
        </p>
      </div>

      {/* Call to Action */}
      <div className="mt-6 pt-4 border-t border-green-200">
        <p className="text-green-700 text-sm mb-3">
          Ready to move forward with your landscaping project?
        </p>
        <div className="flex gap-3">
          <button className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors font-medium">
            Request Formal Quote
          </button>
          <button className="bg-white text-green-600 border border-green-300 px-6 py-2 rounded hover:bg-green-50 transition-colors font-medium">
            Schedule Consultation
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstimateDisplay;