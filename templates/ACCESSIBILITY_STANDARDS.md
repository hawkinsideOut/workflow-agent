# Accessibility Standards

> **Purpose**: This document defines the accessibility (a11y) requirements for all UI development. All components, pages, and features MUST meet WCAG 2.1 Level AA compliance.

---

## Table of Contents

1. [Compliance Requirements](#compliance-requirements)
2. [WCAG 2.1 AA Checklist](#wcag-21-aa-checklist)
3. [ARIA Patterns](#aria-patterns)
4. [Color & Contrast](#color--contrast)
5. [Keyboard Navigation](#keyboard-navigation)
6. [Screen Reader Support](#screen-reader-support)
7. [Focus Management](#focus-management)
8. [Testing Requirements](#testing-requirements)
9. [Automated Testing](#automated-testing)
10. [Common Patterns](#common-patterns)

---

## Compliance Requirements

### Target Standard

| Standard | Level | Status |
|----------|-------|--------|
| WCAG 2.1 | AA | **Required** |
| WCAG 2.1 | AAA | Recommended where feasible |
| Section 508 | Full | Required for government contracts |

### Non-Negotiables

These accessibility features are **mandatory** for all UI work:

1. **All interactive elements** must be keyboard accessible
2. **All images** must have meaningful alt text (or empty alt for decorative)
3. **All form inputs** must have associated labels
4. **Color alone** must never convey information
5. **Focus indicators** must be visible on all interactive elements
6. **Heading hierarchy** must be logical (h1 → h2 → h3)
7. **Motion/animations** must respect `prefers-reduced-motion`

---

## WCAG 2.1 AA Checklist

### Perceivable

| Criterion | Requirement | How to Test |
|-----------|-------------|-------------|
| 1.1.1 Non-text Content | All images have alt text | Automated + manual review |
| 1.3.1 Info and Relationships | Semantic HTML structure | DOM inspection |
| 1.3.2 Meaningful Sequence | Reading order is logical | Screen reader test |
| 1.4.1 Use of Color | Color not sole indicator | Grayscale test |
| 1.4.3 Contrast (Minimum) | 4.5:1 for text, 3:1 for large text | Contrast checker |
| 1.4.4 Resize Text | Usable at 200% zoom | Browser zoom test |
| 1.4.10 Reflow | No horizontal scroll at 320px | Responsive test |
| 1.4.11 Non-text Contrast | 3:1 for UI components | Contrast checker |

### Operable

| Criterion | Requirement | How to Test |
|-----------|-------------|-------------|
| 2.1.1 Keyboard | All functionality via keyboard | Tab through page |
| 2.1.2 No Keyboard Trap | Can escape all components | Keyboard test |
| 2.4.1 Bypass Blocks | Skip navigation link present | Manual check |
| 2.4.3 Focus Order | Logical tab order | Keyboard test |
| 2.4.4 Link Purpose | Link text is descriptive | Manual review |
| 2.4.6 Headings and Labels | Descriptive headings | Manual review |
| 2.4.7 Focus Visible | Focus indicator visible | Keyboard test |
| 2.5.3 Label in Name | Accessible name matches visible | Screen reader |

### Understandable

| Criterion | Requirement | How to Test |
|-----------|-------------|-------------|
| 3.1.1 Language of Page | `lang` attribute set | DOM inspection |
| 3.2.1 On Focus | No unexpected changes | Keyboard test |
| 3.2.2 On Input | No unexpected changes | Form testing |
| 3.3.1 Error Identification | Errors clearly described | Form validation test |
| 3.3.2 Labels or Instructions | Form inputs have labels | Automated test |

### Robust

| Criterion | Requirement | How to Test |
|-----------|-------------|-------------|
| 4.1.1 Parsing | Valid HTML | HTML validator |
| 4.1.2 Name, Role, Value | ARIA used correctly | axe-core |

---

## ARIA Patterns

### When to Use ARIA

```
1. First: Use native HTML elements (button, input, select)
2. Second: Use Radix UI primitives (built-in accessibility)
3. Third: Add ARIA only when native semantics are insufficient
```

### Required ARIA Attributes by Component

#### Buttons

```tsx
// ✅ Good - Native button
<button onClick={handleClick}>Save</button>

// ✅ Good - Icon button with label
<button aria-label="Close dialog" onClick={onClose}>
  <XIcon aria-hidden="true" />
</button>

// ❌ Bad - Div as button
<div onClick={handleClick}>Save</div>
```

#### Dialogs/Modals

```tsx
// Use Radix Dialog - accessibility built-in
import { Dialog } from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here.
      </DialogDescription>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

#### Forms

```tsx
// ✅ Good - Proper form labeling
<div>
  <Label htmlFor="email">Email address</Label>
  <Input 
    id="email" 
    type="email"
    aria-describedby="email-error"
    aria-invalid={!!errors.email}
  />
  {errors.email && (
    <p id="email-error" role="alert" className="text-destructive">
      {errors.email.message}
    </p>
  )}
</div>
```

#### Loading States

```tsx
// ✅ Good - Announce loading state
<Button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <Spinner aria-hidden="true" />
      <span className="sr-only">Loading...</span>
      Saving...
    </>
  ) : (
    "Save"
  )}
</Button>
```

#### Live Regions

```tsx
// Announce dynamic content changes
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {notification}
</div>

// For urgent announcements
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>
```

---

## Color & Contrast

### Minimum Contrast Ratios

| Element | Ratio | Example |
|---------|-------|---------|
| Normal text (< 18px) | 4.5:1 | Body copy |
| Large text (≥ 18px bold or ≥ 24px) | 3:1 | Headings |
| UI components & graphics | 3:1 | Buttons, icons, borders |
| Disabled elements | No requirement | But should be visually distinct |

### Color Tokens for Accessibility

```typescript
// lib/design-tokens.ts - Accessible color combinations

export const accessibleColors = {
  // Text on backgrounds
  text: {
    onLight: "text-gray-900",      // #111827 on white = 15.5:1
    onDark: "text-gray-100",       // #f3f4f6 on gray-900 = 12.6:1
    muted: "text-gray-600",        // #4b5563 on white = 7.0:1
    mutedDark: "text-gray-400",    // #9ca3af on gray-900 = 5.5:1
  },
  
  // Status colors with sufficient contrast
  status: {
    success: {
      bg: "bg-green-100",
      text: "text-green-800",      // 5.3:1
      border: "border-green-500",
    },
    error: {
      bg: "bg-red-100",
      text: "text-red-800",        // 5.6:1
      border: "border-red-500",
    },
    warning: {
      bg: "bg-amber-100",
      text: "text-amber-900",      // 7.2:1
      border: "border-amber-500",
    },
    info: {
      bg: "bg-blue-100",
      text: "text-blue-800",       // 5.4:1
      border: "border-blue-500",
    },
  },
};
```

### Color Independence

Always provide a secondary indicator (icon, text, pattern):

```tsx
// ✅ Good - Color + icon + text
<Badge variant="success">
  <CheckIcon aria-hidden="true" className="mr-1" />
  Approved
</Badge>

// ❌ Bad - Color alone
<div className="bg-green-500 w-3 h-3 rounded-full" />
```

---

## Keyboard Navigation

### Required Keyboard Support

| Key | Action |
|-----|--------|
| `Tab` | Move to next focusable element |
| `Shift + Tab` | Move to previous focusable element |
| `Enter` / `Space` | Activate buttons and links |
| `Escape` | Close dialogs, dropdowns, popovers |
| `Arrow keys` | Navigate within components (menus, tabs, etc.) |
| `Home` / `End` | Jump to first/last item in lists |

### Focus Styles

```css
/* globals.css - Never remove focus outlines */

/* Default focus ring */
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Skip link for keyboard users */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  z-index: 100;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.skip-link:focus {
  top: 0;
}
```

### Skip Navigation

Add to main layout:

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

---

## Screen Reader Support

### Screen Reader Only Content

```tsx
// Utility class for visually hidden but accessible text
// Included in Tailwind via @tailwindcss/forms or custom

<span className="sr-only">Opens in new tab</span>

// CSS implementation
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Meaningful Content

```tsx
// ✅ Good - Descriptive link text
<Link href="/settings">Account settings</Link>

// ❌ Bad - Non-descriptive
<Link href="/settings">Click here</Link>

// ✅ Good - Icon with context
<button aria-label="Delete task: Buy groceries">
  <TrashIcon aria-hidden="true" />
</button>

// ❌ Bad - No context for icon
<button>
  <TrashIcon />
</button>
```

---

## Focus Management

### Dialog Focus

```tsx
// Focus moves to dialog on open, returns on close
// Radix Dialog handles this automatically

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* First focusable element receives focus */}
    <DialogTitle>Confirm Delete</DialogTitle>
    <DialogDescription>
      Are you sure you want to delete this item?
    </DialogDescription>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Route Changes (SPA)

```tsx
// Announce page changes to screen readers
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function RouteAnnouncer() {
  const pathname = usePathname();
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get page title or generate from pathname
    const pageTitle = document.title || pathname;
    
    if (announcerRef.current) {
      announcerRef.current.textContent = `Navigated to ${pageTitle}`;
    }
  }, [pathname]);

  return (
    <div
      ref={announcerRef}
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
```

---

## Testing Requirements

### Manual Testing Checklist

Before submitting any UI PR:

- [ ] **Keyboard only**: Navigate entire feature using only keyboard
- [ ] **Screen reader**: Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] **Zoom**: Test at 200% browser zoom
- [ ] **Color blindness**: Use simulator to check color usage
- [ ] **Reduced motion**: Test with `prefers-reduced-motion: reduce`
- [ ] **High contrast**: Test with high contrast mode enabled

### Screen Reader Testing

```bash
# macOS - Enable VoiceOver
# Cmd + F5

# Test commands:
# VO + Right Arrow - Next element
# VO + Left Arrow - Previous element
# VO + Space - Activate
# VO + U - Rotor (headings, links, etc.)
```

---

## Automated Testing

### axe-core Integration

```typescript
// vitest.setup.ts
import "@testing-library/jest-dom";
import { configureAxe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// Configure axe with WCAG 2.1 AA rules
export const axe = configureAxe({
  rules: {
    // Ensure color contrast
    "color-contrast": { enabled: true },
    // Ensure ARIA is valid
    "aria-allowed-attr": { enabled: true },
    "aria-valid-attr-value": { enabled: true },
  },
});
```

### Component Accessibility Tests

```typescript
import { render } from "@testing-library/react";
import { axe } from "@/test/setup";
import { Button } from "./button";

describe("Button accessibility", () => {
  it("should have no accessibility violations", async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no violations when disabled", async () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no violations as icon button", async () => {
    const { container } = render(
      <Button aria-label="Close">
        <XIcon aria-hidden="true" />
      </Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### E2E Accessibility Testing

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("homepage should have no accessibility violations", async ({ page }) => {
    await page.goto("/");
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("dashboard should have no accessibility violations", async ({ page }) => {
    await page.goto("/dashboard");
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### CI Pipeline Integration

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: pnpm install
        
      - name: Run accessibility tests
        run: pnpm test:a11y
        
      - name: Run E2E accessibility tests
        run: pnpm test:e2e:a11y
```

---

## Common Patterns

### Accessible Form Pattern

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function AccessibleForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form 
      onSubmit={form.handleSubmit(onSubmit)}
      aria-label="Contact form"
      noValidate // Use JS validation for better UX
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">
            Name <span aria-hidden="true" className="text-destructive">*</span>
            <span className="sr-only">(required)</span>
          </Label>
          <Input
            id="name"
            {...form.register("name")}
            aria-required="true"
            aria-invalid={!!form.formState.errors.name}
            aria-describedby={
              form.formState.errors.name ? "name-error" : undefined
            }
          />
          {form.formState.errors.name && (
            <p id="name-error" role="alert" className="text-sm text-destructive mt-1">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? (
          <>
            <Spinner aria-hidden="true" className="mr-2" />
            <span className="sr-only">Submitting form...</span>
            Submitting...
          </>
        ) : (
          "Submit"
        )}
      </Button>
    </form>
  );
}
```

### Accessible Data Table

```tsx
<div role="region" aria-label="Task list" tabIndex={0}>
  <Table>
    <TableCaption>A list of your recent tasks</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead scope="col">Task</TableHead>
        <TableHead scope="col">Status</TableHead>
        <TableHead scope="col">Due Date</TableHead>
        <TableHead scope="col">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {tasks.map((task) => (
        <TableRow key={task.id}>
          <TableCell>{task.title}</TableCell>
          <TableCell>
            <Badge variant={task.status}>
              {getStatusIcon(task.status)}
              {task.status}
            </Badge>
          </TableCell>
          <TableCell>
            <time dateTime={task.dueDate.toISOString()}>
              {formatDate(task.dueDate)}
            </time>
          </TableCell>
          <TableCell>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Edit task: ${task.title}`}
            >
              <EditIcon aria-hidden="true" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### Reduced Motion Support

```tsx
// hooks/useReducedMotion.ts
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return prefersReducedMotion;
}

// Usage in component
const prefersReducedMotion = useReducedMotion();

<motion.div
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
/>
```

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [Inclusive Components](https://inclusive-components.design/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-18 | Initial accessibility standards document | AI Agent |
