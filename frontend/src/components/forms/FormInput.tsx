import React from 'react';
import { Input } from '../ui/Input';
import { LucideIcon } from 'lucide-react';

interface FormInputProps {
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
}

export function FormInput({
  id,
  type,
  placeholder,
  value,
  onChange,
  error,
  icon: Icon,
  disabled = false,
  className = "",
}: FormInputProps) {
  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      )}
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${Icon ? 'pl-10' : ''} ${error ? 'border-red-500' : ''}`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
