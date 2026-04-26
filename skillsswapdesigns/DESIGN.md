---
name: Vibrant Pulse
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#464555'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#831ada'
  on-secondary: '#ffffff'
  secondary-container: '#9e41f5'
  on-secondary-container: '#fffbff'
  tertiary: '#00505f'
  on-tertiary: '#ffffff'
  tertiary-container: '#006a7c'
  on-tertiary-container: '#93e8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb8ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6800b4'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-xl:
    fontFamily: Spline Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Spline Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Spline Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  gutter: 16px
  margin: 20px
---

## Brand & Style

The design system is built to resonate with Gen Z users, balancing the excitement of social discovery with the reliability required for educational growth. The personality is energetic, optimistic, and radically inclusive. It avoids the stuffiness of traditional "EdTech" in favor of a lifestyle-oriented aesthetic that feels like a modern social platform.

The visual style employs a **Modern Glassmorphism** approach. It utilizes semi-transparent layers, vibrant background blurs, and crisp borders to create a sense of depth and digital sophistication. This style suggests a forward-thinking, tech-savvy environment where students feel empowered to share their skills. The interface should feel light and kinetic, emphasizing peer-to-peer connection over institutional hierarchy.

## Colors

This design system uses a high-energy palette designed to grab attention while maintaining WCAG AA accessibility standards. 

- **Primary (Electric Indigo):** The core brand color, used for primary actions and brand presence. It conveys trust and intelligence.
- **Secondary (Vivid Purple):** Used for social features and peer interactions. It adds a creative, youthful edge.
- **Tertiary (Bright Cyan):** Utilized for progress indicators and success states, providing a cool, calming contrast.
- **Accent (Neon Lime):** A high-visibility highlight color used sparingly for badges, "New" indicators, and call-to-action highlights to inject energy.
- **Neutrals:** A range of slate grays are used for text and surfaces to ensure the interface feels grounded and readable. 

Surfaces should primarily be white or very light gray, with the energetic colors reserved for interactive elements and data visualization.

## Typography

The typography strategy pairs a dynamic, geometric headline face with a friendly, highly-legible body face. 

**Spline Sans** is used for headlines to provide a fresh, creative character. Its wide apertures and geometric construction feel modern and approachable. Headlines should use tight letter-spacing and bold weights to create a strong visual hierarchy.

**Plus Jakarta Sans** handles all body copy and UI labels. Its soft curves and optimistic feel make long-form reading comfortable and interactive elements feel welcoming. For labels and buttons, use the medium or semibold weights to ensure clarity against vibrant backgrounds.

## Layout & Spacing

This design system employs a **Fluid Grid** model based on an 8px rhythmic scale. The layout is designed to feel spacious and breathable, preventing the cognitive overload often associated with learning platforms.

- **Mobile First:** A 4-column grid for mobile, expanding to 12 columns for desktop.
- **Rhythm:** All vertical spacing should be a multiple of 8px. Use 24px (lg) or 32px (xl) between major sections to emphasize clarity.
- **Margins:** Generous 20px side margins on mobile ensure content doesn't feel cramped against the screen edges.
- **Containers:** Content should be grouped in cards or containers with consistent 16px (md) internal padding.

## Elevation & Depth

Hierarchy is established through **Backdrop Blurs** and **Tinted Shadows**. Rather than using generic gray shadows, this design system utilizes low-opacity shadows that inherit a hint of the primary or secondary brand color (e.g., a subtle indigo-tinted shadow).

- **Level 1 (Base):** Flat surfaces with a subtle 1px border (#E2E8F0).
- **Level 2 (Interactive):** Cards and buttons feature a soft, diffused shadow (10% opacity) with an 8px blur.
- **Level 3 (Modals/Overlays):** These elements use a heavy backdrop blur (20px) on the layer behind them, creating a "frosted glass" effect that keeps the user focused on the foreground while maintaining environmental context.
- **Active States:** When an element is pressed, it should "sink" slightly (reduce shadow blur) to provide tactile feedback.

## Shapes

The shape language is **Rounded**, reflecting a friendly and community-focused brand. 

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) corner radius.
- **Large Containers:** Main content cards and profile headers use a 1rem (16px) radius to feel substantial and soft.
- **Chips & Badges:** Use a fully pill-shaped (rounded-full) geometry to distinguish them as secondary, removable, or status-based elements.

Avoid sharp corners entirely to maintain the approachable, student-centric feel of the design system.

## Components

### Buttons
Primary buttons should use a subtle linear gradient from Primary Indigo to Secondary Purple, featuring white text. Secondary buttons should use a "ghost" style with a 2px Primary Indigo border. All buttons must have a minimum height of 48px to be "thumb-friendly" for teen users.

### Cards
Cards are the primary vehicle for tutor listings and skill exchanges. They should feature a white background, Level 2 elevation shadows, and 16px padding. Use the Secondary Purple for icons or small decorative accents within the card.

### Chips
Use chips for subject tags (e.g., "Math", "Guitar", "Coding"). Use high-contrast pairings, such as light-tinted backgrounds with dark text of the same hue (e.g., light purple background with deep purple text).

### Input Fields
Inputs should have a light gray fill (#F1F5F9) and a 1px border that turns Primary Indigo upon focus. Use Plus Jakarta Sans for placeholder text to keep it friendly.

### Progress Trackers
For "Learning Paths" or "Lesson Completion," use thick, rounded progress bars with the Tertiary Cyan color. Add a subtle glow (shadow with cyan tint) to the progress bar to make it feel "powered up."

### Skill Badges
Circular or hexagonal badges with vibrant icons that students earn. These should use the Accent Neon Lime for high-achievement levels to create a "gamified" sense of reward.