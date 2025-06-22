/**
 * Enhanced Business Intelligence Logging for Lead Follow-up
 *
 * This demonstrates how to capture rich BI data when estimates are generated
 * to enable sophisticated lead scoring and follow-up strategies.
 */

import { logEvent } from '@services/logger';
import { EstimateResult } from '../types/landscapeEstimatorTypes';
import { EnrichedAddressSuggestion } from '../types/addressMatchTypes';

interface BILoggingOptions {
  addressData: EnrichedAddressSuggestion;
  estimate: EstimateResult;
  selectedServices: string[];
  hasCustomLotSize: boolean;
}

/**
 * Logs comprehensive business intelligence data for lead analysis
 */
export function logEstimateForBI({
  addressData,
  estimate,
  selectedServices,
  hasCustomLotSize
}: BILoggingOptions) {
  const avgEstimate =
    (estimate.finalEstimate.min + estimate.finalEstimate.max) / 2;
  let marketSegment: 'budget' | 'mid-market' | 'premium' | 'luxury';
  if (avgEstimate < 5000) marketSegment = 'budget';
  else if (avgEstimate < 15000) marketSegment = 'mid-market';
  else if (avgEstimate < 50000) marketSegment = 'premium';
  else marketSegment = 'luxury';

  const estimateScore = Math.min(avgEstimate / 1000, 50);
  const affluenceScore = (addressData.affluence_score || 0) * 10;
  const leadScore = Math.round(affluenceScore + estimateScore);

  const isLikelyCommercial =
    estimate.lotSizeSqFt > 20000 ||
    (addressData.calc?.building_sqft || 0) > 10000 ||
    avgEstimate > 25000;

  logEvent(
    'estimate_generated',
    {
      address_id: addressData.place_id,
      full_address: addressData.display_name,
      region: addressData.region || 'Unknown',
      latitude: addressData.latitude,
      longitude: addressData.longitude,

      lot_size_sqft: estimate.lotSizeSqFt,
      building_size_sqft: addressData.calc?.building_sqft || 0,
      estimated_landscapable_area:
        addressData.calc?.estimated_landscapable_area || 0,
      property_type: addressData.calc?.property_type || 'unknown',

      affluence_score: addressData.affluence_score || 0,

      selected_services: selectedServices,
      design_fee: estimate.designFee,
      installation_cost: estimate.installationCost,
      maintenance_monthly: estimate.maintenanceMonthly,
      estimate_min: estimate.finalEstimate.min,
      estimate_max: estimate.finalEstimate.max,
      estimate_range_size:
        estimate.finalEstimate.max - estimate.finalEstimate.min,

      price_per_sqft_min: estimate.finalEstimate.min / estimate.lotSizeSqFt,
      price_per_sqft_max: estimate.finalEstimate.max / estimate.lotSizeSqFt,
      is_commercial: isLikelyCommercial,
      has_custom_lot_size: hasCustomLotSize,

      lead_score: leadScore,
      market_segment: marketSegment
    },
    {
      toFirestore: true,
      toMixpanel: true
    }
  );
}

/**
 * Business Intelligence insights this logging enables:
 *
 * LEAD PRIORITIZATION:
 * - High affluence score + high estimate = priority leads
 * - Market segment classification for targeted follow-up
 * - Lead score for sales team prioritization
 *
 * MARKET ANALYSIS:
 * - Geographic patterns (region, lat/lon clustering)
 * - Price sensitivity by affluence level
 * - Service preferences by market segment
 *
 * BUSINESS OPTIMIZATION:
 * - Conversion rates by estimate range
 * - Most profitable service combinations
 * - Pricing optimization by region
 *
 * FOLLOW-UP STRATEGIES:
 * - High-value leads (luxury segment) get personal calls
 * - Mid-market gets email nurturing campaigns
 * - Budget segment gets DIY guides and seasonal promotions
 *
 * COMPETITIVE INTELLIGENCE:
 * - Market penetration by affluence and region
 * - Average deal sizes and service mix
 * - Seasonal demand patterns
 */
