// Centralized so it's a one-line bump when a newer Claude model ships.
// Sonnet balances quality and cost well for this Q&A-over-family-data workload;
// bump to an Opus model only if answer quality turns out to need it.
export const CLAUDE_MODEL = 'claude-sonnet-5'

export const DAILY_MESSAGE_LIMIT = 50

export const MAX_HISTORY_TURNS = 20

export const MAX_TOKENS = 1024
