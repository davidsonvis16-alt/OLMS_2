import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import Link from "@/components/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/icons";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams) as Record<string, string | undefined>;
  const code = (params.code ?? "").toUpperCase().slice(0, 64);
  const { error } = searchParams;
  const { data: co } = await supabaseAdmin().from("companies").select("name").eq("join_code", code).maybeSingle();
  const { user } = await getSession();
  return { code, error, co, signedIn: !!user };
}

export default function Join() {
  const { code, error, co, signedIn } = useLoaderData<typeof loader>();
  return (
    <>
      <SiteHeader />
      <main id="main" className="verify-page">
        <div className="wrap verify-card">
          <span className="badge-ico"><Icon name="users" /></span>
          {co ? (
            <>
              <span className="micro">Staff invitation · <span className="mono">{code}</span></span>
              <h1 className="h-l" style={{ marginTop: 16 }}>Join {co.name} on Aspire.</h1>
              <p className="lede">{co.name} has invited you to do your food safety, hygiene and health &amp; safety training. While their account is active, your certificates are covered by your employer.</p>
              {error && <p className="alert alert--error" style={{ marginTop: 24 }}>{error}</p>}
              <div className="row" style={{ marginTop: 32 }}>
                {signedIn ? (
                  <form method="post" action="/do/joinCompany"><input type="hidden" name="code" value={code} /><button className="cta" type="submit"><span>Join {co.name}</span><i><Icon name="arrow" /></i></button></form>
                ) : (
                  <>
                    <Link className="cta" href={`/signup?next=/join/${code}`}><span>Create a free account</span><i><Icon name="arrow" /></i></Link>
                    <Link className="btn btn--line btn--lg" href={`/login?next=/join/${code}`}>I already have an account</Link>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="micro">Staff invitation</span>
              <h1 className="h-l" style={{ marginTop: 16 }}>Invite not found.</h1>
              <p className="lede">This invite link isn&apos;t valid any more. Ask your manager to send it again.</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
