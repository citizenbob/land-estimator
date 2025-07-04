'use client';

import React, { useState } from 'react';
import AddressInput from '@components/AddressInput/AddressInput';
import { EnrichedAddressSuggestion } from '../types';
import { EstimateCalculator } from '@components/EstimateCalculator/EstimateCalculator';
import Icon from '@components/Icon/Icon';

export default function Home() {
  const [addressData, setAddressData] =
    useState<EnrichedAddressSuggestion | null>(null);

  const currentYear = new Date().getFullYear();

  return (
    <div className="grid grid-rows-[20px_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <AddressInput onAddressSelect={setAddressData} />
        {addressData && <EstimateCalculator addressData={addressData} />}
      </main>

      <footer className="row-start-3 w-full border-t border-gray-200 mt-12 pt-6 pb-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="leaf" width={18} height={18} />
                <span className="font-semibold text-sm">Land Estimator</span>
              </div>
              <p className="text-xs text-gray-600 text-center md:text-left">
                Hand-crafted in Phoenix, Arizona with &hearts; by{' '}
                <a
                  href="https://goodcitizens.us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:underline-offset-4"
                >
                  Good Citizens Corporation
                </a>
              </p>
            </div>

            <div className="flex gap-6 flex-wrap items-center justify-center">
              <a
                className="flex items-center gap-2 text-sm hover:underline hover:underline-offset-4"
                href="https://github.com/users/citizenbob/projects/3"
                target="_blank"
                rel="noopener noreferrer"
              >
                An Hypothesis-Driven Solution
              </a>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-6">
            &copy; {currentYear} Good Citizens Corporation. All rights reserved.
            <br />
            <span className="text-gray-400">
              Licensed under Business Source License 1.1 (BUSL-1.1) ·
              Enterprise-grade solutions for small businesses and startups
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
