---
name: mark-user-verified
description: Mark an already-audited credit card as manually reviewed and verified by the user. Use when the user says a card is verified by them, reviewed by them, or asks to mark a card verified without changing the underlying audited benefits.
---

# Mark User Verified

Use this skill when the card data is already audited and the user only wants to record that they have manually verified it.

## Workflow

1. Open the target card JSON under `data/cards/<issuer>/<card-id>.json`.
2. Find the reviewer note in `internalNotes`.
3. Replace:
   - `"The card is audited from official ... but is not yet marked as manually verified by user."`
   with
   - `"Card details manually reviewed and verified by user on YYYY-MM-DD."`
4. Update `lastVerified` to the same review date if it is older.
5. Do not change rewards, lounges, fees, exclusions, or other product facts unless the user asked for those separately.
6. Stage only the intended card file, commit, and push if requested.
7. Restart the dev server on port `3001` after the change when working in this repo.

## Notes

- Keep the wording of the verification note consistent across cards.
- This skill is for review-state tracking only, not for auditing card details from issuer sources.
- If the card has not been officially audited yet, use `verify-card-details` first instead of this skill.
