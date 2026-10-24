import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/forms";
import { TOOL_GROUPS, TOOLS_INTRO } from "@/lib/compliance-tools";
import { pageTitle, wa } from "@/lib/site";

export const meta = () => [
  ...pageTitle("Compliance tools"),
  { name: "description", content: "Food safety and hygiene compliance tools in Kenya: ATP hygiene monitors, HACCP thermometers, chlorine and water testers, temperature data loggers, frying oil testers and gas leak detectors." },
];

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

export default function Tools() {
  return (
    <>
      <SiteHeader current="tools" />
      <main id="main">
        <section className="nh-hero nh-hero--short" aria-labelledby="t-title">
          <div className="nh-hero-pic" aria-hidden="true"><img src="/photos/clean-kitchen.jpg" alt="" /></div>
          <div className="wrap nh-hero-in">
            <span className="nh-eyebrow">Compliance tools · Kenya</span>
            <h1 id="t-title" className="nh-title" style={{ maxWidth: "16ch" }}>{TOOLS_INTRO.title}</h1>
            <p className="nh-lede">{TOOLS_INTRO.lede}</p>
            <div className="row nh-actions">
              <a className="btn btn--go btn--lg" href="#hygiene">See the tools</a>
              <a className="btn btn--ghost btn--lg" href={wa("Hello Aspire, I'd like a quote for compliance tools.")} target="_blank" rel="noopener"><Icon name="whatsapp" />Ask for a quote</a>
            </div>
          </div>
          <div className="wrap" style={{ paddingBottom: 48 }} />
        </section>

        <section className="sec sec--night" aria-labelledby="t-digital">
          <div className="wrap band">
            <div className="band-l">
              <span className="nh-eyebrow">Aspire digital food safety solutions</span>
              <h2 className="h-l" id="t-digital">{TOOLS_INTRO.digital.title}</h2>
            </div>
            <div className="band-r"><p className="lede">{TOOLS_INTRO.digital.text}</p></div>
          </div>
        </section>

        {TOOL_GROUPS.map((g, gi) => (
          <section key={g.id} id={g.id} className={`sec${gi % 2 ? "" : " sec--bone"}`} aria-labelledby={`t-${g.id}`}>
            <div className="wrap">
              <span className="nh-eyebrow">{String(gi + 1).padStart(2, "0")} · Compliance tools</span>
              <h2 className="h-l" id={`t-${g.id}`}>{g.title}</h2>
              <p className="lede" style={{ marginTop: 14 }}>{g.intro}</p>
              <ul className="tool-grid">
                {g.tools.map((t) => (
                  <li key={t.id} className="tool">
                    <div className="tool-pic"><img src={`/tools/${t.id}.webp`} alt={t.name} loading="lazy" width={640} height={640} /></div>
                    <div className="tool-body">
                      <h3>{t.name}</h3>
                      <p>{t.text}</p>
                      <ul>{t.points.map((p) => <li key={p}>{p}</li>)}</ul>
                    </div>
                    <div className="tool-foot">
                      <b>{t.price != null ? kes(t.price) : "Price on request"}</b>
                      <a className="text-link" href={wa(`Hello Aspire, I'd like a quote for the ${t.name}.`)} target="_blank" rel="noopener">Ask for a quote</a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
      <Reveal />
    </>
  );
}
