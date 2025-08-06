import React from 'react';
import { motion } from 'framer-motion';
import { LineItem } from '../EstimateCalculator/EstimateCalculator.styles';

const MotionLineItem = motion.create(LineItem);

/**
 * Animation properties for estimate line items
 */
const ITEM_ANIMATION = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

/**
 * Reusable component for estimate breakdown line items with consistent animation
 */
interface EstimateLineItemProps {
  label: string;
  value: string;
  show?: boolean;
}

export function EstimateLineItem({
  label,
  value,
  show = true
}: EstimateLineItemProps) {
  if (!show) return null;

  return (
    <MotionLineItem {...ITEM_ANIMATION}>
      <span>{label}:</span>
      <span>{value}</span>
    </MotionLineItem>
  );
}
