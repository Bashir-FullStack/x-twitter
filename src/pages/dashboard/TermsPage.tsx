import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-[600px] border-x border-border min-h-screen mx-auto lg:mx-0">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md h-[53px] flex items-center gap-6 px-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="hover:bg-muted rounded-full p-1.5"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-display text-xl font-bold">Terms of Service</h1>
      </div>
      <div className="p-6 space-y-6 text-[15px] leading-relaxed">
        <p className="text-muted-foreground">Last updated: March 2026</p>
        <section><h2 className="font-display font-bold text-lg mb-2">1. Acceptance of Terms</h2><p className="text-muted-foreground">By accessing and using Platform, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">2. User Accounts</h2><p className="text-muted-foreground">You must provide accurate information when creating an account. You are responsible for maintaining the security of your account and password. You must notify us immediately of any unauthorized use.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">3. Content Policy</h2><p className="text-muted-foreground">You retain ownership of content you post. By posting, you grant us a license to display and distribute your content on the platform. You may not post illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable content.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">4. Prohibited Conduct</h2><ul className="text-muted-foreground space-y-1 list-disc pl-5"><li>Impersonating others</li><li>Harassment or bullying</li><li>Spam or automated posting</li><li>Distributing malware</li><li>Violating intellectual property rights</li><li>Attempting to breach security</li></ul></section>
        <section><h2 className="font-display font-bold text-lg mb-2">5. Termination</h2><p className="text-muted-foreground">We reserve the right to suspend or terminate your account for violations of these terms. You may deactivate your account at any time through settings.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">6. Disclaimers</h2><p className="text-muted-foreground">The platform is provided "as is" without warranties. We are not liable for any damages arising from your use of the platform.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">7. Changes to Terms</h2><p className="text-muted-foreground">We may update these terms at any time. Continued use of the platform constitutes acceptance of the updated terms.</p></section>
        <section><h2 className="font-display font-bold text-lg mb-2">8. Contact</h2><p className="text-muted-foreground">For questions about these terms, contact us through the Help Center.</p></section>
      </div>
    </div>
  );
};

export default TermsPage;
