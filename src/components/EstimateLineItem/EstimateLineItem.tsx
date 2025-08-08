import React from 'react';
import { motion } from 'framer-motion';
import {
  LineItemContainer,
  LineItemLabel,
  LineItemValue
} from './EstimateLineItem.styles';

const MotionLineItem = motion.create(LineItemContainer);

const ITEM_ANIMATION = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

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
      <LineItemLabel>{label}:</LineItemLabel>
      <LineItemValue>{value}</LineItemValue>
    </MotionLineItem>
  );
}
