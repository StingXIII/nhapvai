import React from 'react';
import Tooltip from '../../common/Tooltip';

/**
 * Type definition for tracking multiple concurrent AI generation tasks.
 */
export type LoadingStates = {
  [key: string]: boolean;
};

/**
 * Standardized styled input for world creation forms.
 */
// Use React.createElement instead of JSX to avoid errors in a .ts file
export const StyledInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  React.createElement('input', {
    ...props,
    className: `w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition placeholder:text-slate-500 ${props.className || ''}`
  })
);

/**
 * Standardized styled textarea for world creation forms.
 */
// Use React.createElement instead of JSX to avoid errors in a .ts file
export const StyledTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  React.createElement('textarea', {
    ...props,
    className: `w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition resize-y placeholder:text-slate-500 ${props.className || ''}`
  })
);

/**
 * Standardized styled select for world creation forms.
 */
// Use React.createElement instead of JSX to avoid errors in a .ts file
export const StyledSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  React.createElement('select', {
    ...props,
    className: `w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition ${props.className || ''}`
  })
);

/**
 * Layout component for form rows with consistent labeling and optional tooltips.
 */
interface FormRowProps {
  label: string;
  children: React.ReactNode;
  tooltip?: string;
  labelClassName?: string;
}

// Use React.createElement instead of JSX to avoid errors in a .ts file
export const FormRow: React.FC<FormRowProps> = ({ 
  label, 
  children, 
  tooltip, 
  labelClassName = 'text-slate-300' 
}) => (
  React.createElement('div', { className: "mb-4" },
    React.createElement('label', { className: `flex items-center text-sm font-medium ${labelClassName} mb-1` },
      React.createElement('span', null, label),
      tooltip ? React.createElement(Tooltip, { text: tooltip }) : null
    ),
    children
  )
);