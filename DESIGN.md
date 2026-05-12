# Design System

This interface follows a quiet productivity-tool style inspired by Apple, Notion, and Linear.

## Principles

- Keep the screen functional first: no decorative panels, gradients, or marketing copy.
- Use neutral surfaces with subtle contrast instead of heavy blocks of color.
- Prefer thin borders, small radii, compact spacing, and stable dimensions.
- Make active states obvious but restrained.
- Keep mobile controls reachable without covering the schedule.

## Palette

- Page: `#f7f7f5`
- Surface: `#ffffff`
- Muted surface: `#f4f4f2`
- Border: `#e7e5e4`
- Strong border: `#d6d3d1`
- Text: `#1c1917`
- Muted text: `#78716c`
- Primary action: `#1c1917`
- Danger: `#dc2626`

## Components

- Sidebar: fixed on desktop, sticky compact toolbar on mobile, white surface, single right or bottom border.
- Buttons: 6px radius, solid primary only for the main action, bordered secondary actions.
- Inputs: white background, light border, no decorative shadow.
- Schedule cells: white surface, thin border, subtle hover state.
- Status panels: compact, two-column on mobile, stacked on desktop.
- Admin tools: hidden by default and visually secondary.

## Mobile

- Staff choices stay in a horizontal row.
- The sticky staff panel should remain under half the viewport height.
- Repeated status controls in the schedule header are hidden on mobile.
