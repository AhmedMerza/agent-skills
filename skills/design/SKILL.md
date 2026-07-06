# Design Advisor

## Overview
A design advisor skill that provides industry-specific UI/UX recommendations
before building. Searches design data files to give actionable recommendations
with hex codes, font pairings, layout patterns, and anti-pattern warnings.

## Workflow
1. Identify the industry/product type from the user's request
2. Search relevant CSV data files in the `data/` folder next to this SKILL.md (`design/data/`)
3. Cross-reference with design vocabulary for proper terminology
4. Search 21st.dev for real component examples (if MCP available)
5. Present structured recommendations with implementation details

## Data Files
Search these CSV files based on what the user needs:
- colors.csv — industry color palettes (primary, secondary, CTA, bg, text, border)
- typography.csv — font pairings with mood, use cases, Google Fonts links
- ui-reasoning.csv — industry design patterns, anti-patterns, severity
- styles.csv — visual design styles and implementation details
- landing.csv — landing page layout patterns and CTA strategies
- ux-guidelines.csv — UX do/don't rules with code examples
- charts.csv — data visualization recommendations

## Output Format
Structure your response as:
- Style Direction (recommended visual style and why)
- Color Palette (hex codes with roles)
- Typography (font pairing with Google Fonts link)
- Page Structure (section order and CTA placement)
- Key Effects (animations and interactions)
- Anti-Patterns (what to avoid, with severity)
- 21st.dev Examples (real components, if MCP available)
