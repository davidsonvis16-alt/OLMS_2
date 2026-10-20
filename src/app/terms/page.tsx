import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms and Conditions", description: `The terms for using ${SITE.name} online training, certificates and company accounts.` };

const sections = [
  { id: "about", title: "About these terms", body: <>
    <p>These terms apply when you use this website, create an account, study a course, take an assessment, buy a certificate or manage a company account with <b>{SITE.name}</b> (&ldquo;Aspire&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).</p>
    <p>By creating an account you agree to these terms and to our <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t create an account.</p>
  </> },
  { id: "accounts", title: "Your account", body: <>
    <ul>
      <li><b>One account per person.</b> Each person may have only one account. Don&apos;t create extra accounts, for example to retake assessments or to get more than one certificate for the same course.</li>
      <li><b>Accurate details.</b> Your full name and ID or passport number are printed on your certificates. Enter them exactly as they appear on your official ID.</li>
      <li><b>Your account is yours alone.</b> Don&apos;t share your sign-in or let anyone else study or sit assessments for you. Keep your password safe and tell us at once if you think someone else has used your account.</li>
      <li>You must be at least 18, or have permission from a parent or guardian.</li>
    </ul>
    <p>An ID or passport number or phone number can belong to only one account. We may refuse a sign-up, or suspend or delete an account, if it appears to duplicate another one.</p>
  </> },
  { id: "courses", title: "Courses", body: <>
    <p>Studying our online courses is free. Courses are for training and general information. They don&apos;t replace professional advice on your particular premises, and they don&apos;t guarantee the result of any inspection or audit.</p>
    <p>We may update, improve, pause or withdraw courses at any time. If a course you started changes, your progress may need to restart for the new version.</p>
  </> },
  { id: "certificates", title: "Assessments and certificates", body: <>
    <ul>
      <li>Each course ends with a final assessment. The pass mark is <b>{SITE.passMark}%</b> and you may retake it as often as you need.</li>
      <li>After you pass, you can buy the certificate for that course at the price shown on the course page. Staff covered by an active company account receive it at no charge to them.</li>
      <li>Check your name and ID number before you pay: the certificate is issued exactly as you enter them.</li>
      <li>Every certificate has a unique number and QR code. Anyone who has the number can check it on our <Link href="/verify">verification page</Link>, which shows the holder&apos;s name, the course, the date, the mark and part of the ID number.</li>
      <li>We may withdraw a certificate that was obtained dishonestly (for example by someone else sitting the assessment, by sharing answers, or with false details). A withdrawn certificate shows as not valid when checked.</li>
    </ul>
  </> },
  { id: "payments", title: "Payments and refunds", body: <>
    <p>Payments are processed securely by <b>Paystack</b> by card or M-Pesa. Card payments are charged in US dollars. M-Pesa payments are charged in Kenyan shillings at the amount shown before you pay. We never see or store your card number or M-Pesa PIN.</p>
    <p>The certificate fee pays for issuing your certificate, so it can&apos;t be refunded once the certificate has been issued. If you were charged twice, or charged but did not receive your certificate, contact us within 30 days and we will issue the certificate or refund the payment.</p>
  </> },
  { id: "companies", title: "Company accounts", body: <>
    <ul>
      <li>A company owner buys certificate seats for their staff. Seats and the account period are as shown at the time of purchase.</li>
      <li>Staff join with the company&apos;s join code. Owners must keep the code private, and are responsible for who they invite.</li>
      <li>When you join a company account, the owner can see your name, email, course progress, results and certificates. You can leave by asking the owner to remove you.</li>
    </ul>
  </> },
  { id: "use", title: "Acceptable use", body: <>
    <p>You must not:</p>
    <ul>
      <li>cheat in assessments, share assessment answers, or have someone else complete work for you;</li>
      <li>copy, sell, publish or share course slides, videos or questions outside your own studies without our written permission;</li>
      <li>try to get into accounts or parts of the site you aren&apos;t allowed to use, interfere with the site, or upload anything harmful;</li>
      <li>pretend to be someone else, or create, alter or misrepresent certificates.</li>
    </ul>
  </> },
  { id: "content", title: "Course material", body: <>
    <p>Course material on this site belongs to Aspire or the people who licensed it to us. You may use it for your own learning. All other rights are reserved.</p>
  </> },
  { id: "suspension", title: "Suspension and closing accounts", body: <>
    <p>We may suspend or delete an account that breaks these terms, appears to duplicate another account, or puts other users or the site at risk. Where it is reasonable, we will tell you why.</p>
    <p>You can ask us to close your account at any time (see <Link href="/privacy#rights">your rights</Link>). Certificates already issued stay on record so employers can still check them, unless you ask us to withdraw them.</p>
  </> },
  { id: "liability", title: "Our responsibility to you", body: <>
    <p>We take care to keep courses accurate and the site available, but we can&apos;t promise it will always be free of errors or interruptions. To the extent the law allows, we aren&apos;t responsible for indirect losses, or for losses caused by events outside our reasonable control.</p>
    <p>Nothing in these terms limits any rights you have under Kenyan law, including the Consumer Protection Act, 2012, that can&apos;t legally be limited.</p>
  </> },
  { id: "changes", title: "Changes, law and contact", body: <>
    <p>We may update these terms. The date at the top shows the latest version. If a change is significant we will tell signed-in users before it takes effect.</p>
    <p>These terms are governed by the laws of Kenya, and the courts of Kenya deal with any dispute.</p>
    <p>Questions? <Contact />.</p>
  </> },
];

export default function Terms() {
  return <LegalPage title="Terms and Conditions" updated="20 October 2026" sections={sections}
    intro={<p>The rules for using Aspire&apos;s online training, certificates and company accounts, in plain language.</p>} />;
}
