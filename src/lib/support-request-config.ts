/**
 * Shared configuration for the Help Desk support forms.
 *
 * Both the client form (rendering) and the server action (validation) read
 * from this module so field rules can never drift apart.
 */

export const SUPPORT_INBOX_EMAIL = "admin@revuesuite.com"

export type SupportRequestType = "bug" | "support" | "feature"

export interface SupportFormField {
  key: string
  label: string
  required: boolean
  maxLength: number
  multiline?: boolean
  placeholder?: string
}

export interface SupportFormConfig {
  type: SupportRequestType
  /** Bracket tag used in the email subject, e.g. "[Bug Report] …" */
  emailTag: string
  /** Heading shown above the form. */
  heading: string
  /** One-line explanation under the heading. */
  intro: string
  /** Key of the field used as the email subject. */
  subjectField: string
  fields: SupportFormField[]
}

export const SUPPORT_REQUEST_FORMS: Record<SupportRequestType, SupportFormConfig> = {
  bug: {
    type: "bug",
    emailTag: "Bug Report",
    heading: "Report a Bug",
    intro: "Something isn't working as expected? Tell us what happened.",
    subjectField: "title",
    fields: [
      {
        key: "title",
        label: "Short description",
        required: true,
        maxLength: 200,
        placeholder: "e.g. PDF annotation disappears after saving",
      },
      {
        key: "whatHappened",
        label: "What happened?",
        required: true,
        maxLength: 5000,
        multiline: true,
        placeholder: "Describe the problem you ran into…",
      },
      {
        key: "tryingToDo",
        label: "What were you trying to do?",
        required: true,
        maxLength: 2000,
        multiline: true,
        placeholder: "e.g. I was uploading a new iteration for a client review",
      },
      {
        key: "steps",
        label: "Steps to reproduce",
        required: false,
        maxLength: 3000,
        multiline: true,
        placeholder: "1. Open a project\n2. Click …\n3. …",
      },
      {
        key: "expected",
        label: "Expected result",
        required: false,
        maxLength: 2000,
        multiline: true,
        placeholder: "What should have happened?",
      },
      {
        key: "actual",
        label: "Actual result",
        required: false,
        maxLength: 2000,
        multiline: true,
        placeholder: "What happened instead?",
      },
    ],
  },
  support: {
    type: "support",
    emailTag: "Support",
    heading: "Contact Support",
    intro: "Need help with your account or have a question?",
    subjectField: "subject",
    fields: [
      {
        key: "subject",
        label: "Subject",
        required: true,
        maxLength: 200,
        placeholder: "e.g. Question about organization permissions",
      },
      {
        key: "message",
        label: "Message",
        required: true,
        maxLength: 5000,
        multiline: true,
        placeholder: "Tell us how we can help…",
      },
    ],
  },
  feature: {
    type: "feature",
    emailTag: "Feature Request",
    heading: "Request a Feature",
    intro: "Have an idea that would make RevueSuite better?",
    subjectField: "title",
    fields: [
      {
        key: "title",
        label: "Feature title",
        required: true,
        maxLength: 200,
        placeholder: "e.g. Microsoft SSO",
      },
      {
        key: "description",
        label: "What would you like?",
        required: true,
        maxLength: 5000,
        multiline: true,
        placeholder: "Describe the feature you have in mind…",
      },
      {
        key: "why",
        label: "Why would this be useful?",
        required: false,
        maxLength: 3000,
        multiline: true,
        placeholder: "What problem would it solve for you or your team?",
      },
      {
        key: "useCase",
        label: "Example / use case",
        required: false,
        maxLength: 3000,
        multiline: true,
        placeholder: "Walk us through a situation where you'd use it",
      },
    ],
  },
}
