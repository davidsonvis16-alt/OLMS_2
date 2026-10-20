import Link from "@/components/link";
import { Icon } from "./icons";

/** Points learners and visitors from free training to paid consultancy (the client's funnel). */
export function ConsultPromo({ title = "Running a kitchen, hotel or food business?", text = "Aspire can ready your kitchen, set up food safety systems that pass audits and improve how your operation runs." }: { title?: string; text?: string }) {
  return (
    <aside className="consult-promo" aria-label="Consultancy">
      <div>
        <span className="nh-eyebrow">Consultancy</span>
        <b>{title}</b>
        <p>{text}</p>
      </div>
      <div className="row">
        <Link className="btn btn--go" href="/consultancy#enquire">Book a consultation</Link>
        <Link className="link" href="/consultancy">See services <Icon name="arrow" /></Link>
      </div>
    </aside>
  );
}
