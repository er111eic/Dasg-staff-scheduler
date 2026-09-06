# Design System

This interface uses a web interpretation of Liquid Glass: translucent controls, silver-white surfaces, fine highlights, and a restrained blue selection accent.

## Principles

- Keep the screen functional first. Use a solid light-gray background and high-opacity white controls for clear separation.
- Use neutral surfaces with subtle contrast instead of heavy blocks of color.
- Prefer thin borders, small radii, compact spacing, and stable dimensions.
- Make active states obvious but restrained.
- Keep mobile controls reachable without covering the schedule.
- Apply backdrop blur only to navigation and controls, not every schedule cell.
- Provide opaque fallbacks when transparency is reduced or backdrop blur is unavailable.

## Palette

- Page: `#e5e7eb`
- Surface: `#ffffff`
- Day heading: `#edf0f4`
- Assigned slot: `#eef3fa`
- Border: `rgba(73, 82, 96, 0.24)`
- Selected border: `#4793e7`
- Text: `#202124`
- Muted text: `#626b77`
- Staff selection: `#0066cc`
- Danger: `#dc2626`

## Components

- Sidebar: fixed on desktop, sticky on mobile; translucent with blur and a white edge highlight.
- Buttons: 8px radius, subtle glass highlights; blue for selection and primary actions.
- Inputs: translucent white with a fine border and visible keyboard focus.
- Courses: unframed white rows; borders belong to individual assignment slots.
- Status panels: compact, two-column on mobile, stacked on desktop.
- Admin tools: hidden by default and visually secondary.
- Glass effects remain secondary to readable course names and assignment states.

## Mobile

- Staff choices stay in a horizontal row.
- The sticky staff panel should remain under half the viewport height.
- Repeated status controls in the schedule header are hidden on mobile.
