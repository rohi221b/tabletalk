import React from 'react';
import { INTEREST_TAXONOMY, type Interest } from '../types';

interface InterestSelectorProps {
  selected: Interest[];
  onChange: (interests: Interest[]) => void;
  max?: number;
  min?: number;
}

export const InterestSelector: React.FC<InterestSelectorProps> = ({
  selected,
  onChange,
  min = 3,
  max = 5,
}) => {
  const toggleInterest = (item: Interest) => {
    if (selected.includes(item)) {
      onChange(selected.filter((i) => i !== item));
    } else {
      if (selected.length < max) {
        onChange([...selected, item]);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Your Interests
        </label>
        <span style={{
          fontSize: '0.78rem',
          color: selected.length >= min ? 'var(--success)' : 'var(--accent-primary)',
          fontWeight: 500,
        }}>
          {selected.length} of {max} selected {selected.length < min ? `(min ${min})` : '✓'}
        </span>
      </div>

      <div className="chips-grid">
        {INTEREST_TAXONOMY.map((interest) => {
          const isSelected = selected.includes(interest);
          return (
            <button
              key={interest}
              type="button"
              className={`chip ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleInterest(interest)}
            >
              {isSelected ? '✓ ' : '+ '}
              {interest}
            </button>
          );
        })}
      </div>
    </div>
  );
};
