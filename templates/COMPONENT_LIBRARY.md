# Component Library

> **Purpose**: This document is the **single source of truth** for all UI components in ProjectHub. Before creating or modifying any UI element, consult this guide.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Decision Tree](#decision-tree)
3. [Design Tokens](#design-tokens)
4. [UI Primitives](#ui-primitives)
5. [Feature Components](#feature-components)
6. [Component Audit Checklist](#component-audit-checklist)
7. [Testing Requirements](#testing-requirements)
8. [Feature Flags](#feature-flags)
9. [Storybook](#storybook)

---

## Quick Reference

### When to Use What

| Need                | Component            | Storybook Path                           |
| ------------------- | -------------------- | ---------------------------------------- |
| Status indicator    | `StatusBadge`        | `/story/statusbadge--default`            |
| Priority indicator  | `PriorityBadge`      | `/story/prioritybadge--default`          |
| Loading spinner     | `Spinner`            | `/story/ui-spinner--default`             |
| Empty data state    | `EmptyState`         | `/story/emptystate--default`             |
| Confirmation prompt | `ConfirmationDialog` | `/story/ui-confirmation-dialog--default` |
| Form in modal       | `FormDialog`         | `/story/formdialog--default`             |
| Data list           | `DataTable`          | `/story/datatable--default`              |
| Page title          | `PageHeader`         | `/story/pageheader--default`             |
| User avatar + name  | `MemberCard`         | `/story/membercard--default`             |

---

## Decision Tree

```
Need to render UI?
│
├─► Does a component exist in components/ui/?
│   ├─► YES: Use it with existing variants
│   │   └─► Need different behavior?
│   │       ├─► Can be achieved with props? → Use props
│   │       └─► Cannot? → Add variant, update Storybook + tests
│   │
│   └─► NO: Check Feature Components below
│       ├─► Exists? → Use it
│       └─► Doesn't exist?
│           │
│           ├─► Is it a one-off? → Ask: "Will this be used again?"
│           │   ├─► YES → Create new component with:
│           │   │         • Feature flag
│           │   │         • Storybook story
│           │   │         • Unit tests + snapshots
│           │   │
│           │   └─► NO → Implement inline (rare, justify in PR)
│           │
│           └─► Create new component (follow Component Creation Workflow)
```

---

## Design Tokens

All design tokens are centralized in `lib/design-tokens.ts`. **Never hardcode colors or sizes.**

### Usage

```typescript
import {
  statusColors,
  priorityColors,
  getAvatarGradient,
  badgeSizes,
  spinnerSizes
} from "@/lib/design-tokens";

// Status colors
<Badge className={statusColors["in-progress"]}>In Progress</Badge>

// Priority colors
<Badge className={priorityColors.high}>High</Badge>

// Avatar gradient (deterministic by name)
<Avatar className={getAvatarGradient(user.name)}>
  {initials}
</Avatar>

// Sizes
<div className={badgeSizes.md}>...</div>
<div className={spinnerSizes.lg}>...</div>
```

### Available Tokens

| Token                    | Values                          | Purpose                   |
| ------------------------ | ------------------------------- | ------------------------- |
| `statusColors`           | todo, in-progress, review, done | Task status badge colors  |
| `statusLabels`           | Human-readable status names     | Display labels            |
| `statusIcons`            | Lucide icon names               | Icons for each status     |
| `priorityColors`         | low, medium, high, critical     | Priority badge colors     |
| `priorityLabels`         | Human-readable priority names   | Display labels            |
| `priorityIcons`          | Lucide icon names               | Icons for each priority   |
| `avatarGradients`        | 5 vibrant gradients             | User avatar backgrounds   |
| `avatarGradientsNeutral` | 5 neutral gradients             | Subtle avatar backgrounds |
| `badgeSizes`             | sm, md, lg                      | Badge padding/text sizes  |
| `iconSizes`              | sm, md, lg                      | Icon dimensions           |
| `spinnerSizes`           | xs, sm, md, lg, xl              | Spinner dimensions        |
| `focusRing`              | default, inset, none            | Focus state styles        |

---

## UI Primitives

Located in `components/ui/`. These are the building blocks.

### Layout & Structure

| Component         | Purpose                | Variants                                    | Test File |
| ----------------- | ---------------------- | ------------------------------------------- | --------- |
| `card.tsx`        | Content container      | Header, Title, Description, Content, Footer | -         |
| `dialog.tsx`      | Modal dialogs          | Default, with close button                  | -         |
| `sheet.tsx`       | Side panels            | Positions: top, right, bottom, left         | -         |
| `drawer.tsx`      | Bottom drawer (mobile) | Default                                     | -         |
| `tabs.tsx`        | Tab navigation         | Default                                     | -         |
| `separator.tsx`   | Visual dividers        | Horizontal, vertical                        | -         |
| `scroll-area.tsx` | Scrollable containers  | Default                                     | -         |
| `resizable.tsx`   | Resizable panels       | Default                                     | -         |
| `collapsible.tsx` | Expandable sections    | Default                                     | -         |
| `accordion.tsx`   | Multiple collapsibles  | Default                                     | -         |
| `sidebar.tsx`     | Layout sidebar         | Collapsible states                          | -         |

### Form Elements

| Component          | Purpose               | Variants                                                                            | Test File |
| ------------------ | --------------------- | ----------------------------------------------------------------------------------- | --------- |
| `button.tsx`       | Actions               | default, destructive, outline, secondary, ghost, link; Sizes: default, sm, lg, icon | -         |
| `input.tsx`        | Text input            | Default                                                                             | -         |
| `textarea.tsx`     | Multi-line input      | Default                                                                             | -         |
| `select.tsx`       | Dropdown select       | Size: sm, default                                                                   | -         |
| `multi-select.tsx` | Multi-select dropdown | Default                                                                             | -         |
| `checkbox.tsx`     | Checkbox input        | Default                                                                             | -         |
| `switch.tsx`       | Toggle switch         | Default                                                                             | -         |
| `radio-group.tsx`  | Radio options         | Default                                                                             | -         |
| `slider.tsx`       | Range slider          | Default                                                                             | -         |
| `calendar.tsx`     | Date picker           | Default                                                                             | -         |
| `input-otp.tsx`    | OTP input             | Default                                                                             | -         |
| `form.tsx`         | Form primitives       | FormField, FormItem, FormLabel, FormControl, FormMessage                            | -         |
| `label.tsx`        | Form labels           | Default                                                                             | -         |

### Feedback & Display

| Component                 | Purpose              | Variants                                 | Feature Flag          | Test File                      |
| ------------------------- | -------------------- | ---------------------------------------- | --------------------- | ------------------------------ |
| `badge.tsx`               | Status labels        | default, secondary, destructive, outline | -                     | -                              |
| `alert.tsx`               | Alert messages       | default, destructive                     | -                     | -                              |
| `alert-dialog.tsx`        | Confirmation modals  | Default                                  | -                     | -                              |
| `skeleton.tsx`            | Loading placeholders | Default                                  | -                     | -                              |
| `progress.tsx`            | Progress bar         | Default                                  | -                     | -                              |
| `spinner.tsx`             | Loading spinner      | xs, sm, md, lg, xl                       | `SPINNER`             | `spinner.test.tsx`             |
| `confirmation-dialog.tsx` | Standardized confirm | default, destructive                     | `CONFIRMATION_DIALOG` | `confirmation-dialog.test.tsx` |
| `sonner.tsx`              | Toast notifications  | Default                                  | -                     | -                              |
| `tooltip.tsx`             | Tooltips             | Default                                  | -                     | -                              |
| `hover-card.tsx`          | Hover tooltips       | Default                                  | -                     | -                              |
| `popover.tsx`             | Popovers             | Default                                  | -                     | -                              |

### Navigation

| Component             | Purpose           | Variants | Test File |
| --------------------- | ----------------- | -------- | --------- |
| `dropdown-menu.tsx`   | Dropdown menus    | Default  | -         |
| `context-menu.tsx`    | Right-click menus | Default  | -         |
| `menubar.tsx`         | Menu bar          | Default  | -         |
| `navigation-menu.tsx` | Navigation        | Default  | -         |
| `breadcrumb.tsx`      | Breadcrumbs       | Default  | -         |
| `command.tsx`         | Command palette   | Default  | -         |
| `pagination.tsx`      | Page navigation   | Default  | -         |

### Data Display

| Component          | Purpose                | Variants                        | Test File |
| ------------------ | ---------------------- | ------------------------------- | --------- |
| `table.tsx`        | Data tables            | Header, Body, Row, Cell, Footer | -         |
| `avatar.tsx`       | User avatars           | Image + fallback                | -         |
| `chart.tsx`        | Data visualization     | Recharts wrapper                | -         |
| `carousel.tsx`     | Content carousel       | Default                         | -         |
| `aspect-ratio.tsx` | Aspect ratio container | Default                         | -         |

### Toggles & Groups

| Component          | Purpose             | Variants | Test File |
| ------------------ | ------------------- | -------- | --------- |
| `toggle.tsx`       | Toggle button       | Default  | -         |
| `toggle-group.tsx` | Toggle button group | Default  | -         |

---

## Feature Components

Located in `components/`. These are composed from UI primitives.

### Badges & Indicators

| Component           | Purpose            | Feature Flag   | Storybook                       | Test File              |
| ------------------- | ------------------ | -------------- | ------------------------------- | ---------------------- |
| `PriorityBadge.tsx` | Priority indicator | -              | `/story/prioritybadge--default` | -                      |
| `StatusBadge.tsx`   | Status indicator   | `STATUS_BADGE` | `/story/statusbadge--default`   | `StatusBadge.test.tsx` |

### Layout Components

| Component        | Purpose              | Feature Flag  | Storybook                    | Test File             |
| ---------------- | -------------------- | ------------- | ---------------------------- | --------------------- |
| `EmptyState.tsx` | Empty data display   | `EMPTY_STATE` | `/story/emptystate--default` | `EmptyState.test.tsx` |
| `PageHeader.tsx` | Page title + actions | `PAGE_HEADER` | `/story/pageheader--default` | `PageHeader.test.tsx` |
| `MemberCard.tsx` | User avatar + info   | `MEMBER_CARD` | `/story/membercard--default` | `MemberCard.test.tsx` |

### Data Components

| Component       | Purpose                           | Feature Flag | Storybook                   | Test File            |
| --------------- | --------------------------------- | ------------ | --------------------------- | -------------------- |
| `DataTable.tsx` | Table with sort/filter/pagination | `DATA_TABLE` | `/story/datatable--default` | `DataTable.test.tsx` |

### Form Components

| Component                | Purpose                     | Feature Flag          | Storybook                            | Test File                     |
| ------------------------ | --------------------------- | --------------------- | ------------------------------------ | ----------------------------- |
| `FormDialog.tsx`         | Dialog with form            | `FORM_DIALOG`         | `/story/formdialog--default`         | `FormDialog.test.tsx`         |
| `ConfirmationDialog.tsx` | Confirm destructive actions | `CONFIRMATION_DIALOG` | `/story/confirmationdialog--default` | `ConfirmationDialog.test.tsx` |
| `Spinner.tsx`            | Loading indicator           | `SPINNER`             | `/story/spinner--default`            | `Spinner.test.tsx`            |

### Existing Feature Components (No Flag)

| Component               | Purpose                 | Location      |
| ----------------------- | ----------------------- | ------------- |
| `TaskCard.tsx`          | Kanban task card        | `components/` |
| `TaskDialog.tsx`        | Task create/edit dialog | `components/` |
| `SprintDialog.tsx`      | Sprint create/edit      | `components/` |
| `BoardDialog.tsx`       | Board create/edit       | `components/` |
| `ColumnDialog.tsx`      | Column create/edit      | `components/` |
| `WorkspaceDialog.tsx`   | Workspace create/edit   | `components/` |
| `Header.tsx`            | App header              | `components/` |
| `Sidebar.tsx`           | App sidebar             | `components/` |
| `NotificationPanel.tsx` | Notifications list      | `components/` |

---

## Dialog Patterns

All form dialogs should follow consistent patterns for user experience.

### When to Use Each Dialog Component

| Use Case                          | Component                       | Example                     |
| --------------------------------- | ------------------------------- | --------------------------- |
| Form with multiple fields         | `FormDialog`                    | Create Sprint, Create Board |
| Destructive confirmation          | `ConfirmationDialog`            | Delete Task, Remove Member  |
| Simple confirmation               | `ConfirmationDialog`            | Confirm Action              |
| Complex form (many tabs/sections) | Custom with `Dialog` primitives | TaskDialog                  |

### FormDialog Usage

```tsx
import {
  FormDialog,
  FormDialogSection,
  FormDialogField,
  useFormDialog,
} from '@/components/FormDialog';

function CreateSprintDialog() {
  const { isOpen, isSubmitting, setIsSubmitting, open, close } = useFormDialog();
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createSprint({ name });
      close();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={open}>Create Sprint</Button>
      <FormDialog
        open={isOpen}
        onOpenChange={(open) => !open && close()}
        title="Create Sprint"
        description="Add a new sprint to your project"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitText="Create"
        gradientTitle // Use gradient for creation dialogs
        size="md"
      >
        <FormDialogField label="Name" required htmlFor="sprint-name">
          <Input
            id="sprint-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sprint 1"
          />
        </FormDialogField>
      </FormDialog>
    </>
  );
}
```

### Dialog Size Guidelines

| Size   | Max Width | Use For                           |
| ------ | --------- | --------------------------------- |
| `sm`   | 400px     | Simple confirmation, single field |
| `md`   | 500px     | Standard forms (2-5 fields)       |
| `lg`   | 600px     | Larger forms with sections        |
| `xl`   | 800px     | Complex forms, data tables        |
| `full` | 90vw      | Very large content, multi-step    |

### Title Styling

| Style    | Use For                                     | Prop                              |
| -------- | ------------------------------------------- | --------------------------------- |
| Gradient | Creation dialogs (Create Sprint, New Board) | `gradientTitle={true}`            |
| Plain    | Edit dialogs, Settings                      | `gradientTitle={false}` (default) |

### FormDialogSection

Use sections to group related fields:

```tsx
<FormDialog {...props}>
  <FormDialogSection title="Basic Info">
    <FormDialogField label="Name" required>
      <Input {...nameProps} />
    </FormDialogField>
    <FormDialogField label="Description">
      <Textarea {...descProps} />
    </FormDialogField>
  </FormDialogSection>

  <FormDialogSection title="Options">
    <FormDialogField label="Active">
      <Switch {...activeProps} />
    </FormDialogField>
  </FormDialogSection>
</FormDialog>
```

### Error Handling

Use `FormDialogField` error prop for validation:

```tsx
<FormDialogField label="Email" required error={errors.email?.message} htmlFor="email">
  <Input id="email" {...register('email')} />
</FormDialogField>
```

---

## Component Audit Checklist

Before creating or modifying a component, complete this checklist:

### Pre-Work Audit

- [ ] Checked `components/ui/` for existing primitive
- [ ] Checked Feature Components list above
- [ ] Checked Storybook for visual examples
- [ ] Verified no existing component meets the need
- [ ] If modifying: reviewed current tests and stories

### New Component Requirements

- [ ] Component file created: `components/[Name].tsx` or `components/ui/[name].tsx`
- [ ] Uses design tokens from `lib/design-tokens.ts`
- [ ] Has clear prop interface with JSDoc
- [ ] Has feature flag (if applicable)
- [ ] Storybook story created: `[Name].stories.tsx`
- [ ] Unit tests created: `[Name].test.tsx`
- [ ] Snapshot tests for each variant
- [ ] Added to this document (COMPONENT_LIBRARY.md)

### Variant Addition Requirements

- [ ] Existing tests still pass
- [ ] New variant has Storybook story
- [ ] New variant has snapshot test
- [ ] This document updated if needed

---

## Testing Requirements

Every component in the library must have comprehensive tests.

### Test File Structure

```
components/
├── StatusBadge.tsx
├── StatusBadge.stories.tsx
├── StatusBadge.test.tsx
└── __snapshots__/
    └── StatusBadge.test.tsx.snap
```

### Required Test Coverage

#### Behavioral Tests

```typescript
describe('StatusBadge', () => {
  it('should render without crashing', () => {});
  it('should render all status variants', () => {});
  it('should apply correct colors for each status', () => {});
  it('should respect size prop', () => {});
  it('should apply custom className', () => {});
  it('should handle feature flag disabled state', () => {});
  it('should handle feature flag enabled state', () => {});
});
```

#### Snapshot Tests

```typescript
describe("Snapshots", () => {
  it.each(["todo", "in-progress", "review", "done"])
    ("should match snapshot for status: %s", (status) => {
      const { container } = render(<StatusBadge status={status} />);
      expect(container).toMatchSnapshot();
    });

  it.each(["sm", "md", "lg"])
    ("should match snapshot for size: %s", (size) => {
      const { container } = render(<StatusBadge status="todo" size={size} />);
      expect(container).toMatchSnapshot();
    });
});
```

### Running Tests

```bash
# Run all component tests
pnpm test:components

# Watch mode
pnpm test:components:watch

# Update snapshots (after intentional visual changes)
pnpm test:update-snapshots
```

---

## Feature Flags

Components under development use feature flags for controlled rollout.

### Available Flags

| Flag                  | Component              | Default |
| --------------------- | ---------------------- | ------- |
| `STATUS_BADGE`        | StatusBadge            | `false` |
| `SPINNER`             | Spinner                | `false` |
| `CONFIRMATION_DIALOG` | ConfirmationDialog     | `false` |
| `EMPTY_STATE`         | EmptyState             | `false` |
| `FORM_DIALOG`         | FormDialog             | `false` |
| `DATA_TABLE`          | DataTable              | `false` |
| `PAGE_HEADER`         | PageHeader             | `false` |
| `MEMBER_CARD`         | MemberCard             | `false` |
| `DESIGN_TOKENS`       | Design token migration | `false` |

### Enabling Flags

Add to `.env.local`:

```bash
NEXT_PUBLIC_FEATURE_STATUS_BADGE=true
NEXT_PUBLIC_FEATURE_SPINNER=true
```

### Using Flags in Code

```typescript
import { isFeatureEnabled, FeatureFlag } from "@/lib/feature-flags";

function TaskRow({ task }) {
  return (
    <div>
      {isFeatureEnabled(FeatureFlag.STATUS_BADGE) ? (
        <StatusBadge status={task.status} />
      ) : (
        <LegacyStatusDisplay status={task.status} />
      )}
    </div>
  );
}
```

### Testing with Flags

```typescript
import { mockFeatureFlag, clearFeatureFlagMocks } from '@/lib/feature-flags';

describe('Component with feature flag', () => {
  afterEach(() => {
    clearFeatureFlagMocks();
  });

  it('should render new component when flag enabled', () => {
    mockFeatureFlag(FeatureFlag.STATUS_BADGE, true);
    // test new behavior
  });

  it('should render fallback when flag disabled', () => {
    mockFeatureFlag(FeatureFlag.STATUS_BADGE, false);
    // test fallback behavior
  });
});
```

---

## Storybook

Local Storybook for visual documentation and testing.

### Running Storybook

```bash
pnpm storybook
```

Opens at http://localhost:6006

### Story Structure

```typescript
// StatusBadge.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "./StatusBadge";

const meta: Meta<typeof StatusBadge> = {
  title: "Components/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["todo", "in-progress", "review", "done"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Default: Story = {
  args: {
    status: "todo",
    size: "md",
  },
};

// Additional stories for specific states
export const InProgress: Story = {
  args: {
    status: "in-progress",
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-4">
      <StatusBadge status="todo" size="sm" />
      <StatusBadge status="todo" size="md" />
      <StatusBadge status="todo" size="lg" />
    </div>
  ),
};
```

### Story Guidelines

1. **Keep stories minimal** - rely on Controls addon for testing variants
2. **One default story** per component with all props controllable
3. **Additional stories** only for complex compositions or states
4. **Use `tags: ["autodocs"]`** for auto-generated documentation
5. **Provide meaningful argTypes** with control types

---

## Changelog

| Date       | Change                                          |
| ---------- | ----------------------------------------------- |
| 2026-01-10 | Initial component library documentation created |
