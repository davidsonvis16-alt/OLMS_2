import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { AppShell, PageHead } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { SITE, companyActive, usd, wa, pageTitle } from "@/lib/site";
import { mpesaAvailable, paymentsAvailable } from "@/lib/paystack";
import { seatPrice } from "@/app/company-actions";

export const meta = () => pageTitle("Company account");

export async function loader({ request }: LoaderFunctionArgs) {
  const sp = Object.fromEntries(new URL(request.url).searchParams) as Record<string, string | undefined>;
  const { profile } = await requireUser("/company");
  const db = supabaseAdmin();
  const price = await seatPrice();
  const notice = { error: sp.error ?? null, pay: sp.pay ?? null };

  if (!profile.company_id) return { view: "none" as const, notice, price, phone: profile.phone };

  const { data: co } = await db.from("companies").select("id,name,seats,paid_until,join_code").eq("id", profile.company_id).single();
  const active = companyActive(co);
  // Staff see only their company's name and whether it's active; the invite code and team list are for the owner.
  if (profile.company_role !== "owner") return { view: "member" as const, notice, co: { name: co?.name ?? null, paid_until: co?.paid_until ?? null }, active };

  const { data: staff } = await db.from("profiles").select("id,full_name,email,company_role,created_at").eq("company_id", co!.id).order("created_at");
  const staffIds = (staff ?? []).map((s) => s.id);
  const [{ data: prog }, { data: certs }] = await Promise.all([
    db.from("module_progress").select("user_id,completed_at").in("user_id", staffIds),
    db.from("certificates").select("user_id,course_title,serial").in("user_id", staffIds),
  ]);
  const ids = new Set(staffIds);
  const doneBy = new Map<string, number>(); for (const p of prog ?? []) if (ids.has(p.user_id) && p.completed_at) doneBy.set(p.user_id, (doneBy.get(p.user_id) ?? 0) + 1);
  const certBy = new Map<string, string[]>(); for (const c of certs ?? []) if (ids.has(c.user_id)) certBy.set(c.user_id, [...(certBy.get(c.user_id) ?? []), c.course_title]);
  const link = `${SITE.url.replace(/\/$/, "")}/join/${co!.join_code}`;
  return { view: "owner" as const, notice, price, co: co!, active, staff: staff ?? [], doneBy, certBy, used: staff?.length ?? 0, link, mpesa: mpesaAvailable(), payable: paymentsAvailable() };
}

