'use client';

import { useState } from 'react';

/**
 * THE PATHWAY — five roles, one route.
 *
 * ⭐ SELECTION, NOT HOVER. Hover cannot be performed on a phone, so the caption is driven by a
 * real selected state that a tap, a click and the arrow keys all set. One description is ALWAYS
 * visible, which also means the row never changes height.
 *
 * ⚠️ The caption has a MIN-HEIGHT floor: it swaps text on every selection, and without one the
 * whole page jogs as a two-line description replaces a one-line one.
 */
const ROLES = [
  {
    id: 'you',
    label: 'You',
    color: '#4fe0c0',
    caption:
      'Your device — a node on the mesh. Anyone close enough connects straight to you, with no tower or wifi in between.',
  },
  {
    id: 'relay',
    label: 'Relay',
    color: '#ff5db1',
    caption:
      'Too far to reach directly? The devices in between pass the message along without ever reading it. Every one of them is a relay, so more people means more paths.',
  },
  {
    id: 'crew',
    label: 'Crew',
    color: '#6aa8ff',
    caption:
      'Your crew — a room and the people in it, private with a code or open to anyone at the event. The message arrives having hopped the crowd.',
  },
  {
    id: 'peddler',
    label: 'Peddler',
    color: '#8b5cff',
    caption:
      'When no live path exists, a peddler opts in to carry the message on foot, holding it until the paths finally cross.',
  },
  {
    id: 'outpost',
    label: 'Outpost',
    color: '#f5b642',
    caption:
      'Pinned to one spot as a landmark and a mail drop. An outpost holds messages for a crew and hands them over when someone walks past.',
  },
] as const;

export function MessagePathway() {
  const [selected, setSelected] = useState(0);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + ROLES.length) % ROLES.length;
    setSelected(n);
    document.getElementById(`pathway-${ROLES[n].id}`)?.focus();
  };

  return (
    <div className="mt-7">
      <div
        role="tablist"
        aria-label="The path a message takes"
        className="relative grid grid-cols-5 gap-0.5 pt-4 sm:gap-2 sm:pt-5"
      >
        {/* the route the roles sit on */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[8%] right-[8%] top-[30px] h-0.5 opacity-35 sm:top-9"
          style={{
            background:
              'linear-gradient(90deg,#4fe0c0,#ff5db1,#6aa8ff,#8b5cff,#f5b642)',
          }}
        />
        {ROLES.map((role, i) => {
          const on = i === selected;
          const isOutpost = role.id === 'outpost';
          return (
            <button
              key={role.id}
              id={`pathway-${role.id}`}
              role="tab"
              aria-selected={on}
              aria-controls="pathway-caption"
              onClick={() => setSelected(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="group relative flex cursor-pointer flex-col items-center gap-[9px] border-0 bg-transparent p-[6px_2px] sm:gap-3"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span
                className={[
                  'h-[15px] w-[15px] transition-all duration-200 sm:h-5 sm:w-5',
                  isOutpost ? 'rotate-45 rounded-[3px]' : 'rounded-full',
                  on ? 'opacity-100' : 'opacity-55 group-hover:opacity-100',
                ].join(' ')}
                style={{
                  background: role.color,
                  transform: `${isOutpost ? 'rotate(45deg)' : ''} scale(${on ? 1.28 : 1})`,
                  boxShadow: `0 0 0 ${on ? 10 : 5}px color-mix(in srgb, ${role.color} ${on ? 26 : 14}%, transparent)`,
                }}
              />
              <span
                className={[
                  'text-[10.5px] font-bold tracking-[.02em] transition-colors duration-200 sm:text-[13.5px]',
                  on ? 'text-[#f4f1ea]' : 'text-[#a7a29b] group-hover:text-[#f4f1ea]',
                ].join(' ')}
              >
                {role.label}
              </span>
            </button>
          );
        })}
      </div>
      <p
        id="pathway-caption"
        role="tabpanel"
        aria-live="polite"
        className="mt-4 min-h-[4.4em] max-w-[60ch] text-[12.5px] leading-[1.55] text-[#a7a29b] sm:mt-[18px] sm:min-h-[3.1em] sm:text-[13.5px]"
      >
        {ROLES[selected].caption}
      </p>
    </div>
  );
}
