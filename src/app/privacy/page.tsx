import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", description: `How ${SITE.name} collects, uses and protects your personal data.` };

const sections = [
  { id: "who", title: "Who we are", body: <>
    <p><b>{SITE.name}</b> (&ldquo;Aspire&rdquo;) runs this website and decides how your personal data is used. That makes us the &ldquo;data controller&rdquo; under Kenya&apos;s <b>Data Protection Act, 2019</b>.</p>
    <p>For anything about your data, <Contact />.</p>
  </> },
  { id: "collect", title: "What we collect", body: <>
    <ul>
      <li><b>Your account:</b> full name, email address, and, if you give them, your phone number and country. Your password is stored only in scrambled (hashed) form by our sign-in provider. We can&apos;t see it.</li>
      <li><b>For certificates:</b> your ID or passport number, which is printed on your certificate.</li>
      <li><b>Your learning:</b> the courses you start, the lessons you complete, your answers and marks in knowledge checks and assessments, and any assignment you submit.</li>
      <li><b>Certificates:</b> the name, ID number, course, mark, date and certificate number.</li>
      <li><b>Payments:</b> the amount, method (card or M-Pesa), date and Paystack reference. Your card number and M-Pesa PIN go only to Paystack. We never receive them.</li>
      <li><b>Company accounts:</b> the company&apos;s name and contact details, and which staff have joined.</li>
      <li><b>Messages:</b> what you send us through the enquiry forms, email or WhatsApp.</li>
      <li><b>Security:</b> your internet (IP) address, used briefly to stop abuse such as repeated sign-in attempts. If you use fingerprint or face sign-in, we only receive a security key. Your fingerprint or face never leaves your device.</li>
    </ul>
  </> },
  { id: "why", title: "Why we use it", body: <>
    <ul>
      <li><b>To provide the service you signed up for:</b> your account, courses, assessments, certificates, payments and company accounts.</li>
      <li><b>To keep certificates trustworthy:</b> so employers and inspectors can check them, and so each person has only one account.</li>
      <li><b>To keep the site safe:</b> preventing fraud, cheating and attacks.</li>
      <li><b>To meet legal duties:</b> such as keeping payment records for tax.</li>
      <li><b>To reply to you</b> when you contact us.</li>
    </ul>
    <p>We don&apos;t sell your data, and we don&apos;t use it for advertising. We will only send you marketing if you have agreed to it, and you can stop it at any time.</p>
  </> },
  { id: "share", title: "Who can see it", body: <>
    <ul>
      <li><b>You,</b> when you are signed in.</li>
      <li><b>Aspire administrators,</b> to run courses, issue certificates and help you.</li>
      <li><b>Your company account owner,</b> if you joined one: your name, email, progress, results and certificates.</li>
      <li><b>Anyone who checks a certificate</b> with its number or QR code: the holder&apos;s name, course, date, mark and a partly hidden ID number.</li>
      <li><b>The companies that run parts of our service for us:</b> Supabase (database, sign-in and file storage), Vercel (website hosting), Paystack (payments) and our email delivery provider. They may only use your data to provide their service to us.</li>
      <li><b>Authorities,</b> if the law requires it.</li>
    </ul>
    <p>Some of these providers store data on servers outside Kenya. Where that happens we rely on the safeguards the Data Protection Act requires, such as the provider&apos;s contractual data-protection commitments.</p>
  </> },
  { id: "cookies", title: "Cookies", body: <>
    <p>We use only the cookies needed to keep you signed in and the site secure. There are no advertising or tracking cookies.</p>
  </> },
  { id: "keep", title: "How long we keep it", body: <>
    <ul>
      <li><b>Your account and learning records:</b> while your account is open. When it is deleted, they are deleted too.</li>
      <li><b>Issued certificates:</b> kept after an account is deleted so they can still be verified, unless you ask us to withdraw them.</li>
      <li><b>Payment records:</b> kept for at least five years, as Kenyan tax law requires.</li>
      <li><b>Security records</b> such as IP addresses used to stop abuse: a few days.</li>
    </ul>
  </> },
  { id: "rights", title: "Your rights", body: <>
    <p>Under the Data Protection Act, 2019 you have the right to:</p>
    <ul>
      <li>be told how your data is used (this page);</li>
      <li>get a copy of your data;</li>
      <li>have wrong data corrected. You can change most details yourself in <Link href="/account">Your details</Link>;</li>
      <li>have your data deleted, including your whole account;</li>
      <li>object to, or ask us to limit, how we use your data;</li>
      <li>take your data to another provider;</li>
      <li>withdraw any consent you gave.</li>
    </ul>
    <p>To use any of these rights, <Contact />. We may need to confirm it&apos;s you first. We will respond as quickly as we can, and within the time the law allows.</p>
    <p>If you aren&apos;t happy with how we handled your data, you can complain to the <b>Office of the Data Protection Commissioner</b> (<a href="https://www.odpc.go.ke" target="_blank" rel="noopener">odpc.go.ke</a>).</p>
  </> },
  { id: "security", title: "How we protect it", body: <>
    <p>All connections to the site are encrypted. Passwords are stored only in hashed form. Each person can see only their own records, and only administrators can see learner records. Payments are checked with Paystack before any certificate is issued.</p>
  </> },
  { id: "children", title: "Children", body: <>
    <p>Our courses are for people in or preparing for work. If you are under 18, you need permission from a parent or guardian to create an account.</p>
  </> },
  { id: "changes", title: "Changes to this policy", body: <>
    <p>We may update this policy. The date at the top shows the latest version. If a change is significant we will tell signed-in users. See also our <Link href="/terms">Terms and Conditions</Link>.</p>
  </> },
];

export default function Privacy() {
  return <LegalPage title="Privacy Policy" updated="20 October 2026" sections={sections}
    intro={<p>What personal data Aspire collects, why, who can see it, and your rights under Kenya&apos;s Data Protection Act, 2019.</p>} />;
}
