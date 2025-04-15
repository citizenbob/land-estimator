import React, { forwardRef } from 'react';
import { InputFieldStyles } from '@components/InputField/InputField.styles';

const InputField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ ...props }, ref) => {
  return <InputFieldStyles ref={ref} {...props} />;
});

InputField.displayName = 'InputField';

export default InputField;
