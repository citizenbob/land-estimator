'use client';

import React, { useState } from 'react';
import AddressInput from '@components/AddressInput/AddressInput';
import EstimateDisplay from '@components/EstimateDisplay/EstimateDisplay';
import Icon from '@components/Icon/Icon';
import { getInstantEstimate, type InstantEstimateResult } from '@services/parcelEstimationService';

export default function Home() {
  const [estimateResult, setEstimateResult] = useState<InstantEstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEstimateRequest = async (address: string) => {
    setIsLoading(true);
    try {
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = getInstantEstimate(address);
      setEstimateResult(result);
    } catch {
      setEstimateResult({
        success: false,
        error: 'An unexpected error occurred while calculating your estimate. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setEstimateResult(null);
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start max-w-4xl w-full">
        <div className="text-center sm:text-left mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Landscape Estimator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Get instant, AI-powered landscaping cost estimates for your St. Louis area property. 
            Enter your address below to see pricing based on your property size, location, and local market data.
          </p>
        </div>

        <div className="w-full max-w-2xl">
          <AddressInput onEstimateRequest={handleEstimateRequest} />
          
          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">
                    Calculating Your Estimate...
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Analyzing property data and market rates for your area.
                  </p>
                </div>
              </div>
            </div>
          )}

          {estimateResult && !isLoading && (
            <EstimateDisplay result={estimateResult} onReset={handleReset} />
          )}
        </div>

        {!estimateResult && !isLoading && (
          <div className="bg-gray-50 rounded-lg p-6 mt-8 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-800">Enter Address</h4>
                <p className="text-gray-600">We find your property in our database</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-800">Analyze Property</h4>
                <p className="text-gray-600">Calculate area, type, and market factors</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-800">Get Estimate</h4>
                <p className="text-gray-600">Instant pricing with detailed breakdown</p>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="vercel" width={16} height={16} />
          Deploy now
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="file" width={16} height={16} />
          Read our docs
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="education" width={16} height={16} />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="window" width={16} height={16} />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="globe" width={16} height={16} />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
