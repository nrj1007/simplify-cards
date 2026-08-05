"use client";

const WHATSAPP_CHANNEL_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL?.trim() ?? "https://chat.whatsapp.com/HRIXZtKlzH5B0EAvOag27L";

function WhatsAppLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2a9.83 9.83 0 0 0-8.49 14.78L2 22l5.38-1.42A9.91 9.91 0 1 0 12 2Zm0 17.8a7.89 7.89 0 0 1-4.02-1.1l-.29-.17-3.19.84.85-3.1-.19-.3A7.79 7.79 0 1 1 12 19.8Zm4.33-5.9c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.55.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.17-.71-.63-1.19-1.4-1.33-1.64-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.28-.75-1.75-.2-.47-.4-.4-.55-.41h-.46c-.16 0-.42.06-.65.3-.22.24-.85.82-.85 2s.87 2.32.99 2.48c.12.16 1.71 2.57 4.16 3.6.58.25 1.03.39 1.39.5.58.18 1.11.16 1.53.1.47-.07 1.42-.57 1.62-1.11.2-.55.2-1.01.14-1.11-.06-.1-.22-.16-.46-.28Z"
      />
    </svg>
  );
}

export default function WhatsAppUpdatesCta({ className = "" }: { className?: string }) {
  return (
    <aside className={`sc-whatsapp-channel-card${className ? ` ${className}` : ""}`}>
      <div>
        <div className="sc-whatsapp-channel-heading">
          <span className="sc-whatsapp-channel-icon" aria-hidden="true">
            <WhatsAppLogo size={24} />
          </span>
          <h3>Never miss a credit card update that matters</h3>
        </div>
        <p>Get timely alerts for new launches, limited-time offers, reward devaluations and airline or hotel transfer bonuses.</p>
      </div>
      {WHATSAPP_CHANNEL_URL ? (
        <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
          <WhatsAppLogo size={18} />
          Join WhatsApp Channel
        </a>
      ) : (
        <span className="sc-whatsapp-channel-disabled">
          WhatsApp channel link coming soon
        </span>
      )}
    </aside>
  );
}
