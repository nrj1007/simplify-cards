"use client";

import { useMemo, useState } from "react";
import { MessageSquareText, ThumbsDown, ThumbsUp, X } from "lucide-react";
import type { RecommendationInput } from "@/lib/types";
import { getDeviceType, getOrCreateSessionId } from "@/lib/analytics-client";

type Props = {
  query: string;
  summary: string;
  cardIds: string[];
  input: RecommendationInput;
  returnTo: string;
  returnAnchor?: string;
  savedFeedback?: "up" | "down" | null;
  feedbackError?: boolean;
  readStatusFromUrl?: boolean;
  source?: "ask" | "details";
  label?: string;
};

export default function AskFeedback({
  query,
  summary,
  cardIds,
  input,
  returnTo,
  returnAnchor = "",
  savedFeedback,
  feedbackError = false,
  readStatusFromUrl = false,
  source = "ask",
  label = "Was this helpful?"
}: Props) {
  const [showDownFeedback, setShowDownFeedback] = useState(false);
  const [urlStatus] = useState<{ savedFeedback: "up" | "down" | null; feedbackError: boolean }>(() => {
    if (!readStatusFromUrl || typeof window === "undefined") {
      return { savedFeedback: null, feedbackError: false };
    }

    const params = new URLSearchParams(window.location.search);
    const feedback = params.get("feedbackSaved");
    return {
      savedFeedback: feedback === "up" || feedback === "down" ? feedback : null,
      feedbackError: params.get("feedbackError") === "1"
    };
  });
  const analyticsContext = useMemo(
    () => ({
      sessionId: getOrCreateSessionId(),
      deviceType: getDeviceType(),
      referrer: typeof document === "undefined" ? "" : document.referrer || ""
    }),
    []
  );
  const resolvedSavedFeedback = savedFeedback ?? urlStatus.savedFeedback;
  const resolvedFeedbackError = feedbackError || urlStatus.feedbackError;

  return (
    <>
      <form action="/feedback" className="ask-feedback" method="POST">
        <input name="query" type="hidden" value={query} />
        <input name="summary" type="hidden" value={summary} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="returnAnchor" type="hidden" value={returnAnchor} />
        <input name="input" type="hidden" value={JSON.stringify(input)} />
        <input name="source" type="hidden" value={source} />
        <input name="analyticsSessionId" type="hidden" value={analyticsContext.sessionId} />
        <input name="analyticsDeviceType" type="hidden" value={analyticsContext.deviceType} />
        <input name="analyticsReferrer" type="hidden" value={analyticsContext.referrer} />
        {cardIds.map((cardId) => (
          <input key={cardId} name="cardId" type="hidden" value={cardId} />
        ))}

        <span className="ask-feedback-label">{label}</span>
        <div className="ask-feedback-actions">
          <button
            className={`ask-feedback-button${resolvedSavedFeedback === "up" ? " ask-feedback-button-active" : ""}`}
            name="feedback"
            type="submit"
            value="up"
          >
            <ThumbsUp size={14} />
            <span>{resolvedSavedFeedback === "up" ? "Yes saved" : "Yes"}</span>
          </button>
          <button
            className={`ask-feedback-button${resolvedSavedFeedback === "down" ? " ask-feedback-button-active" : ""}`}
            onClick={() => setShowDownFeedback(true)}
            type="button"
          >
            <ThumbsDown size={14} />
            <span>{resolvedSavedFeedback === "down" ? "No saved" : "No"}</span>
          </button>
        </div>
        <div className="ask-feedback-status" aria-live="polite">
          {resolvedSavedFeedback === "up" ? <span className="ask-feedback-message ask-feedback-success">Marked helpful. Thanks.</span> : null}
          {resolvedSavedFeedback === "down" ? (
            <span className="ask-feedback-message ask-feedback-success">Marked not helpful. Thanks.</span>
          ) : null}
          {!resolvedSavedFeedback ? <span className="ask-feedback-message">Tap Yes or No to send quick feedback.</span> : null}
          {resolvedFeedbackError ? (
            <span className="ask-feedback-message ask-feedback-error">Feedback could not be saved on the server.</span>
          ) : null}
        </div>
      </form>

      {showDownFeedback ? (
        <div className="feedback-modal-backdrop" role="presentation" onClick={() => setShowDownFeedback(false)}>
          <div
            aria-labelledby="feedback-modal-title"
            aria-modal="true"
            className="feedback-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="feedback-modal-head">
              <div>
                <h3 id="feedback-modal-title">What felt off?</h3>
                <p className="muted">Optional, but helpful.</p>
              </div>
              <button
                aria-label="Close feedback form"
                className="feedback-modal-close"
                onClick={() => setShowDownFeedback(false)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            <form action="/feedback" className="feedback-modal-form" method="POST">
              <input name="query" type="hidden" value={query} />
              <input name="summary" type="hidden" value={summary} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <input name="returnAnchor" type="hidden" value={returnAnchor} />
              <input name="input" type="hidden" value={JSON.stringify(input)} />
              <input name="source" type="hidden" value={source} />
              <input name="analyticsSessionId" type="hidden" value={analyticsContext.sessionId} />
              <input name="analyticsDeviceType" type="hidden" value={analyticsContext.deviceType} />
              <input name="analyticsReferrer" type="hidden" value={analyticsContext.referrer} />
              {cardIds.map((cardId) => (
                <input key={`down-${cardId}`} name="cardId" type="hidden" value={cardId} />
              ))}
              <label className="feedback-modal-label" htmlFor="feedback-comment">
                <MessageSquareText size={15} />
                <span>Tell us what went wrong</span>
              </label>
              <textarea
                className="feedback-modal-textarea"
                id="feedback-comment"
                name="comment"
                placeholder="Ranking felt off, missing detail, wrong card, too generic, etc."
                rows={5}
              />
              <div className="feedback-modal-actions">
                <button className="button secondary" onClick={() => setShowDownFeedback(false)} type="button">
                  Cancel
                </button>
                <button className="button" name="feedback" type="submit" value="down">
                  Submit No
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
