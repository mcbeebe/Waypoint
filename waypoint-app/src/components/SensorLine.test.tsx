/**
 * The sensor line, rendered. Its whole job is to say what was checked, so an
 * honest failure has to look different from a clean check.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SensorLine from './SensorLine';
import { sensorLine } from '@/lib/homeTriage';

const line = (over = {}) =>
  sensorLine({ now: new Date('2026-08-29T09:00:00'), ...over });

describe('the sensor line', () => {
  it('reads out what was checked', () => {
    render(<SensorLine sensor={line({ gmail: { connected: true, lastCheckedAt: '2026-08-29T06:32:00' } })} />);
    expect(screen.getByText(/Gmail checked/i)).toBeInTheDocument();
  });

  it('marks a failed check differently from a clean one', () => {
    const ok = line({ gmail: { connected: true, lastCheckedAt: '2026-08-29T06:32:00' } });
    const bad = line({ gmail: { connected: true, failed: true } });
    expect(ok.ok).toBe(true);
    expect(bad.ok).toBe(false);
    const { container } = render(<SensorLine sensor={bad} />);
    expect(container.textContent).toMatch(/Couldn't check Gmail/i);
  });

  it('is announced as one line, not three fragments', () => {
    const s = line();
    render(<SensorLine sensor={s} />);
    expect(screen.getByLabelText(s.text)).toBeInTheDocument();
  });
});
