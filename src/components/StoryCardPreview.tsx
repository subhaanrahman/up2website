import { forwardRef } from "react";
import { Calendar, MapPin } from "lucide-react";

interface StoryCardPreviewProps {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventImage?: string;
}

const StoryCardPreview = forwardRef<HTMLDivElement, StoryCardPreviewProps>(
  ({ eventTitle, eventDate, eventLocation, eventImage }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: 1080 / 3,
          height: 1920 / 3,
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          background: "#0a0a0a",
        }}
      >
        {/* Cover image */}
        {eventImage && (
          <img
            src={eventImage}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.55,
            }}
          />
        )}

        {/* Gradient overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.95) 100%)",
          }}
        />

        {/* Top badge */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            right: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            You're Invited
          </div>
        </div>

        {/* Bottom content */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Event title */}
          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#fff",
              margin: 0,
              lineHeight: 1.15,
              textTransform: "capitalize",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            {eventTitle}
          </h2>

          {/* Date & location */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {eventDate && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={14} color="#c084fc" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {eventDate}
                </span>
              </div>
            )}
            {eventLocation && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={14} color="#c084fc" />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {eventLocation}
                </span>
              </div>
            )}
          </div>

          {/* CTA pill */}
          <div
            style={{
              marginTop: 8,
              background: "linear-gradient(135deg, #a855f7, #7c3aed)",
              borderRadius: 999,
              padding: "10px 0",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: 0.5,
              boxShadow: "0 4px 20px rgba(168,85,247,0.4)",
            }}
          >
            Swipe Up to RSVP
          </div>

          {/* Branding */}
          <p
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "rgba(255,255,255,0.35)",
              margin: "4px 0 0",
              fontWeight: 500,
              letterSpacing: 1,
            }}
          >
            SOIRÉE
          </p>
        </div>
      </div>
    );
  }
);

StoryCardPreview.displayName = "StoryCardPreview";

export default StoryCardPreview;
