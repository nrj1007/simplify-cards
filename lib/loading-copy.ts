export const loadingCopy = {
  ask: {
    title: "Preparing your answer...",
    subtitle: "Matching your question with relevant cards and trade-offs."
  },
  recommend: {
    title: "Building your shortlist...",
    subtitle: "Ranking cards based on fees, benefits and fit."
  },
  cardDetail: {
    title: "Preparing card details...",
    subtitle: "Checking fees, rewards, lounge rules and exclusions."
  },
  compare: {
    title: "Comparing cards...",
    subtitle: "Highlighting fees, rewards, caveats and key differences."
  },
  calculator: {
    title: "Calculating estimated value...",
    subtitle: "Applying rewards, milestones and redemption assumptions."
  },
  cards: {
    title: "Loading cards...",
    subtitle: "Preparing card fees, benefits and categories."
  },
  redirect: {
    title: "Opening issuer page...",
    subtitle: "You'll be redirected to the bank's website."
  }
} as const;

export type LoadingCopyKey = keyof typeof loadingCopy;