export default function CompanyPage() {
  const d = useLoaderData<typeof loader>();
  const sp = d.notice;
  if (d.view === "none") {
    const { price } = d;
    return (
      <AppShell active="company">
        <PageHead eyebrow="For employers" title="Train your staff with a company account" />
        {sp.error && <p className="alert alert--error">{sp.error}</p>}
        <div className="two-col">
          <div className="note-card">
            <h3>How it works</h3>
            <ol className="steps steps--tight">
              <li><div><h4>Create your company</h4><p>You become the account owner.</p></div></li>
              <li><div><h4>Buy staff seats for 12 months</h4><p>{price != null ? `${usd(price)} per seat per year.` : "Seat pricing is confirmed on request."} Pay by card or M-Pesa.</p></div></li>
              <li><div><h4>Share your invite link</h4><p>Staff sign up and join with one tap. Their certificates are included.</p></div></li>
              <li><div><h4>Track progress</h4><p>See who has started, finished and been certified.</p></div></li>
            </ol>
          </div>
          <form method="post" action="/do/createCompany" className="form-card">
            <h3>Create a company account</h3>
            <div className="field"><label htmlFor="name">Company name</label><input id="name" name="name" required placeholder="e.g. Serena Beach Hotel" /></div>
            <div className="field" style={{ marginTop: 14 }}><label htmlFor="phone">Contact phone</label><input id="phone" name="phone" type="tel" defaultValue={d.phone ?? ""} /></div>
            <button className="btn btn--green btn--block" style={{ marginTop: 18 }}><Icon name="users" />Create company</button>
            <p className="form-note">Joining your employer instead? Ask them for their invite link.</p>
          </form>
        </div>
      </AppShell>
    );
  }
  if (d.view === "member") {
    const { co, active } = d;
    return (
      <AppShell active="company">
        <PageHead eyebrow="Company" title={co?.name ?? "Your company"} />
        <div className={`alert ${active ? "alert--ok" : "alert--warn"} row-alert`}><Icon name="users" /><span>{active ? `You're training with ${co?.name}. Your certificates are covered until ${new Date(co!.paid_until + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` : `${co?.name}'s account has expired. Ask your manager to renew it.`}</span></div>
      </AppShell>
    );
  }
  const { price, co, active, staff, doneBy, certBy, used, link, mpesa, payable } = d;
  return (
    <AppShell active="company" wide>
      <PageHead eyebrow="Company account" title={co!.name} />
      {sp.error && <p className="alert alert--error">{sp.error}</p>}
      {sp.pay === "ok" && <p className="alert alert--ok">Payment received. Your seats are active.</p>}
      {sp.pay === "failed" && <p className="alert alert--error">That payment didn&apos;t go through. You haven&apos;t been charged.</p>}

      <div className="stat-row">
        <div className="stat"><b>{used}<small> / {co!.seats}</small></b><span>Seats used</span></div>
        <div className="stat"><b className={active ? "ok" : "bad"}>{active ? "Active" : co!.paid_until ? "Expired" : "Not active"}</b><span>{co!.paid_until ? `Until ${new Date(co!.paid_until + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "Buy seats to activate"}</span></div>
        <div className="stat"><b>{[...certBy.values()].reduce((n, a) => n + a.length, 0)}</b><span>Staff certificates</span></div>
      </div>

      <div className="two-col">
        <div className="form-card">
          <h3>Invite your staff</h3>
          <p>Share this link. Staff create a free account and join {co!.name} automatically.</p>
          <div className="invite"><code>{link}</code><CopyButton text={link} label="Copy link" /></div>
          <a className="btn btn--wa btn--sm" style={{ marginTop: 12 }} href={`https://wa.me/?text=${encodeURIComponent(`Join ${co!.name} on Aspire to do your food safety & hygiene training: ${link}`)}`} target="_blank" rel="noopener"><Icon name="whatsapp" />Share on WhatsApp</a>
        </div>
        <form method="post" action="/do/buySeats" className="form-card">
          <h3>{active ? "Change or renew seats" : "Buy staff seats"}</h3>
          {price == null || !payable ? (
            <>
              <p>{price == null ? "Seat pricing is confirmed on request." : "Payment isn't available yet. Message us and we'll set up your seats."}</p>
              <a className="btn btn--wa" href={wa(`Hello Aspire, I'd like seats for ${co!.name}.`)} target="_blank" rel="noopener"><Icon name="whatsapp" />Ask about pricing</a>
            </>
          ) : (
            <>
              <p>{usd(price)} per seat for 12 months. Paying sets your seat count and restarts the 12 months from today.</p>
              <div className="field"><label htmlFor="seats">Number of seats</label><input id="seats" name="seats" type="number" min={Math.max(1, used)} defaultValue={Math.max(co!.seats, used, 5)} required /></div>
              <div className="pay-buttons" style={{ marginTop: 14 }}>
                <button className="btn btn--green btn--block" name="method" value="card"><Icon name="card" />Pay by card (USD)</button>
                {mpesa && <button className="btn btn--mpesa btn--block" name="method" value="mpesa"><img src="/brand/mpesa.svg" alt="" />Pay with M-Pesa (KES)</button>}
              </div>
            </>
          )}
        </form>
      </div>

      <h2 className="h3 section-title">Your team</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Modules done</th><th>Certificates</th><th /></tr></thead>
          <tbody>
            {(staff ?? []).map((s) => (
              <tr key={s.id}>
                <td>{s.full_name || "—"}{s.company_role === "owner" && <span className="chip chip--sm">Owner</span>}</td>
                <td>{s.email}</td>
                <td>{doneBy.get(s.id) ?? 0}</td>
                <td>{certBy.get(s.id)?.join(", ") || "—"}</td>
                <td>{s.company_role === "member" && <form method="post" action="/do/removeMember"><input type="hidden" name="user_id" value={s.id} /><button className="link-btn">Remove</button></form>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

