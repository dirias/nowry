/**
 * Centralized prompt constants for the application
 */

export const EXTRACT_VOCABULARY_PROMPT =
  "Extract ONLY the vocabulary terms present in the text. Format is 'Term : Definition' or similar. Return a JSON array where 'title' is the Term and 'content' is the Definition. Do NOT generate new terms. Do NOT add definitions not present in the text."

export const DEFAULT_CARD_GEN_PROMPT =
  "Generate study cards from the text. Return a JSON array where each object has 'title' (the question or concept) and 'content' (the answer or definition). Do not include any other text."
