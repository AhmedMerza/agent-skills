# UX Writing

## The Button Label Problem

**Never use "OK", "Submit", or "Yes/No".** Use specific verb + object patterns:

| Bad | Good | Why |
|-----|------|-----|
| OK | Save changes | Says what will happen |
| Submit | Create account | Outcome-focused |
| Yes | Delete message | Confirms the action |
| Cancel | Keep editing | Clarifies what "cancel" means |
| Click here | Download PDF | Describes the destination |

**For destructive actions**, name the destruction:
- "Delete" not "Remove" (delete is permanent, remove implies recoverable)
- "Delete 5 items" not "Delete selected" (show the count)

## Error Messages: The Formula

Every error message should answer: (1) What happened? (2) Why? (3) How to fix it?

"Email address isn't valid. Please include an @ symbol." not "Invalid input".

### Error Message Templates

| Situation | Template |
|-----------|----------|
| **Format error** | "[Field] needs to be [format]. Example: [example]" |
| **Missing required** | "Please enter [what's missing]" |
| **Permission denied** | "You don't have access to [thing]. [What to do instead]" |
| **Network error** | "We couldn't reach [thing]. Check your connection and [action]." |
| **Server error** | "Something went wrong on our end. We're looking into it. [Alternative action]" |

### Don't Blame the User

"Please enter a date in MM/DD/YYYY format" not "You entered an invalid date".

## Empty States Are Opportunities

Empty states are onboarding moments:
1. Acknowledge briefly
2. Explain the value of filling it
3. Provide a clear action

"No projects yet. Create your first one to get started." not just "No items".

### Vuetify Empty States

```vue
<v-card v-if="!items.length" variant="flat" class="text-center pa-8">
  <v-icon size="48" color="medium-emphasis">mdi-inbox-outline</v-icon>
  <div class="text-h6 mt-4">No orders yet</div>
  <div class="text-body-2 text-medium-emphasis mt-2">
    Orders will appear here once customers place them.
  </div>
  <v-btn color="primary" class="mt-4">Create order</v-btn>
</v-card>
```

## Voice vs Tone

**Voice** is your brand's personality—consistent everywhere. **Tone** adapts to the moment:

| Moment | Tone Shift |
|--------|------------|
| Success | Celebratory, brief: "Done! Your changes are live." |
| Error | Empathetic, helpful: "That didn't work. Here's what to try..." |
| Loading | Reassuring: "Saving your work..." |
| Destructive confirm | Serious, clear: "Delete this project? This can't be undone." |

**Never use humor for errors.** Users are already frustrated.

## Writing for Accessibility

- **Link text** must have standalone meaning — "View pricing plans" not "Click here"
- **Alt text** describes information, not the image — "Revenue increased 40% in Q4" not "Chart"
- Use `alt=""` for decorative images
- **Icon buttons** need `aria-label` for screen reader context

## Writing for Translation

### Plan for Expansion

| Language | Expansion |
|----------|-----------|
| German | +30% |
| French | +20% |
| Finnish | +30-40% |
| Chinese | -30% (fewer chars, but same width) |
| Arabic | RTL layout + expansion |

### Translation-Friendly Patterns

- Keep numbers separate ("New messages: 3" not "You have 3 new messages")
- Use full sentences as single strings (word order varies by language)
- Avoid abbreviations
- Give translators context about where strings appear

## Consistency: The Terminology Problem

Pick one term and stick with it:

| Inconsistent | Consistent |
|--------------|------------|
| Delete / Remove / Trash | Delete |
| Settings / Preferences / Options | Settings |
| Sign in / Log in / Enter | Sign in |
| Create / Add / New | Create |

Build a terminology glossary and enforce it.

## Confirmation Dialogs: Use Sparingly

Most confirmation dialogs are design failures—consider undo instead. When you must confirm: name the action, explain consequences, use specific button labels ("Delete project" / "Keep project", not "Yes" / "No").

## Loading States

Be specific: "Saving your draft..." not "Loading...". For long waits, set expectations or show progress.

---

**Avoid**: Jargon without explanation. Blaming users. Vague errors ("Something went wrong"). Varying terminology for variety. Humor for errors.
