'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

export function Card({ 
  className = '', 
  children, 
  hover = false, 
  ...props 
}: CardProps) {
  const baseStyles = 'app-surface';
  const hoverStyles = hover ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md' : '';
  
  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ 
  className = '', 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
