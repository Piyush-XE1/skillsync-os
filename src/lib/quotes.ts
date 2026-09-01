/**
 * A small curated library of engineering & growth quotes.
 * `dailyQuote` picks deterministically from the date so every day has one
 * "insight of the day" without any network or randomness.
 */

export type Quote = {
  text: string;
  author: string;
};

export const QUOTES: Quote[] = [
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
  {
    text: "Programs must be written for people to read, and only incidentally for machines to execute.",
    author: "Harold Abelson",
  },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  {
    text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    author: "Martin Fowler",
  },
  { text: "Premature optimization is the root of all evil.", author: "Donald Knuth" },
  { text: "The only way to go fast is to go well.", author: "Robert C. Martin" },
  {
    text: "Learning is a treasure that will follow its owner everywhere.",
    author: "Chinese proverb",
  },
  {
    text: "It's not that I'm so smart, it's just that I stay with problems longer.",
    author: "Albert Einstein",
  },
  { text: "Code never lies, comments sometimes do.", author: "Ron Jeffries" },
  { text: "Fix the cause, not the symptom.", author: "Steve Maguire" },
  {
    text: "If debugging is the process of removing bugs, then programming must be the process of putting them in.",
    author: "Edsger W. Dijkstra",
  },
  {
    text: "The computer was born to solve problems that did not exist before.",
    author: "Bill Gates",
  },
  { text: "Small steps every day add up to big results.", author: "Anonymous" },
  {
    text: "Software is a great combination between artistry and engineering.",
    author: "Bill Gates",
  },
  {
    text: "Great things are done by a series of small things brought together.",
    author: "Vincent van Gogh",
  },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  {
    text: "The only way to learn a new programming language is by writing programs in it.",
    author: "Dennis Ritchie",
  },
  { text: "Testing shows the presence, not the absence, of bugs.", author: "Edsger W. Dijkstra" },
  {
    text: "Controlling complexity is the essence of computer programming.",
    author: "Brian Kernighan",
  },
  {
    text: "I'm not afraid of storms, for I'm learning how to sail my ship.",
    author: "Louisa May Alcott",
  },
];

/** Deterministic daily quote: same input date → same quote, stable across reloads. */
export function dailyQuote(dateISO: string): Quote {
  let hash = 0;
  for (let i = 0; i < dateISO.length; i++) {
    hash = (hash * 31 + dateISO.charCodeAt(i)) >>> 0;
  }
  return QUOTES[hash % QUOTES.length];
}
