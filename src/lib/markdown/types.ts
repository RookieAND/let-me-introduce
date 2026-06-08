export type CalloutType = "note" | "tip" | "warning" | "important" | "caution";

export type ListItem = { text: string; depth: number };

export type Block =
  | { kind: "h"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: "p"; text: string }
  | { kind: "code"; lang: string; body: string }
  | { kind: "quote"; lines: string[] }
  | { kind: "callout"; calloutType: CalloutType; lines: string[] }
  | { kind: "ul"; items: ListItem[] }
  | { kind: "ol"; items: ListItem[] }
  | { kind: "hr" }
  | { kind: "img"; alt: string; src: string };
