import Link from "next/link";
import { CloudOff, HardHat, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <section>
        <span className="offline-mark"><HardHat /></span>
        <p className="section-kicker">BuildProof field mode</p>
        <h1>Your connection dropped. Your work does not have to.</h1>
        <p>Reopen a project you used on this device, or keep this page open. BuildProof will retry automatically when connectivity returns.</p>
        <div>
          <Link href="/workspace"><RefreshCw size={17} /> Retry workspace</Link>
          <Link href="/demo"><CloudOff size={17} /> Open product demo</Link>
        </div>
        <small>Queued field records remain on this device until they are securely synchronised.</small>
      </section>
    </main>
  );
}
