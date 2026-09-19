export const PRESETS = [
  {
    id: "leave",
    label: "Leave tracker",
    prompt:
      "Build a team leave tracker. Employees request casual or sick leave, see remaining balance, and a manager approves or returns the request. React UI plus REST API. Roles: user and admin.",
  },
  {
    id: "auth",
    label: "Auth + profile",
    prompt:
      "Build email/password sign-in, session cookie, and a profile page with name and timezone. React UI plus REST API. No social login.",
  },
  {
    id: "crud",
    label: "Issue tracker",
    prompt:
      "Build a small issue tracker: title, status (open/doing/done), assignee. List, create, and detail screens. REST API with GET/POST/PATCH.",
  },
  {
    id: "checkout",
    label: "Checkout form",
    prompt:
      "Build a checkout form: email, shipping address, payment method select (card/UPI). Order summary list. POST /api/orders. Do not collect CVV in the preview store.",
  },
  {
    id: "py",
    label: "Python FastAPI",
    prompt:
      "Build a FastAPI notes service in Python: create a note with title and body, list notes, search. REST at /api/notes.",
  },
  {
    id: "java",
    label: "Java Spring",
    prompt:
      "Build a Spring Boot leave request API in Java. Employees submit casual or sick leave. GET and POST /api/leave.",
  },
  {
    id: "go",
    label: "Go service",
    prompt:
      "Build a Go HTTP service for an issue tracker: title, status, assignee. GET and POST /api/issues.",
  },
] as const;
